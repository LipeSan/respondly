import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function recordTrialInviteRedemption(args: { businessId: string; inviteCode: string }) {
  const code = args.inviteCode.trim().toUpperCase();
  if (!code) return;

  const invite = await prisma.trialInvite.findUnique({
    where: { code },
    select: { id: true },
  });
  if (!invite) return;

  const now = new Date();
  await prisma.$transaction([
    prisma.trialInvite.update({
      where: { id: invite.id },
      data: { usedAt: now, usedByBusinessId: args.businessId },
    }),
    prisma.trialInviteRedemption.upsert({
      where: {
        inviteId_businessId: {
          inviteId: invite.id,
          businessId: args.businessId,
        },
      },
      update: {},
      create: {
        inviteId: invite.id,
        businessId: args.businessId,
      },
    }),
  ]);
}

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
    const existingSubscription = await prisma.subscription.findUnique({
      where: { businessId: business.id },
      select: {
        id: true,
      },
    });

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
      if (!existingSubscription) {
        await prisma.subscription.create({
          data: {
            businessId: business.id,
            plan,
            status: "incomplete",
            stripeCustomerId: customerId,
            stripeSubscriptionId: null,
            currentPeriodEnd: null,
          },
        });
      } else if (customerId) {
        await prisma.subscription.update({
          where: { businessId: business.id },
          data: {
            stripeCustomerId: customerId,
          },
        });
      }
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

    const inviteCode = String(session.metadata?.inviteCode ?? "").trim();
    if (inviteCode) {
      await recordTrialInviteRedemption({
        businessId: business.id,
        inviteCode,
      });
    }

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
    const inviteCodeRaw = typeof body?.inviteCode === "string" ? body.inviteCode : "";
    const inviteCode = inviteCodeRaw.trim().toUpperCase();

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
      select: {
        id: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
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

    async function cancelExistingCustomerSubscriptions(
      custId: string,
      ignoreIds: string[] = []
    ): Promise<Array<{ id: string; status: string }>> {
      if (!custId) return [];
      const canceledItems: Array<{ id: string; status: string }> = [];
      for (const status of ["active", "trialing"] as const) {
        const page = await stripe.subscriptions.list({
          customer: custId,
          status,
          limit: 20,
        });
        for (const s of page.data) {
          if (ignoreIds.includes(s.id)) continue;
          try {
            const opts: { prorate?: boolean; invoice_now?: boolean } =
              status === "active" ? { prorate: true, invoice_now: true } : {};
            const canceled = await stripe.subscriptions.cancel(s.id, opts);
            canceledItems.push({ id: s.id, status: canceled.status });
            console.log("[billing:checkout] canceled previous subscription before checkout", {
              customerId: custId,
              canceledId: s.id,
              canceledStatus: canceled.status,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error("[billing:checkout] failed to cancel previous subscription", {
              customerId: custId,
              subscriptionId: s.id,
              error: msg,
            });
          }
        }
      }
      return canceledItems;
    }

    if (!existing?.id) {
      await prisma.subscription.create({
        data: {
          businessId: business.id,
          plan,
          status: "incomplete",
          trialUsedAt: null,
          trialEndsAt: null,
          stripeCustomerId: customerId,
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
      });
    } else {
      const patches: { stripeCustomerId?: string } = {};
      if (customerId && customerId !== existing.stripeCustomerId) {
        patches.stripeCustomerId = customerId;
      }
      if (Object.keys(patches).length) {
        await prisma.subscription.update({
          where: { businessId: business.id },
          data: patches,
        });
      }
    }

    // ✅ Plan-change safety: cancel any previous active/trialing subscriptions
    // for this customer BEFORE creating the new checkout session. This works
    // synchronously and does not depend on Stripe webhook delivery (important
    // for local/dev environments without stripe listen / ngrok).
    const effectiveCustomerId = customerId ?? existing?.stripeCustomerId ?? null;
    const alreadyKnownToCancel = existing?.stripeSubscriptionId
      ? [existing.stripeSubscriptionId]
      : [];
    if (effectiveCustomerId) {
      await cancelExistingCustomerSubscriptions(effectiveCustomerId, alreadyKnownToCancel);
    }

    console.log("[billing:checkout] Prepared local subscription before checkout", {
      businessId: business.id,
      plan,
      customerId,
      existingSubscription: Boolean(existing?.id),
      effectiveCustomerId,
    });

    const appUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

    const subscriptionState = await prisma.subscription.findUnique({
      where: { businessId: business.id },
      select: {
        status: true,
        trialUsedAt: true,
        trialEndsAt: true,
        stripeSubscriptionId: true,
        currentPeriodEnd: true,
      },
    });

    let trialDays: number | null = null;
    let appliedInviteCode: string | null = null;
    const hasStartedPaidLifecycle = Boolean(
      subscriptionState?.trialUsedAt ||
      subscriptionState?.trialEndsAt ||
      subscriptionState?.stripeSubscriptionId ||
      subscriptionState?.currentPeriodEnd ||
      (subscriptionState?.status &&
        !["incomplete", "incomplete_expired"].includes(subscriptionState.status))
    );

    if (inviteCode) {
      const invite = await prisma.trialInvite.findUnique({
        where: { code: inviteCode },
        select: {
          id: true,
          days: true,
          email: true,
          usedByBusinessId: true,
          redemptions: {
            where: { businessId: business.id },
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!invite) {
        return NextResponse.json({ error: "Invite code not found" }, { status: 400 });
      }

      const emailOk = !invite.email || invite.email.toLowerCase() === user.email.toLowerCase();

      if (!emailOk) {
        return NextResponse.json({ error: "Invite code is not valid for this email" }, { status: 400 });
      }

      if (invite.redemptions.length > 0 || invite.usedByBusinessId === business.id) {
        return NextResponse.json(
          { error: "This business has already used this invite code" },
          { status: 400 }
        );
      }

      trialDays = invite.days;
      appliedInviteCode = inviteCode;
    } else if (!hasStartedPaidLifecycle) {
      trialDays = 30;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: {
          businessId: business.id,
          plan,
          ...(appliedInviteCode ? { inviteCode: appliedInviteCode } : {}),
        },
        ...(trialDays ? { trial_period_days: trialDays } : {}),
      },
      success_url: `${appUrl}/configuration?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/configuration?billing=cancel`,
      allow_promotion_codes: true,
      metadata: {
        businessId: business.id,
        plan,
        ...(appliedInviteCode ? { inviteCode: appliedInviteCode } : {}),
      },
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
