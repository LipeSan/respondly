import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getCurrentPeriodEndFromSubscription(
  sub: unknown
): Promise<Date | null> {
  const rawCpe = (sub as { current_period_end?: unknown } | null)?.current_period_end;
  if (typeof rawCpe === "number") return new Date(rawCpe * 1000);

  const latestInvoice = (sub as { latest_invoice?: unknown } | null)?.latest_invoice;
  const latestInvoiceId =
    typeof latestInvoice === "string"
      ? latestInvoice
      : latestInvoice && typeof latestInvoice === "object" && latestInvoice !== null && "id" in latestInvoice
        ? String((latestInvoice as { id?: unknown }).id ?? "")
        : null;

  if (!latestInvoiceId) return null;

  const invoice = await stripe.invoices.retrieve(latestInvoiceId);
  const firstLine = (invoice as { lines?: { data?: Array<{ period?: { end?: unknown } }> } }).lines?.data?.[0];
  const end = firstLine?.period?.end;
  if (typeof end === "number") return new Date(end * 1000);

  return null;
}

export async function GET(req: Request) {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) {
    console.warn("[billing:checkout] Not authenticated (sync)");
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const sessionId = String(url.searchParams.get("session_id") ?? "").trim();
  if (!sessionId) return NextResponse.json({ error: "session_id is required" }, { status: 400 });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });

    const metadataBusinessId = String(session.metadata?.businessId ?? "");
    if (!metadataBusinessId || metadataBusinessId !== business.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const plan: "starter" | "pro" =
      session.metadata?.plan === "pro" ? "pro" : "starter";

    const customerId = session.customer ? String(session.customer) : null;

    let subId: string | null = null;
    if (typeof session.subscription === "string") subId = session.subscription;
    else if (session.subscription && typeof session.subscription === "object") subId = session.subscription.id;

    if (!subId && customerId) {
      const list = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
      const candidate =
        list.data.find((s) => s.status !== "canceled" && s.status !== "incomplete_expired") ?? null;
      subId = candidate?.id ?? null;
    }

    if (!subId) {
      await prisma.subscription.upsert({
        where: { businessId: business.id },
        create: {
          businessId: business.id,
          plan,
          status: "incomplete",
          stripeCustomerId: customerId,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
        update: {
          plan,
          stripeCustomerId: customerId ?? undefined,
        },
      });
      return NextResponse.json({ ok: false, reason: "subscription_not_ready" });
    }

    const sub = await stripe.subscriptions.retrieve(subId);
    const currentPeriodEnd = await getCurrentPeriodEndFromSubscription(sub);
    const cancelAtPeriodEnd = Boolean((sub as { cancel_at_period_end?: boolean }).cancel_at_period_end);
    const rawCancelAt = (sub as { cancel_at?: number | null }).cancel_at;
    const cancelAt =
      cancelAtPeriodEnd && typeof rawCancelAt === "number" ? new Date(rawCancelAt * 1000) : null;

    await prisma.subscription.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        plan,
        status: sub.status,
        cancelAtPeriodEnd,
        cancelAt,
        stripeCustomerId: customerId ?? String(sub.customer ?? ""),
        stripeSubscriptionId: sub.id,
        currentPeriodEnd,
      },
      update: {
        plan,
        status: sub.status,
        cancelAtPeriodEnd,
        cancelAt,
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      },
    });

    console.log("[billing:checkout] Synced subscription from checkout session", {
      businessId: business.id,
      sessionId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      status: sub.status,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    });

    return NextResponse.json({
      ok: true,
      subscription: {
        plan,
        status: sub.status,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: currentPeriodEnd ? currentPeriodEnd.toISOString() : null,
        cancelAtPeriodEnd,
        cancelAt: cancelAt ? cancelAt.toISOString() : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing:checkout] Failed to sync from checkout session", {
      businessId: business.id,
      sessionId,
      error: msg,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { business, user } = await getCurrentUserAndBusiness();
    if (!business || !user) {
      console.warn("[billing:checkout] Not authenticated");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan === "pro" ? "pro" : body?.plan === "starter" ? "starter" : null;

    const priceId =
      plan === "starter"
        ? process.env.STRIPE_PRICE_STARTER
        : plan === "pro"
        ? process.env.STRIPE_PRICE_PRO
        : null;

    if (!plan || !priceId) {
      console.warn("[billing:checkout] Invalid plan", { businessId: business.id, plan, priceId });
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const existing = await prisma.subscription.findUnique({
      where: { businessId: business.id },
      select: { stripeCustomerId: true },
    });

    let customerId = existing?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? business.name,
        metadata: { businessId: business.id },
      });
      customerId = customer.id;
      console.log("[billing:checkout] Created Stripe customer", {
        businessId: business.id,
        customerId,
        plan,
      });
    } else {
      try {
        await stripe.customers.update(customerId, { metadata: { businessId: business.id } });
        console.log("[billing:checkout] Updated Stripe customer metadata", {
          businessId: business.id,
          customerId,
          plan,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[billing:checkout] Failed to update customer metadata", {
          businessId: business.id,
          customerId,
          error: msg,
        });
      }
    }

    await prisma.subscription.upsert({
      where: { businessId: business.id },
      create: {
        businessId: business.id,
        plan,
        status: "incomplete",
        trialUsedAt: null,
        trialEndsAt: null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      },
      update: {
        plan,
        status: "incomplete",
        stripeCustomerId: customerId,
      },
    });

    console.log("[billing:checkout] Upserted local subscription before checkout", {
      businessId: business.id,
      plan,
      customerId,
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

    const trialEligible = await prisma.subscription
      .findUnique({
        where: { businessId: business.id },
        select: { trialUsedAt: true },
      })
      .then((s) => !s?.trialUsedAt);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { businessId: business.id, plan },
        ...(trialEligible ? { trial_period_days: 30 } : {}),
      },
      success_url: `${appUrl}/configuration?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/configuration?billing=cancel`,
      allow_promotion_codes: true,
      metadata: { businessId: business.id, plan },
    });

    console.log("[billing:checkout] Created checkout session", {
      businessId: business.id,
      plan,
      sessionId: session.id,
      hasUrl: !!session.url,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[billing:checkout] Unexpected error", { error: msg });
    return NextResponse.json({ error: "Internal error while creating checkout session" }, { status: 500 });
  }
}
