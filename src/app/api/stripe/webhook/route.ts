import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

type SubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
  latest_invoice?: string | Stripe.Invoice | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSubscriptionId(
  sub: string | Stripe.Subscription | null | undefined
): string | null {
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function getCurrentPeriodEndFromInvoiceOrSub(args: {
  sub: SubscriptionWithPeriodEnd;
  invoiceLines?: Stripe.Invoice["lines"];
}) {
  const firstLine = args.invoiceLines?.data?.[0];
  const endFromInvoice = firstLine?.period?.end;
  if (typeof endFromInvoice === "number") return new Date(endFromInvoice * 1000);

  if (typeof args.sub.current_period_end === "number") {
    return new Date(args.sub.current_period_end * 1000);
  }

  const li = args.sub.latest_invoice;
  const latestInvoiceId =
    typeof li === "string"
      ? li
      : li && typeof li === "object"
        ? li.id
        : null;

  if (!latestInvoiceId) return null;

  const inv = await stripe.invoices.retrieve(latestInvoiceId);
  const line0 = (inv as Stripe.Invoice).lines?.data?.[0];
  const end = line0?.period?.end;
  return typeof end === "number" ? new Date(end * 1000) : null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !whsec) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
    console.log("[stripe:webhook] type:", event.type);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe:webhook] Signature verification failed", { error: message });
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const starterId = process.env.STRIPE_PRICE_STARTER;
  const proId = process.env.STRIPE_PRICE_PRO;

  function derivePlanFromPrice(priceId?: string | null): "starter" | "pro" | undefined {
    if (!priceId) return undefined;
    if (starterId && priceId === starterId) return "starter";
    if (proId && priceId === proId) return "pro";
    return undefined;
  }

  async function findLatestUsableSubscriptionForCustomer(customerId: string) {
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    return (
      list.data.find((s) => s.status !== "canceled" && s.status !== "incomplete_expired") ??
      null
    );
  }

  async function upsertSubscription(opts: {
    businessId: string;
    plan?: "starter" | "pro";
    status: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    currentPeriodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: Date | null;
  }) {
    await prisma.subscription.upsert({
      where: { businessId: opts.businessId },
      create: {
        businessId: opts.businessId,
        plan: opts.plan ?? "starter",
        status: opts.status,
        cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
        cancelAt: opts.cancelAt ?? null,
        stripeCustomerId: opts.stripeCustomerId ?? null,
        stripeSubscriptionId: opts.stripeSubscriptionId ?? null,
        currentPeriodEnd: opts.currentPeriodEnd ?? null,
      },
      update: {
        plan: opts.plan ?? undefined,
        status: opts.status,
        cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? undefined,
        cancelAt: opts.cancelAt ?? undefined,
        stripeCustomerId: opts.stripeCustomerId ?? undefined,
        stripeSubscriptionId: opts.stripeSubscriptionId ?? undefined,
        currentPeriodEnd: opts.currentPeriodEnd ?? undefined,
      },
    });
  }

  // 1) Checkout completed (always save IDs; try to enrich with status and currentPeriodEnd)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const businessId = String(session.metadata?.businessId ?? "");
    if (!businessId) return NextResponse.json({ received: true });

    // 🔎 CRITICAL LOGS (to see what is coming in)
    console.log("[stripe:webhook] checkout.session.completed (event payload)", {
      sessionId: session.id,
      customer: session.customer,
      subscription: session.subscription,
      metadata: session.metadata,
    });

    // ✅ Fetch the full session from Stripe (this usually fixes subscription=null)
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["subscription"],
    });

    const customerId = full.customer ? String(full.customer) : null;

    // subscription can be a string OR an object (because we expanded it)
    let subscriptionId: string | null = null;
    let subObj: Stripe.Subscription | null = null;

    if (typeof full.subscription === "string") {
      subscriptionId = full.subscription;
    } else if (full.subscription && typeof full.subscription === "object") {
      subscriptionId = full.subscription.id;
      subObj = full.subscription as Stripe.Subscription;
    }

    console.log("[stripe:webhook] checkout.session.completed (full session)", {
      sessionId: full.id,
      customerId,
      subscriptionId,
    });

    // plan is always safe
    const plan: "starter" | "pro" = session.metadata?.plan === "pro" ? "pro" : "starter";

    // If we still don't have subscriptionId, fallback to listing subscriptions for the customer
    if (!subscriptionId && customerId) {
      const candidate = await findLatestUsableSubscriptionForCustomer(customerId);
      if (candidate) {
        subscriptionId = candidate.id;
        subObj = candidate;
      }
    }

    // If we still don't have subscriptionId, save customerId and keep status as incomplete
    if (!subscriptionId) {
      await prisma.subscription.upsert({
        where: { businessId },
        create: {
          businessId,
          plan,
          status: "incomplete",
          stripeCustomerId: customerId,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
        update: {
          plan,
          status: "incomplete",
          stripeCustomerId: customerId ?? undefined,
        },
      });

      console.warn("[stripe:webhook] subscriptionId still null after retrieve (leaving incomplete)");
      return NextResponse.json({ received: true });
    }

    // ✅ Now we ensure subscriptionId + periodEnd
    // If it wasn't expanded as an object, fetch the subscription
    const sub = subObj ?? (await stripe.subscriptions.retrieve(subscriptionId));
    const currentPeriodEnd = await getCurrentPeriodEndFromInvoiceOrSub({
      sub: sub as SubscriptionWithPeriodEnd,
    });
    const cancelAtPeriodEnd = Boolean((sub as SubscriptionWithPeriodEnd).cancel_at_period_end);
    const rawCancelAt = (sub as SubscriptionWithPeriodEnd).cancel_at;
    const cancelAt =
      cancelAtPeriodEnd && typeof rawCancelAt === "number" ? new Date(rawCancelAt * 1000) : null;

    // ✅ Update with the real status + IDs
    await prisma.subscription.upsert({
      where: { businessId },
      create: {
        businessId,
        plan,
        status: sub.status, // normalmente active/trialing
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
        stripeCustomerId: (customerId ?? String(sub.customer ?? "")) || undefined,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      },
    });

    console.log("[stripe:webhook] saved subscription from checkout.session.completed", {
      businessId,
      status: sub.status,
      stripeCustomerId: customerId ?? String(sub.customer ?? ""),
      stripeSubscriptionId: sub.id,
      currentPeriodEnd,
    });

    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = String(session.metadata?.businessId ?? "");
    if (!businessId) return NextResponse.json({ received: true });

    let subId = session.subscription ? String(session.subscription) : null;
    const customerId = session.customer ? String(session.customer) : null;

    if (!subId) {
      const full = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["subscription"],
      });
      if (typeof full.subscription === "string") {
        subId = full.subscription;
      } else if (full.subscription && typeof full.subscription === "object") {
        subId = full.subscription.id;
      }
    }

    if (!subId && customerId) {
      const candidate = await findLatestUsableSubscriptionForCustomer(customerId);
      subId = candidate?.id ?? null;
    }

    if (subId) {
      const s = await stripe.subscriptions.retrieve(subId);
      const currentPeriodEnd = await getCurrentPeriodEndFromInvoiceOrSub({
        sub: s as SubscriptionWithPeriodEnd,
      });
      const cancelAtPeriodEnd = Boolean((s as { cancel_at_period_end?: boolean }).cancel_at_period_end);
      const rawCancelAt = (s as { cancel_at?: number | null }).cancel_at;
      const cancelAt =
        cancelAtPeriodEnd && typeof rawCancelAt === "number" ? new Date(rawCancelAt * 1000) : null;

      const plan: "starter" | "pro" = session.metadata?.plan === "pro" ? "pro" : "starter";

      await prisma.subscription.upsert({
        where: { businessId },
        create: {
          businessId,
          plan,
          status: s.status,
          cancelAtPeriodEnd,
          cancelAt,
          stripeCustomerId: customerId ?? String(s.customer ?? ""),
          stripeSubscriptionId: subId,
          currentPeriodEnd,
        },
        update: {
          plan,
          status: s.status,
          cancelAtPeriodEnd,
          cancelAt,
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subId,
          currentPeriodEnd: currentPeriodEnd ?? undefined,
        },
      });
      console.log("[stripe:webhook] async_payment_succeeded updated subscription", {
        businessId,
        stripeSubscriptionId: subId,
        status: s.status,
        currentPeriodEnd,
      });
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = String(session.metadata?.businessId ?? "");
    if (!businessId) return NextResponse.json({ received: true });

    await prisma.subscription.update({
      where: { businessId },
      data: { status: "past_due" },
    });

    console.warn("[stripe:webhook] async_payment_failed marked subscription as past_due", {
      businessId,
    });

    return NextResponse.json({ received: true });
  }

  // 2) Invoice paid = definitive confirmation (best signal to unlock features)
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    type InvoiceWithSubscription = Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const inv = invoice as InvoiceWithSubscription;
    const subId = normalizeSubscriptionId(inv.subscription);
    if (!subId) return NextResponse.json({ received: true });

    const customerId = inv.customer ? String(inv.customer) : null;
    const sub = (await stripe.subscriptions.retrieve(subId)) as SubscriptionWithPeriodEnd;
    const currentPeriodEnd = await getCurrentPeriodEndFromInvoiceOrSub({
      sub,
      invoiceLines: inv.lines,
    });
    const cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
    const cancelAt =
      cancelAtPeriodEnd && typeof sub.cancel_at === "number" ? new Date(sub.cancel_at * 1000) : null;

    console.log("[stripe:webhook] invoice.paid -> currentPeriodEnd", currentPeriodEnd);

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: sub.status,
        cancelAtPeriodEnd,
        cancelAt,
        currentPeriodEnd,
        stripeSubscriptionId: sub.id,
      },
    });

    if (customerId) {
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          status: sub.status,
          cancelAtPeriodEnd,
          cancelAt,
          currentPeriodEnd,
          stripeSubscriptionId: sub.id,
        },
      });
    }

    return NextResponse.json({ received: true });
  }

  // 3) subscription created/updated/deleted (keep state in sync)
  if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as SubscriptionWithPeriodEnd;
    const customerId = String(sub.customer);
    const status = sub.status;

    const currentPeriodEnd = await getCurrentPeriodEndFromInvoiceOrSub({
      sub: sub as SubscriptionWithPeriodEnd,
    });
    const cancelAtPeriodEnd = Boolean((sub as SubscriptionWithPeriodEnd).cancel_at_period_end);
    const rawCancelAt = (sub as SubscriptionWithPeriodEnd).cancel_at;
    const cancelAt =
      cancelAtPeriodEnd && typeof rawCancelAt === "number" ? new Date(rawCancelAt * 1000) : null;

    // plan from price
    const priceId = sub.items?.data?.[0]?.price?.id ?? null;
    const plan = derivePlanFromPrice(priceId);

    // try update by customerId
    const updated = await prisma.subscription.updateMany({
      where: { stripeCustomerId: customerId },
      data: {
        status,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd,
        cancelAtPeriodEnd,
        cancelAt,
        ...(plan ? { plan } : {}),
      },
    });

    console.log("[stripe:webhook] sub.* updateMany", {
      type: event.type,
      customerId,
      count: updated.count,
      status,
      plan,
    });

    // fallback por customer metadata -> businessId
    if (updated.count === 0) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        const businessId = String((customer as Stripe.Customer).metadata?.businessId ?? "");
        if (businessId) {
          await upsertSubscription({
            businessId,
            plan,
            status,
            cancelAtPeriodEnd,
            cancelAt,
            stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd,
          });
          console.log("[stripe:webhook] sub.* upsert fallback by businessId", { businessId });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[stripe:webhook] fallback customer metadata failed", msg);
      }
    }

    return NextResponse.json({ received: true });
  }

  // outros eventos: ignorar
  return NextResponse.json({ received: true });
}
