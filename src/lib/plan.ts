import { prisma } from "@/lib/db";

export async function getBusinessPlan(businessId: string) {
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
