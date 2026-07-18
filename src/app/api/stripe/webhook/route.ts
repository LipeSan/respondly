import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

type SubscriptionWithPeriodEnd = Stripe.Subscription & {
  current_period_end?: number;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean;
  latest_invoice?: string | Stripe.Invoice | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true });
}

function normalizeSubscriptionId(
  sub: string | Stripe.Subscription | null | undefined
): string | null {
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

function normalizeStripeId(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "id" in v) {
    const id = (v as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
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
    console.warn("[stripe:webhook] Missing signature or webhook secret", {
      hasSignature: Boolean(sig),
      hasWebhookSecret: Boolean(whsec),
    });
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whsec);
    console.log("[stripe:webhook] received", {
      id: event.id,
      type: event.type,
      created: event.created,
      livemode: event.livemode,
    });
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

  async function findBusinessIdFromStripeIds(args: { customerId?: string | null; subscriptionId?: string | null }) {
    const ors: Array<{ stripeCustomerId?: string; stripeSubscriptionId?: string }> = [];
    if (args.subscriptionId) ors.push({ stripeSubscriptionId: args.subscriptionId });
    if (args.customerId) ors.push({ stripeCustomerId: args.customerId });

    if (ors.length > 0) {
      const found = await prisma.subscription.findFirst({
        where: { OR: ors },
        select: { businessId: true },
      });
      if (found?.businessId) {
        console.log("[stripe:webhook] resolved businessId from local subscription", {
          businessId: found.businessId,
          customerId: args.customerId ?? null,
          subscriptionId: args.subscriptionId ?? null,
        });
        return found.businessId;
      }
    }

    if (args.customerId) {
      try {
        const customer = await stripe.customers.retrieve(args.customerId);
        const businessId = String((customer as Stripe.Customer).metadata?.businessId ?? "");
        if (businessId) {
          console.log("[stripe:webhook] resolved businessId from Stripe customer metadata", {
            businessId,
            customerId: args.customerId,
          });
          return businessId;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[stripe:webhook] findBusinessIdFromStripeIds failed", msg);
      }
    }

    console.warn("[stripe:webhook] could not resolve businessId", {
      customerId: args.customerId ?? null,
      subscriptionId: args.subscriptionId ?? null,
    });
    return null;
  }

  async function recordPaymentHistory(args: {
    businessId: string;
    stripeEventId: string;
    stripeEventType: string;
    status: string;
    stripeInvoiceId?: string | null;
    stripePaymentIntentId?: string | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    amount?: number | null;
    currency?: string | null;
    paidAt?: Date | null;
    hostedInvoiceUrl?: string | null;
    invoicePdf?: string | null;
    rawEvent?: unknown;
  }) {
    try {
      await prisma.paymentHistory.create({
        data: {
          businessId: args.businessId,
          stripeEventId: args.stripeEventId,
          stripeEventType: args.stripeEventType,
          stripeInvoiceId: args.stripeInvoiceId ?? null,
          stripePaymentIntentId: args.stripePaymentIntentId ?? null,
          stripeCustomerId: args.stripeCustomerId ?? null,
          stripeSubscriptionId: args.stripeSubscriptionId ?? null,
          amount: typeof args.amount === "number" ? args.amount : null,
          currency: args.currency ?? null,
          status: args.status,
          paidAt: args.paidAt ?? null,
          hostedInvoiceUrl: args.hostedInvoiceUrl ?? null,
          invoicePdf: args.invoicePdf ?? null,
          rawEvent: args.rawEvent ? (args.rawEvent as Prisma.InputJsonValue) : undefined,
        },
      });
      console.log("[stripe:webhook] payment history recorded", {
        businessId: args.businessId,
        stripeEventId: args.stripeEventId,
        stripeEventType: args.stripeEventType,
        status: args.status,
        stripeInvoiceId: args.stripeInvoiceId ?? null,
        stripeSubscriptionId: args.stripeSubscriptionId ?? null,
        amount: typeof args.amount === "number" ? args.amount : null,
        currency: args.currency ?? null,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        console.log("[stripe:webhook] payment history deduped", {
          businessId: args.businessId,
          stripeEventId: args.stripeEventId,
          stripeEventType: args.stripeEventType,
        });
        return;
      }
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[stripe:webhook] recordPaymentHistory failed", {
        businessId: args.businessId,
        stripeEventId: args.stripeEventId,
        stripeEventType: args.stripeEventType,
        error: msg,
      });
    }
  }

  async function updatePaidInvoiceStatus(args: { stripeInvoiceId: string; status: string }) {
    const updated = await prisma.paymentHistory.updateMany({
      where: {
        stripeInvoiceId: args.stripeInvoiceId,
        stripeEventType: { in: ["invoice.paid", "invoice.payment_succeeded"] },
      },
      data: { status: args.status },
    });
    if (updated.count > 0) {
      console.log("[stripe:webhook] updated paid invoice status", {
        stripeInvoiceId: args.stripeInvoiceId,
        status: args.status,
        count: updated.count,
      });
    }
  }

  async function consumeTrialInvite(args: { businessId: string; inviteCode: string }) {
    const code = args.inviteCode.trim();
    if (!code) return;
    const now = new Date();
    try {
      const updated = await prisma.trialInvite.updateMany({
        where: {
          code,
          usedAt: null,
          OR: [{ reservedByBusinessId: null }, { reservedByBusinessId: args.businessId }],
        },
        data: { usedAt: now, usedByBusinessId: args.businessId },
      });
      if (updated.count > 0) {
        console.log("[stripe:webhook] trial invite consumed", { businessId: args.businessId, code });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[stripe:webhook] consumeTrialInvite failed", { businessId: args.businessId, code, error: msg });
    }
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

    const customerId = normalizeStripeId(full.customer);

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

    const subCustomerId = normalizeStripeId((sub as { customer?: unknown }).customer);
    const trialEndSec = (sub as unknown as { trial_end?: unknown }).trial_end ?? null;
    const trialEndsAt = typeof trialEndSec === "number" ? new Date(trialEndSec * 1000) : null;

    // ✅ Update with the real status + IDs
    await prisma.subscription.upsert({
      where: { businessId },
      create: {
        businessId,
        plan,
        status: sub.status, // normalmente active/trialing
        cancelAtPeriodEnd,
        cancelAt,
        trialUsedAt: sub.status === "trialing" && trialEndsAt ? new Date() : null,
        trialEndsAt: trialEndsAt ?? null,
        stripeCustomerId: customerId ?? subCustomerId,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd,
      },
      update: {
        plan,
        status: sub.status,
        cancelAtPeriodEnd,
        cancelAt,
        ...(sub.status === "trialing" && trialEndsAt ? { trialEndsAt } : {}),
        stripeCustomerId: (customerId ?? subCustomerId) || undefined,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      },
    });

    if (sub.status === "trialing" && trialEndsAt) {
      await prisma.subscription.updateMany({
        where: { businessId, trialUsedAt: null },
        data: { trialUsedAt: new Date(), trialEndsAt },
      });
    }

    console.log("[stripe:webhook] saved subscription from checkout.session.completed", {
      businessId,
      status: sub.status,
      stripeCustomerId: customerId ?? subCustomerId,
      stripeSubscriptionId: sub.id,
      currentPeriodEnd,
    });

    const inviteCode = String(session.metadata?.inviteCode ?? full.metadata?.inviteCode ?? "").trim();
    if (inviteCode) {
      await consumeTrialInvite({ businessId, inviteCode });
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const businessId = String(session.metadata?.businessId ?? "");
    if (!businessId) return NextResponse.json({ received: true });

    let subId = session.subscription ? String(session.subscription) : null;
    const customerId = normalizeStripeId(session.customer);

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
      const trialEndSec = (s as unknown as { trial_end?: unknown }).trial_end ?? null;
      const trialEndsAt = typeof trialEndSec === "number" ? new Date(trialEndSec * 1000) : null;

      const plan: "starter" | "pro" = session.metadata?.plan === "pro" ? "pro" : "starter";

      await prisma.subscription.upsert({
        where: { businessId },
        create: {
          businessId,
          plan,
          status: s.status,
          cancelAtPeriodEnd,
          cancelAt,
          trialUsedAt: s.status === "trialing" && trialEndsAt ? new Date() : null,
          trialEndsAt: trialEndsAt ?? null,
          stripeCustomerId: customerId ?? normalizeStripeId((s as { customer?: unknown }).customer),
          stripeSubscriptionId: subId,
          currentPeriodEnd,
        },
        update: {
          plan,
          status: s.status,
          cancelAtPeriodEnd,
          cancelAt,
          ...(s.status === "trialing" && trialEndsAt ? { trialEndsAt } : {}),
          stripeCustomerId: customerId ?? undefined,
          stripeSubscriptionId: subId,
          currentPeriodEnd: currentPeriodEnd ?? undefined,
        },
      });

      if (s.status === "trialing" && trialEndsAt) {
        await prisma.subscription.updateMany({
          where: { businessId, trialUsedAt: null },
          data: { trialUsedAt: new Date(), trialEndsAt },
        });
      }
      console.log("[stripe:webhook] async_payment_succeeded updated subscription", {
        businessId,
        stripeSubscriptionId: subId,
        status: s.status,
        currentPeriodEnd,
      });
    }

    const inviteCode = String(session.metadata?.inviteCode ?? "").trim();
    if (inviteCode) {
      await consumeTrialInvite({ businessId, inviteCode });
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
  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    type InvoiceWithSubscription = Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const inv = invoice as InvoiceWithSubscription;
    const subId = normalizeSubscriptionId(inv.subscription);
    if (!subId) {
      console.warn("[stripe:webhook] invoice.paid missing subscription id", {
        invoiceId: invoice.id,
        customerId: normalizeStripeId((invoice as { customer?: unknown }).customer),
      });
      return NextResponse.json({ received: true });
    }

    const customerId = normalizeStripeId(inv.customer);
    const sub = (await stripe.subscriptions.retrieve(subId)) as SubscriptionWithPeriodEnd;
    const businessIdFromSubMetadata =
      typeof (sub as unknown as { metadata?: Record<string, unknown> }).metadata?.businessId === "string"
        ? String((sub as unknown as { metadata?: Record<string, unknown> }).metadata?.businessId ?? "").trim()
        : "";
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

    const dbBusinessId = await findBusinessIdFromStripeIds({ customerId, subscriptionId: sub.id });
    const resolvedBusinessId = dbBusinessId || businessIdFromSubMetadata || null;

    if (!dbBusinessId && businessIdFromSubMetadata) {
      const priceId = sub.items?.data?.[0]?.price?.id ?? null;
      const plan = derivePlanFromPrice(priceId);
      await upsertSubscription({
        businessId: businessIdFromSubMetadata,
        plan,
        status: sub.status,
        cancelAtPeriodEnd,
        cancelAt,
        stripeCustomerId: customerId ?? undefined,
        stripeSubscriptionId: sub.id,
        currentPeriodEnd: currentPeriodEnd ?? undefined,
      });
    }

    const businessId = resolvedBusinessId;
    if (businessId) {
      const invoiceAny = invoice as unknown as {
        payment_intent?: unknown;
        hosted_invoice_url?: unknown;
        invoice_pdf?: unknown;
        status_transitions?: { paid_at?: unknown } | null;
      };
      const paidAtSec = invoiceAny.status_transitions?.paid_at ?? null;
      const paidAt = typeof paidAtSec === "number" ? new Date(paidAtSec * 1000) : null;
      console.log("[stripe:webhook] invoice.paid identifiers", {
        invoiceId: invoice.id,
        customerId,
        subscriptionId: sub.id,
        status: invoice.status ?? null,
        amountPaid: typeof invoice.amount_paid === "number" ? invoice.amount_paid : null,
        currency: invoice.currency ?? null,
        hasHostedInvoiceUrl: typeof invoiceAny.hosted_invoice_url === "string",
        hasInvoicePdf: typeof invoiceAny.invoice_pdf === "string",
        paymentIntentId: invoiceAny.payment_intent ? String(invoiceAny.payment_intent) : null,
      });
      await recordPaymentHistory({
        businessId,
        stripeEventId: event.id,
        stripeEventType: event.type,
        status: invoice.status === "paid" ? "paid" : String(invoice.status ?? "paid"),
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoiceAny.payment_intent ? String(invoiceAny.payment_intent) : null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        amount: typeof invoice.amount_paid === "number" ? invoice.amount_paid : null,
        currency: invoice.currency ?? null,
        paidAt,
        hostedInvoiceUrl: typeof invoiceAny.hosted_invoice_url === "string" ? invoiceAny.hosted_invoice_url : null,
        invoicePdf: typeof invoiceAny.invoice_pdf === "string" ? invoiceAny.invoice_pdf : null,
        rawEvent: event,
      });
    } else {
      console.warn("[stripe:webhook] invoice.paid: businessId not found", {
        customerId,
        subscriptionId: sub.id,
        invoiceId: invoice.id,
      });
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = normalizeStripeId(invoice.customer);
    const invoiceAny = invoice as unknown as {
      subscription?: unknown;
      payment_intent?: unknown;
      hosted_invoice_url?: unknown;
      invoice_pdf?: unknown;
    };
    const subId = normalizeStripeId(invoiceAny.subscription);
    const businessId = await findBusinessIdFromStripeIds({ customerId, subscriptionId: subId });

    if (businessId) {
      console.log("[stripe:webhook] invoice.payment_failed identifiers", {
        invoiceId: invoice.id,
        customerId,
        subscriptionId: subId,
        amountDue: typeof invoice.amount_due === "number" ? invoice.amount_due : null,
        currency: invoice.currency ?? null,
        paymentIntentId: invoiceAny.payment_intent ? String(invoiceAny.payment_intent) : null,
      });
      await recordPaymentHistory({
        businessId,
        stripeEventId: event.id,
        stripeEventType: event.type,
        status: "payment_failed",
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoiceAny.payment_intent ? String(invoiceAny.payment_intent) : null,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
        amount: typeof invoice.amount_due === "number" ? invoice.amount_due : null,
        currency: invoice.currency ?? null,
        hostedInvoiceUrl: typeof invoiceAny.hosted_invoice_url === "string" ? invoiceAny.hosted_invoice_url : null,
        invoicePdf: typeof invoiceAny.invoice_pdf === "string" ? invoiceAny.invoice_pdf : null,
        rawEvent: event,
      });

      await prisma.subscription.updateMany({
        where: {
          OR: [
            { businessId },
            ...(customerId ? [{ stripeCustomerId: customerId }] : []),
            ...(subId ? [{ stripeSubscriptionId: subId }] : []),
          ],
        },
        data: { status: "past_due" },
      });
    } else {
      console.warn("[stripe:webhook] invoice.payment_failed: businessId not found", {
        customerId,
        subscriptionId: subId,
        invoiceId: invoice.id,
      });
    }

    return NextResponse.json({ received: true });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const customerId = normalizeStripeId(charge.customer);
    const chargeAny = charge as unknown as { invoice?: unknown; payment_intent?: unknown };
    const invoiceId = chargeAny.invoice ? String(chargeAny.invoice) : null;
    const paymentIntentId = chargeAny.payment_intent ? String(chargeAny.payment_intent) : null;

    const businessId = await findBusinessIdFromStripeIds({ customerId, subscriptionId: null });
    if (businessId) {
      const createdAt = typeof charge.created === "number" ? new Date(charge.created * 1000) : null;
      console.log("[stripe:webhook] charge.refunded identifiers", {
        chargeId: charge.id,
        customerId,
        invoiceId,
        paymentIntentId,
        amountRefunded: typeof charge.amount_refunded === "number" ? charge.amount_refunded : null,
        currency: charge.currency ?? null,
      });
      await recordPaymentHistory({
        businessId,
        stripeEventId: event.id,
        stripeEventType: event.type,
        status: "refunded",
        stripeInvoiceId: invoiceId,
        stripePaymentIntentId: paymentIntentId,
        stripeCustomerId: customerId,
        amount: typeof charge.amount_refunded === "number" ? -Math.abs(charge.amount_refunded) : null,
        currency: charge.currency ?? null,
        paidAt: createdAt,
        rawEvent: event,
      });
      if (invoiceId) {
        await updatePaidInvoiceStatus({ stripeInvoiceId: invoiceId, status: "refunded" });
      }
    }

    return NextResponse.json({ received: true });
  }

  if (
    event.type === "charge.dispute.created" ||
    event.type === "charge.dispute.updated" ||
    event.type === "charge.dispute.funds_withdrawn" ||
    event.type === "charge.dispute.funds_reinstated" ||
    event.type === "charge.dispute.closed"
  ) {
    const dispute = event.data.object as Stripe.Dispute;
    const chargeId = typeof dispute.charge === "string" ? dispute.charge : null;

    let charge: Stripe.Charge | null = null;
    if (chargeId) {
      try {
        charge = (await stripe.charges.retrieve(chargeId)) as Stripe.Charge;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[stripe:webhook] charge.dispute.* failed to retrieve charge", { chargeId, error: msg });
      }
    }

    const customerId = normalizeStripeId((charge as unknown as { customer?: unknown })?.customer);
    const invoiceIdRaw = (charge as unknown as { invoice?: unknown })?.invoice ?? null;
    const invoiceId = invoiceIdRaw ? String(invoiceIdRaw) : null;

    const businessId = await findBusinessIdFromStripeIds({ customerId, subscriptionId: null });
    if (businessId) {
      const disputeAmount = typeof dispute.amount === "number" ? dispute.amount : null;
      const disputeCurrency = dispute.currency ?? null;
      const disputeStatus = dispute.status ?? null;
      console.log("[stripe:webhook] charge.dispute.* identifiers", {
        type: event.type,
        disputeId: dispute.id,
        chargeId,
        customerId,
        invoiceId,
        status: disputeStatus,
        amount: disputeAmount,
        currency: disputeCurrency,
      });

      await recordPaymentHistory({
        businessId,
        stripeEventId: event.id,
        stripeEventType: event.type,
        status: disputeStatus ? String(disputeStatus) : "dispute",
        stripeInvoiceId: invoiceId,
        stripePaymentIntentId: dispute.payment_intent ? String(dispute.payment_intent) : null,
        stripeCustomerId: customerId,
        amount: disputeAmount,
        currency: disputeCurrency ? String(disputeCurrency) : null,
        rawEvent: event,
      });

      if (invoiceId) {
        await updatePaidInvoiceStatus({
          stripeInvoiceId: invoiceId,
          status: disputeStatus ? String(disputeStatus) : "dispute",
        });
      }

      const blockedDisputeStatuses = new Set([
        "needs_response",
        "warning_needs_response",
        "under_review",
        "warning_under_review",
        "lost",
      ]);
      const isBlocked = disputeStatus ? blockedDisputeStatuses.has(String(disputeStatus)) : false;

      if (isBlocked) {
        let subscriptionId: string | null = null;
        if (invoiceId) {
          try {
            const inv = (await stripe.invoices.retrieve(invoiceId)) as Stripe.Invoice;
            const invAny = inv as unknown as { subscription?: unknown };
            subscriptionId = normalizeStripeId(invAny.subscription);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[stripe:webhook] charge.dispute.* failed to retrieve invoice", { invoiceId, error: msg });
          }
        }

        await prisma.subscription.updateMany({
          where: {
            OR: [
              { businessId },
              ...(customerId ? [{ stripeCustomerId: customerId }] : []),
              ...(subscriptionId ? [{ stripeSubscriptionId: subscriptionId }] : []),
            ],
          },
          data: { status: "past_due" },
        });
      }
    } else {
      console.warn("[stripe:webhook] charge.dispute.*: businessId not found", {
        type: event.type,
        chargeId,
        customerId,
        invoiceId,
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
    const trialEndSec = (sub as unknown as { trial_end?: unknown }).trial_end ?? null;
    const trialEndsAt = typeof trialEndSec === "number" ? new Date(trialEndSec * 1000) : null;

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
        ...(status === "trialing" && trialEndsAt ? { trialEndsAt } : {}),
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

    if (status === "trialing" && trialEndsAt) {
      await prisma.subscription.updateMany({
        where: { stripeCustomerId: customerId, trialUsedAt: null },
        data: { trialUsedAt: new Date(), trialEndsAt },
      });
    }

    const inviteCode = String((sub as unknown as { metadata?: Record<string, unknown> }).metadata?.inviteCode ?? "").trim();
    if (inviteCode) {
      const businessId = await findBusinessIdFromStripeIds({ customerId, subscriptionId: sub.id });
      if (businessId) {
        await consumeTrialInvite({ businessId, inviteCode });
      }
    }

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
