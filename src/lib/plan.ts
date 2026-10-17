import { prisma } from "@/lib/db";

// Single source of truth for billing/subscription gating, shared by the
// cron route, the plan lookup below, and the auto-responder engine so all
// callers agree on when the paid automation is allowed to run.
export const blockedBillingStatuses = new Set([
  "payment_failed",
  "refunded",
  "needs_response",
  "warning_needs_response",
  "under_review",
  "warning_under_review",
  "lost",
]);

export function isActiveSubscriptionStatus(status: string | null | undefined) {
  if (!status) return false;
  return status === "active" || status === "trialing";
}

export async function getBusinessPlan(businessId: string) {
  const latest = await prisma.paymentHistory.findFirst({
    where: { businessId },
    orderBy: { createdAt: "desc" },
    select: { status: true, stripeEventType: true, createdAt: true },
  });

  if (latest && blockedBillingStatuses.has(latest.status)) return { plan: "free" as const };

  const sub = await prisma.subscription.findUnique({
    where: { businessId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });

  if (!sub || !isActiveSubscriptionStatus(sub.status)) return { plan: "free" as const };
  if (sub.plan === "pro") return { plan: "pro" as const };
  return { plan: "starter" as const };
}

export function canUseAI(plan: "free" | "starter" | "pro") {
  return plan === "pro";
}

/**
 * Authoritative gate for the auto-responder feature. Must be enforced
 * inside `autoRespondBusiness` itself (not just by callers like the cron
 * route) so any entry point respects billing state.
 */
export async function getAutoResponderGate(
  businessId: string
): Promise<{ allowed: true } | { allowed: false; reason: "billing_blocked" | "subscription_inactive" }> {
  const [subscription, latestBilling] = await Promise.all([
    prisma.subscription.findUnique({ where: { businessId }, select: { status: true } }),
    prisma.paymentHistory.findFirst({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      select: { status: true },
    }),
  ]);

  if (latestBilling && blockedBillingStatuses.has(latestBilling.status)) {
    return { allowed: false, reason: "billing_blocked" };
  }
  if (!isActiveSubscriptionStatus(subscription?.status)) {
    return { allowed: false, reason: "subscription_inactive" };
  }
  return { allowed: true };
}
