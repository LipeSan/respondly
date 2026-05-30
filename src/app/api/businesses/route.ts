import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const businesses = await prisma.business.findMany({
    where: { userId: user.id },
    include: {
      google: {
        select: {
          id: true,
          createdAt: true,
        },
      },
      subscription: {
        select: {
          plan: true,
          status: true,
          cancelAtPeriodEnd: true,
          cancelAt: true,
          currentPeriodEnd: true,
          trialUsedAt: true,
          trialEndsAt: true,
        },
      },
    },
  });
  return NextResponse.json({
    businesses: businesses.map((b) => ({
      ...b,
      subscription: b.subscription
        ? {
            ...b.subscription,
            cancelAt: b.subscription.cancelAt ? b.subscription.cancelAt.toISOString() : null,
            currentPeriodEnd: b.subscription.currentPeriodEnd ? b.subscription.currentPeriodEnd.toISOString() : null,
            trialUsedAt: b.subscription.trialUsedAt ? b.subscription.trialUsedAt.toISOString() : null,
            trialEndsAt: b.subscription.trialEndsAt ? b.subscription.trialEndsAt.toISOString() : null,
          }
        : null,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const phone = body.phone ? String(body.phone).trim() : null;
  const email = body.email ? String(body.email).trim() : null;

  if (!name) return NextResponse.json({ error: "Business name is required" }, { status: 400 });

  const business = await prisma.business.create({
    data: { userId: user.id, name, phone: phone ?? undefined, email: email ?? undefined },
  });

  return NextResponse.json({ business }, { status: 201 });
}
