import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentAdminUser, getAdminImpersonatedBusinessId } from "@/lib/admin";
import { loadBusinessHealthRows } from "@/lib/adminData";
import { getOnboardingStage } from "@/lib/email/adminEmailPresets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const adminContext = await getCurrentAdminUser();
  if (!adminContext) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = String(url.searchParams.get("q") ?? "").trim();
  const takeRaw = Number(url.searchParams.get("take") ?? 200);
  const take = Number.isFinite(takeRaw) ? Math.min(Math.max(Math.floor(takeRaw), 1), 500) : 200;
  const contains = (value: string) => ({ contains: value, mode: "insensitive" as const });

  const [rows, incompleteUsers] = await Promise.all([
    loadBusinessHealthRows({
      take,
      where: q
        ? {
            OR: [
              { name: contains(q) },
              { email: contains(q) },
              { user: { email: contains(q) } },
              { user: { name: contains(q) } },
            ],
          }
        : undefined,
    }),
    // Users who signed up but never created a business don't appear as
    // businesses, so they're listed separately for follow-up.
    prisma.user.findMany({
      where: {
        role: "user",
        businesses: { none: {} },
        ...(q ? { OR: [{ email: contains(q) }, { name: contains(q) }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
  ]);

  const emailLogs = await prisma.adminAuditLog.findMany({
    where: {
      action: "user_email_sent",
      targetUserId: { in: [...rows.map((r) => r.user.id), ...incompleteUsers.map((u) => u.id)] },
    },
    orderBy: { createdAt: "desc" },
    distinct: ["targetUserId"],
    select: { targetUserId: true, createdAt: true },
  });
  const lastEmailSentAt = new Map(emailLogs.map((log) => [log.targetUserId, log.createdAt.toISOString()]));

  return NextResponse.json({
    admin: { accessLevel: adminContext.accessLevel },
    impersonatedBusinessId: await getAdminImpersonatedBusinessId(),
    customers: rows.map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
      owner: {
        id: row.user.id,
        name: row.user.name,
        email: row.user.email,
        role: row.user.role,
        lastEmailSentAt: lastEmailSentAt.get(row.user.id) ?? null,
      },
      subscription: row.subscription
        ? {
            plan: row.subscription.plan,
            status: row.subscription.status,
            trialEndsAt: row.subscription.trialEndsAt?.toISOString() ?? null,
          }
        : null,
      autoResponderEnabled: row.autoResponderEnabled,
      lastSync: row.lastSync ? { status: row.lastSync.status, at: row.lastSync.at.toISOString() } : null,
      reviewCount: row.reviewCount,
      health: row.health,
      issues: row.issues,
      stage: getOnboardingStage({
        hasBusiness: true,
        hasGoogle: row.googleConnected,
        hasSubscription: Boolean(row.subscription),
      }),
    })),
    incompleteUsers: incompleteUsers.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastEmailSentAt: lastEmailSentAt.get(user.id) ?? null,
    })),
  });
}
