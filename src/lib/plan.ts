import { prisma } from "@/lib/db";

export async function getBusinessPlan(businessId: string) {
  const latest = await prisma.paymentHistory.findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: { status: true, stripeEventType: true, createdAt: true },
  });

  const blockedStatuses = new Set([
    "payment_failed",
    "refunded",
    "needs_response",
    "warning_needs_response",
    "under_review",
    "warning_under_review",
    "lost",
  ]);
  if (latest && blockedStatuses.has(latest.status)) return { plan: "free" as const };

  const sub = await prisma.subscription.findUnique({
    where: { businessId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });

  if (!sub || (sub.status !== "active" && sub.status !== "trialing")) return { plan: "free" as const };
  if (sub.plan === "pro") return { plan: "pro" as const };
  return { plan: "starter" as const };
}

export function canUseAI(plan: "free" | "starter" | "pro") {
  return plan === "pro";
}
