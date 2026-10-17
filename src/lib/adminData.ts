import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  CRON_STALE_MS,
  getBusinessHealthIssues,
  getHealthLevel,
  isPaying,
  type HealthIssue,
  type HealthLevel,
} from "@/lib/adminHealth";

const DAY_MS = 24 * 60 * 60 * 1000;
const INCOMPLETE_SIGNUP_GRACE_MS = 3 * DAY_MS;

export type BusinessHealthRow = {
  id: string;
  name: string;
  createdAt: Date;
  autoResponderEnabled: boolean;
  googleConnected: boolean;
  locationSelected: boolean;
  user: { id: string; name: string | null; email: string; role: "user" | "support" | "admin"; createdAt: Date };
  subscription: {
    plan: string;
    status: string;
    currentPeriodEnd: Date | null;
    trialEndsAt: Date | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  latestBillingStatus: string | null;
  lastSync: { status: "success" | "failed"; at: Date } | null;
  reviewCount: number;
  paying: boolean;
  issues: HealthIssue[];
  health: HealthLevel;
};

/** Businesses with everything needed to judge their health, newest first. */
export async function loadBusinessHealthRows(args: { where?: Prisma.BusinessWhereInput; take?: number } = {}) {
  const businesses = await prisma.business.findMany({
    where: args.where,
    orderBy: { createdAt: "desc" },
    take: args.take,
    select: {
      id: true,
      name: true,
      createdAt: true,
      autoResponderEnabled: true,
      googleLocationId: true,
      google: { select: { id: true } },
      user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      subscription: {
        select: { plan: true, status: true, currentPeriodEnd: true, trialEndsAt: true, cancelAtPeriodEnd: true },
      },
      paymentHistory: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      _count: { select: { reviews: true } },
    },
  });

  const lastSyncs = await prisma.jobRun.findMany({
    where: {
      businessId: { in: businesses.map((b) => b.id) },
      type: "sync_reviews",
      status: { in: ["success", "failed"] },
    },
    orderBy: { startedAt: "desc" },
    distinct: ["businessId"],
    select: { businessId: true, status: true, startedAt: true, finishedAt: true },
  });
  const lastSyncByBusiness = new Map(
    lastSyncs.map((run) => [
      run.businessId,
      { status: run.status as "success" | "failed", at: run.finishedAt ?? run.startedAt },
    ])
  );

  const now = Date.now();
  return businesses.map((b): BusinessHealthRow => {
    const input = {
      autoResponderEnabled: b.autoResponderEnabled,
      googleConnected: Boolean(b.google),
      locationSelected: Boolean(b.googleLocationId),
      subscription: b.subscription,
      latestBillingStatus: b.paymentHistory[0]?.status ?? null,
      lastSync: lastSyncByBusiness.get(b.id) ?? null,
    };
    const issues = getBusinessHealthIssues(input, now);
    return {
      id: b.id,
      name: b.name,
      createdAt: b.createdAt,
      autoResponderEnabled: b.autoResponderEnabled,
      googleConnected: input.googleConnected,
      locationSelected: input.locationSelected,
      user: b.user,
      subscription: b.subscription,
      latestBillingStatus: input.latestBillingStatus,
      lastSync: input.lastSync,
      reviewCount: b._count.reviews,
      paying: isPaying(input),
      issues,
      health: getHealthLevel(issues),
    };
  });
}

function sumByCurrency(rows: Array<{ amount: number | null; currency: string | null }>) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (typeof row.amount !== "number") continue;
    const currency = (row.currency ?? "aud").toUpperCase();
    totals.set(currency, (totals.get(currency) ?? 0) + row.amount);
  }
  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

export async function getAdminOverviewData(rangeDays = 30) {
  const now = new Date();
  const start = new Date(now.getTime() - rangeDays * DAY_MS);
  const previousStart = new Date(start.getTime() - rangeDays * DAY_MS);
  const cronWindowStart = new Date(now.getTime() - CRON_STALE_MS);

  const [
    rows,
    lastCronRun,
    recentFailures,
    syncedRecently,
    signups,
    previousSignups,
    payments,
    previousPayments,
    replies,
    previousReplies,
    usersTotal,
    incompleteSignups,
    recentActivity,
  ] = await Promise.all([
    loadBusinessHealthRows(),
    prisma.jobRun.findFirst({
      where: { type: "sync_reviews" },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.jobRun.count({ where: { status: "failed", startedAt: { gte: cronWindowStart } } }),
    prisma.jobRun.findMany({
      where: { type: "sync_reviews", status: "success", startedAt: { gte: cronWindowStart } },
      distinct: ["businessId"],
      select: { businessId: true },
    }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: start } } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: previousStart, lt: start } } }),
    prisma.paymentHistory.findMany({
      where: { status: "paid", createdAt: { gte: start } },
      select: { amount: true, currency: true },
    }),
    prisma.paymentHistory.findMany({
      where: { status: "paid", createdAt: { gte: previousStart, lt: start } },
      select: { amount: true, currency: true },
    }),
    prisma.reviewResponse.count({ where: { sentAt: { gte: start } } }),
    prisma.reviewResponse.count({ where: { sentAt: { gte: previousStart, lt: start } } }),
    prisma.user.count({ where: { role: "user" } }),
    prisma.user.count({
      where: {
        role: "user",
        businesses: { none: {} },
        createdAt: { lt: new Date(now.getTime() - INCOMPLETE_SIGNUP_GRACE_MS) },
      },
    }),
    prisma.adminAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        action: true,
        createdAt: true,
        actorUser: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
        targetBusiness: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Customers only: staff accounts with their own test businesses are excluded.
  const customers = rows.filter((r) => r.user.role === "user");
  const expectedInCron = customers.filter((r) => r.paying && r.autoResponderEnabled);
  const cronStale =
    expectedInCron.length > 0 && (!lastCronRun || now.getTime() - lastCronRun.startedAt.getTime() > CRON_STALE_MS);

  const attention = customers
    .filter((r) => r.issues.length > 0)
    .sort((a, b) => {
      const rank = (r: BusinessHealthRow) => (r.health === "critical" ? 0 : 1) - (r.paying ? 0.5 : 0);
      return rank(a) - rank(b);
    });

  return {
    rangeDays,
    system: {
      lastCronRunAt: lastCronRun?.startedAt ?? null,
      cronStale,
      failuresLast26h: recentFailures,
      businessesSyncedLast26h: syncedRecently.length,
      businessesExpected: expectedInCron.length,
    },
    kpis: {
      payingCustomers: customers.filter((r) => r.paying && r.subscription?.status === "active").length,
      trialing: customers.filter((r) => r.paying && r.subscription?.status === "trialing").length,
      signups: { current: signups, previous: previousSignups },
      revenue: { current: sumByCurrency(payments), previous: sumByCurrency(previousPayments) },
      repliesSent: { current: replies, previous: previousReplies },
    },
    attention,
    incompleteSignups,
    // Cumulative: each step only counts customers who also passed the previous
    // ones (a trial can start before Google is connected).
    // Counted in people, not businesses, since an owner can have several.
    funnel: (() => {
      const owners = (list: BusinessHealthRow[]) => new Set(list.map((r) => r.user.id)).size;
      const connected = customers.filter((r) => r.googleConnected && r.locationSelected);
      const onPlan = connected.filter((r) => r.paying);
      const automating = onPlan.filter((r) => r.autoResponderEnabled);
      return [
        { label: "Signed up", count: usersTotal },
        { label: "Business created", count: owners(customers) },
        { label: "Google connected", count: owners(connected) },
        { label: "On a plan", count: owners(onPlan) },
        { label: "Automating", count: owners(automating) },
      ];
    })(),
    recentActivity,
  };
}
