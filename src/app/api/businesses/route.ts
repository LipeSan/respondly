import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { getAdminAccessLevelForUser, getAdminImpersonatedBusinessId } from "@/lib/admin";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessLevel = getAdminAccessLevelForUser(user);

  if (accessLevel) {
    const impersonatedBusinessId = await getAdminImpersonatedBusinessId();
    if (impersonatedBusinessId) {
      const impersonatedBusiness = await prisma.business.findUnique({
        where: { id: impersonatedBusinessId },
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
      if (impersonatedBusiness) {
        return NextResponse.json({
          businesses: [
            {
              ...impersonatedBusiness,
              subscription: impersonatedBusiness.subscription
                ? {
                    ...impersonatedBusiness.subscription,
                    cancelAt: impersonatedBusiness.subscription.cancelAt
                      ? impersonatedBusiness.subscription.cancelAt.toISOString()
                      : null,
                    currentPeriodEnd: impersonatedBusiness.subscription.currentPeriodEnd
                      ? impersonatedBusiness.subscription.currentPeriodEnd.toISOString()
                      : null,
                    trialUsedAt: impersonatedBusiness.subscription.trialUsedAt
                      ? impersonatedBusiness.subscription.trialUsedAt.toISOString()
                      : null,
                    trialEndsAt: impersonatedBusiness.subscription.trialEndsAt
                      ? impersonatedBusiness.subscription.trialEndsAt.toISOString()
                      : null,
                  }
                : null,
            },
          ],
        });
      }
    }
  }

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
