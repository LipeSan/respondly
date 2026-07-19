import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentAdminUser, getAdminImpersonatedBusinessId } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") ?? "").trim();
  const takeRaw = Number(url.searchParams.get("take") ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 200) : 50;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { email: { contains: q, mode: "insensitive" as const } },
          { user: { email: { contains: q, mode: "insensitive" as const } } },
          { user: { name: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : undefined;

  const [usersCount, businessesCount, activeSubscriptionsCount, trialingSubscriptionsCount, businesses, recentAuditLogs] =
    await prisma.$transaction([
      prisma.user.count(),
      prisma.business.count(),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.subscription.count({ where: { status: "trialing" } }),
      prisma.business.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          subscription: {
            select: {
              plan: true,
              status: true,
              currentPeriodEnd: true,
              trialEndsAt: true,
              cancelAtPeriodEnd: true,
            },
          },
          google: {
            select: {
              id: true,
              createdAt: true,
            },
          },
          paymentHistory: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              status: true,
              stripeEventType: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              templates: true,
              rules: true,
              reviews: true,
            },
          },
        },
      }),
      prisma.adminAuditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          createdAt: true,
          metadata: true,
          actorUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          targetUser: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          targetBusiness: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

  const impersonatedBusinessId = await getAdminImpersonatedBusinessId();

  return NextResponse.json({
    admin: {
      id: adminContext.user.id,
      email: adminContext.user.email,
      role: adminContext.user.role,
      accessLevel: adminContext.accessLevel,
    },
    summary: {
      usersCount,
      businessesCount,
      activeSubscriptionsCount,
      trialingSubscriptionsCount,
    },
    impersonatedBusinessId,
    businesses: businesses.map((business) => ({
      ...business,
      createdAt: business.createdAt.toISOString(),
      user: {
        ...business.user,
        createdAt: business.user.createdAt.toISOString(),
      },
      subscription: business.subscription
        ? {
            ...business.subscription,
            currentPeriodEnd: business.subscription.currentPeriodEnd
              ? business.subscription.currentPeriodEnd.toISOString()
              : null,
            trialEndsAt: business.subscription.trialEndsAt
              ? business.subscription.trialEndsAt.toISOString()
              : null,
          }
        : null,
      google: business.google
        ? {
            ...business.google,
            createdAt: business.google.createdAt.toISOString(),
          }
        : null,
      paymentHistory: business.paymentHistory.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    })),
    recentAuditLogs: recentAuditLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
  });
}
