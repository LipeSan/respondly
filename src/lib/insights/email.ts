import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/sendEmail";
import { buildInsightReportEmail } from "@/lib/email/templates";
import { insightItemSchema, type InsightItem } from "@/lib/insights/schema";

const DAY_MS = 86_400_000;
const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function parseItems(value: unknown): InsightItem[] {
  const parsed = insightItemSchema.array().safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** The email for a ready report and who it goes to (the business owner). */
export async function buildInsightReportEmailFor(insightId: string, origin: string) {
  const insight = await prisma.reviewInsight.findUnique({
    where: { id: insightId },
    include: { business: { select: { id: true, name: true, user: { select: { email: true, name: true } } } } },
  });
  if (!insight) throw new Error("Report not found");
  if (insight.status !== "ready") throw new Error("Only ready reports can be emailed");

  const previous = await prisma.reviewInsight.findFirst({
    where: { businessId: insight.businessId, status: { in: ["ready", "insufficient_data"] }, periodEnd: { lt: insight.periodEnd } },
    orderBy: { periodEnd: "desc" },
    select: { avgRating: true },
  });

  // periodEnd is exclusive, so the report is "for" the day before it.
  const lastDay = new Date(insight.periodEnd.getTime() - DAY_MS);
  const content = buildInsightReportEmail({
    name: insight.business.user.name,
    businessName: insight.business.name,
    monthLabel: previous ? monthFormatter.format(lastDay) : null,
    periodLabel: `${dayFormatter.format(insight.periodStart)} to ${dayFormatter.format(lastDay)}`,
    avgRating: insight.avgRating,
    previousAvgRating: previous?.avgRating ?? null,
    reviewCount: insight.reviewCount,
    commentCount: insight.commentCount,
    strengths: parseItems(insight.strengths),
    improvements: parseItems(insight.improvements),
    reportUrl: `${origin}/insights/${insight.id}`,
  });

  return { to: insight.business.user.email, businessId: insight.businessId, content };
}

/**
 * Emails a ready report to the business owner and stamps `emailedAt`.
 * Sent by hand from /admin/insights for now.
 */
export async function sendInsightReportEmail(insightId: string, origin: string) {
  const { to, businessId, content } = await buildInsightReportEmailFor(insightId, origin);
  await sendEmail({ to, ...content });
  const emailedAt = new Date();
  await prisma.reviewInsight.update({ where: { id: insightId }, data: { emailedAt } });

  return { to, businessId, subject: content.subject, emailedAt };
}
