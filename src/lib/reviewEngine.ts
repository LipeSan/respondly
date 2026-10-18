import { prisma } from "@/lib/db";
import { startJob, finishJobSuccess, finishJobFailed } from "@/lib/jobs";
import { JobType, Prisma } from "@prisma/client";
import { replyToGoogleReview } from "@/lib/reviews/providers/google";
import { canUseAI, getAutoResponderGate, getBusinessPlan } from "@/lib/plan";
import { automatedReviewsWhere } from "@/lib/reviews/automationWindow";

function applyVariables(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

type StoredAiSettings = {
  systemPrompt?: string;
  tone?: string;
  maxLength?: number;
};

function normalizeAiSettings(v: unknown): StoredAiSettings {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  return {
    systemPrompt: typeof o.systemPrompt === "string" ? o.systemPrompt : undefined,
    tone: typeof o.tone === "string" ? o.tone : undefined,
    maxLength: typeof o.maxLength === "number" ? o.maxLength : undefined,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function buildAiPrompt(args: {
  businessName: string;
  businessPhone: string | null;
  businessEmail: string | null;
  rating: number;
  authorName: string | null;
  comment: string | null;
  settings: StoredAiSettings;
}) {
  const tone = args.settings.tone ?? "polite";
  const baseSystem =
    args.settings.systemPrompt ??
    `You are a customer support assistant that writes replies to Google reviews.

Rules:
- Be polite and professional.
- Never argue with the customer.
- Never admit legal fault.
- Do not offer refunds unless explicitly configured.
- Reply in the same language as the review.
- If rating is 1-3 stars, apologize and invite the customer to contact the business.
- If rating is 4-5 stars, thank the customer warmly.`;

  const customer = args.authorName ?? "customer";
  const comment = args.comment?.trim() ? args.comment.trim() : "(no comment)";

  const system = `${baseSystem}\n\nTone: ${tone}\n`;
  const user = [
    `Business: ${args.businessName}`,
    args.businessPhone ? `Phone: ${args.businessPhone}` : null,
    args.businessEmail ? `Email: ${args.businessEmail}` : null,
    `Rating: ${args.rating} stars`,
    `Author: ${customer}`,
    `Review: ${comment}`,
    "",
    `Write only the reply text, ready to post. Keep it under ${clamp(args.settings.maxLength || 600, 120, 600)} characters.`,
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

/** Trims to maxLength at a sentence boundary when one exists, so a reply is never posted mid-sentence. */
function trimToLength(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const slice = text.slice(0, maxLength);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("! "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("\n")
  );
  return (lastSentenceEnd > maxLength * 0.5 ? slice.slice(0, lastSentenceEnd + 1) : slice).trim();
}

async function generateAiReply(args: { system: string; user: string; maxLength: number }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxLength = clamp(args.maxLength || 600, 120, 600);
  // ~4 chars per token, doubled for headroom: the token cap is only a safety
  // net. The prompt asks for the length, so the model finishes its sentence.
  const maxTokens = clamp(Math.ceil(maxLength / 2), 120, 400);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || "AI request failed";
    throw new Error(String(msg));
  }

  const choice = data?.choices?.[0];
  const text = String(choice?.message?.content ?? "").trim();
  if (!text) throw new Error("AI returned empty response");
  // Hitting the token cap means the reply stopped mid-sentence; never post that.
  if (choice?.finish_reason === "length") throw new Error("AI reply was cut off before finishing");

  return trimToLength(text, maxLength);
}

export async function autoRespondBusiness(businessId: string) {
  const job = await startJob(businessId, JobType.auto_responder);

  try {
    const plan = await getBusinessPlan(businessId);
    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        autoResponderEnabled: true,
        name: true,
        phone: true,
        email: true,
        connectedAt: true, // ✅ important
        aiSettings: true,
      },
    });

    if (!biz?.autoResponderEnabled) {
      await finishJobSuccess(job.id, {});
      return {
        responded: 0,
        skipped: 0,
        totalPending: 0,
        reason: "disabled" as const,
      };
    }

    // Enforced here (not just by callers like the cron route) so any entry
    // point into the engine — including manual/debug triggers — respects
    // billing state instead of running the paid automation for free.
    const gate = await getAutoResponderGate(businessId);
    if (!gate.allowed) {
      await finishJobSuccess(job.id, {});
      return {
        responded: 0,
        skipped: 0,
        totalPending: 0,
        reason: gate.reason,
      };
    }

    const rules = await prisma.reviewRule.findMany({
      where: { businessId, mode: { in: ["auto", "manual"] } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { template: true },
    });

    // ✅ blocks historical reviews
    const where: Prisma.ReviewWhereInput = {
      businessId,
      status: "pending",
      ...automatedReviewsWhere(biz.connectedAt),
    };

    const pendingReviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { response: true },
    });

    let responded = 0;
    let skipped = 0;
    let drafted = 0;

    for (const review of pendingReviews) {
      // ✅ if it already has a response (extra safety)
      if (review.response) {
        continue;
      }

      const rule = rules.find((r) => {
        const minOk = r.minStars == null ? true : review.rating >= r.minStars;
        const maxOk = r.maxStars == null ? true : review.rating <= r.maxStars;
        return minOk && maxOk;
      });

      if (!rule) {
        skipped++;
        continue;
      }

      let method: "template" | "ai" = "template";
      let generatedText = "";
      let finalText = "";

      if (rule.responseType === "template") {
        if (!rule.template?.body) {
          await prisma.review.update({
            where: { id: review.id },
            data: {
              status: "skipped",
              lastError: "Rule has no valid template",
            },
          });
          skipped++;
          continue;
        }

        method = "template";
        finalText = applyVariables(rule.template.body, {
          customer_name: review.authorName ?? "",
          business_name: biz.name ?? "",
          phone: biz.phone ?? "",
          email: biz.email ?? "",
        });
        generatedText = finalText;
      } else if (rule.responseType === "ai") {
        if (!canUseAI(plan.plan)) {
          await prisma.review.update({
            where: { id: review.id },
            data: {
              status: "skipped",
              lastError: "AI not available on current plan",
            },
          });
          skipped++;
          continue;
        }

        method = "ai";
        const base = normalizeAiSettings(biz.aiSettings);
        const override = normalizeAiSettings(rule.aiSettings);
        const merged: StoredAiSettings = {
          systemPrompt: override.systemPrompt ?? base.systemPrompt,
          tone: override.tone ?? base.tone,
          maxLength: override.maxLength ?? base.maxLength,
        };

        const prompts = buildAiPrompt({
          businessName: biz.name ?? "",
          businessPhone: biz.phone ?? null,
          businessEmail: biz.email ?? null,
          rating: review.rating,
          authorName: review.authorName ?? null,
          comment: review.comment ?? null,
          settings: merged,
        });

        try {
          finalText = await generateAiReply({
            system: prompts.system,
            user: prompts.user,
            maxLength: merged.maxLength ?? 600,
          });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          await prisma.review.update({
            where: { id: review.id },
            data: { status: "failed", lastError: `AI reply failed: ${msg}` },
          });
          console.error("[auto-responder] AI generation failed", { businessId, reviewId: review.id, error: msg });
          continue;
        }
        generatedText = finalText;
      } else {
        await prisma.review.update({
          where: { id: review.id },
          data: {
            status: "skipped",
            lastError: "Unsupported response type",
          },
        });
        skipped++;
        continue;
      }

      try {
        const isManualDraft = rule.mode === "manual";

        if (isManualDraft) {
          await prisma.$transaction([
            prisma.reviewResponse.create({
              data: {
                reviewId: review.id,
                ruleId: rule.id,
                method,
                generated: generatedText,
                finalText,
                sentAt: null,
              },
            }),
            prisma.review.update({
              where: { id: review.id },
              data: {
                lastError: null,
              },
            }),
          ]);

          drafted++;
          continue;
        }

        if (review.source === "google") {
          if (!review.externalId) {
            await prisma.review.update({
              where: { id: review.id },
              data: {
                status: "failed",
                lastError: "Missing Google review id",
              },
            });
            continue;
          }

          await prisma.reviewResponse.create({
            data: {
              reviewId: review.id,
              ruleId: rule.id,
              method,
              generated: generatedText,
              finalText,
              sentAt: null,
            },
          });

          console.log("[auto-responder] replying to Google review", {
            businessId,
            reviewId: review.id,
            googleReviewName: review.externalId,
          });

          await replyToGoogleReview(businessId, review.externalId, finalText);

          await prisma.$transaction([
            prisma.reviewResponse.update({
              where: { reviewId: review.id },
              data: { sentAt: new Date() },
            }),
            prisma.review.update({
              where: { id: review.id },
              data: {
                status: "responded",
                lastError: null,
              },
            }),
          ]);

          responded++;
        } else {
          await prisma.$transaction([
            prisma.reviewResponse.create({
              data: {
                reviewId: review.id,
                ruleId: rule.id,
                method,
                generated: generatedText,
                finalText,
                sentAt: new Date(),
              },
            }),
            prisma.review.update({
              where: { id: review.id },
              data: {
                status: "responded",
                lastError: null,
              },
            }),
          ]);

          responded++;
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        await prisma.review.update({
          where: { id: review.id },
          data: {
            status: "failed",
            lastError: msg,
          },
        });
        console.error("[auto-responder] failed to reply", {
          businessId,
          reviewId: review.id,
          source: review.source,
          error: msg,
        });
      }
    }

    const result = {
      responded,
      skipped,
      drafted,
      totalPending: pendingReviews.length,
    };
    await finishJobSuccess(job.id, {
      processed: pendingReviews.length,
      responded,
      skipped,
    });

    return result;

  } catch (e: unknown) {

    await finishJobFailed(job.id, e instanceof Error ? e.message : "Unknown error");

    throw e;
  }
}
