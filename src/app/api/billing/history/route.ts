import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { user, business } = await getCurrentUserAndBusiness();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!business) {
    return NextResponse.json(
      { error: "Please complete onboarding first.", code: "NO_BUSINESS" },
      { status: 400 },
    );
  }

  const url = new URL(req.url);
  const takeRaw = Number(url.searchParams.get("take") ?? 20);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 50) : 20;
  const eventType = url.searchParams.get("eventType")?.trim() || null;

  const items = await prisma.paymentHistory.findMany({
    where: {
      businessId: business.id,
      ...(eventType ? { stripeEventType: eventType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      createdAt: true,
      stripeEventType: true,
      stripeInvoiceId: true,
      stripePaymentIntentId: true,
      hostedInvoiceUrl: true,
      invoicePdf: true,
    },
  });

  const paymentIntentIds = Array.from(
    new Set(items.map((i) => i.stripePaymentIntentId).filter((v): v is string => typeof v === "string" && v.length > 0)),
  );
  const invoiceIds = Array.from(
    new Set(items.map((i) => i.stripeInvoiceId).filter((v): v is string => typeof v === "string" && v.length > 0)),
  );

  const related =
    paymentIntentIds.length > 0 || invoiceIds.length > 0
      ? await prisma.paymentHistory.findMany({
          where: {
            businessId: business.id,
            OR: [
              ...(paymentIntentIds.length > 0 ? [{ stripePaymentIntentId: { in: paymentIntentIds } }] : []),
              ...(invoiceIds.length > 0 ? [{ stripeInvoiceId: { in: invoiceIds } }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          select: {
            stripePaymentIntentId: true,
            stripeInvoiceId: true,
            stripeEventType: true,
            status: true,
            createdAt: true,
          },
        })
      : [];

  const latestByKey = new Map<
    string,
    { status: string; stripeEventType: string; createdAt: Date }
  >();
  for (const r of related) {
    const key =
      (typeof r.stripePaymentIntentId === "string" && r.stripePaymentIntentId.length > 0)
        ? `pi:${r.stripePaymentIntentId}`
        : (typeof r.stripeInvoiceId === "string" && r.stripeInvoiceId.length > 0)
          ? `in:${r.stripeInvoiceId}`
          : null;
    if (!key) continue;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, { status: r.status, stripeEventType: r.stripeEventType, createdAt: r.createdAt });
    }
  }

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      paidAt: i.paidAt ? i.paidAt.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
      lastEvent:
        (() => {
          const key =
            (typeof i.stripePaymentIntentId === "string" && i.stripePaymentIntentId.length > 0)
              ? `pi:${i.stripePaymentIntentId}`
              : (typeof i.stripeInvoiceId === "string" && i.stripeInvoiceId.length > 0)
                ? `in:${i.stripeInvoiceId}`
                : null;
          const last = key ? latestByKey.get(key) : null;
          return last
            ? {
                status: last.status,
                stripeEventType: last.stripeEventType,
                createdAt: last.createdAt.toISOString(),
              }
            : null;
        })(),
    })),
  });
}
