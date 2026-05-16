import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    console.warn("[billing:cancel] Not authenticated");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const sub = await prisma.subscription.findUnique({
    where: { businessId: business.id },
    select: { stripeSubscriptionId: true, stripeCustomerId: true, status: true },
  });

  if (!sub) {
    console.warn("[billing:cancel] No active subscription to cancel", {
      businessId: business.id,
      status: null,
    });
    return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
  }

  try {
    let stripeSubscriptionId = sub.stripeSubscriptionId;
    if (!stripeSubscriptionId && sub.stripeCustomerId) {
      const list = await stripe.subscriptions.list({
        customer: sub.stripeCustomerId,
        status: "all",
        limit: 10,
      });
      const candidate = list.data.find(
        (s) => s.status !== "canceled" && s.status !== "incomplete_expired"
      );
      stripeSubscriptionId = candidate?.id ?? null;
    }

    if (!stripeSubscriptionId) {
      console.warn("[billing:cancel] Missing Stripe subscription id", {
        businessId: business.id,
        stripeCustomerId: sub.stripeCustomerId,
        status: sub.status,
      });
      return NextResponse.json({ error: "No active subscription to cancel" }, { status: 400 });
    }

    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    const rawCpe = (updated as { current_period_end?: number }).current_period_end;
    const currentPeriodEnd =
      typeof rawCpe === "number" ? new Date(rawCpe * 1000) : null;

    const rawCancelAt = (updated as { cancel_at?: number | null }).cancel_at;
    const cancelAt =
      typeof rawCancelAt === "number"
        ? new Date(rawCancelAt * 1000)
        : currentPeriodEnd;

    await prisma.subscription.update({
      where: { businessId: business.id },
      data: {
        status: updated.status,
        cancelAtPeriodEnd: true,
        cancelAt: cancelAt ?? undefined,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
        stripeSubscriptionId,
      },
    });

    console.log("[billing:cancel] Subscription marked to cancel at period end", {
      businessId: business.id,
      stripeSubscriptionId,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to cancel subscription";
    console.error("[billing:cancel] Error while canceling subscription", {
      businessId: business.id,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      error: msg,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
