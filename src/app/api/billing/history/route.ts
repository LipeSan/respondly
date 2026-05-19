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

  const items = await prisma.paymentHistory.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      status: true,
      amount: true,
      currency: true,
      paidAt: true,
      createdAt: true,
      stripeInvoiceId: true,
      hostedInvoiceUrl: true,
      invoicePdf: true,
    },
  });

  return NextResponse.json({
    items: items.map((i) => ({
      ...i,
      paidAt: i.paidAt ? i.paidAt.toISOString() : null,
      createdAt: i.createdAt.toISOString(),
    })),
  });
}
