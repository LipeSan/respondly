import { prisma } from "@/lib/db";
import { startJob, finishJobSuccess, finishJobFailed } from "@/lib/jobs";
import { JobType, Prisma } from "@prisma/client";
import { replyToGoogleReview } from "@/lib/reviews/providers/google";
import { canUseAI, getBusinessPlan } from "@/lib/plan";

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
    "Write the reply. Keep it short (max 600 characters).",
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}

async function generateAiReply(args: { system: string; user: string; maxLength: number }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const maxLength = clamp(args.maxLength || 600, 120, 600);
  const maxTokens = clamp(Math.floor(maxLength / 4), 80, 240);

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

  const text = String(data?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("AI returned empty response");

  return text.length > maxLength ? text.slice(0, maxLength).trim() : text;
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
      return {
        responded: 0,
        skipped: 0,
        totalPending: 0,
        reason: "disabled" as const,
      };
    }

    const rules = await prisma.reviewRule.findMany({
      where: { businessId, mode: { in: ["auto", "manual"] } },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { template: true },
    });

    // ✅ blocks historical reviews
    const where: Prisma.ReviewWhereInput = { businessId, status: "pending" };

    if (biz.connectedAt) {
      where.OR = [
        { createdAtGoogle: { gte: biz.connectedAt } },
        { createdAtGoogle: null }, // allows mocks
      ];
    }

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

        finalText = await generateAiReply({
          system: prompts.system,
          user: prompts.user,
          maxLength: merged.maxLength ?? 600,
        });
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
