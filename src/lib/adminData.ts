import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ADMIN_TIMEZONE } from "@/lib/date";
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

export type AdminDailyPoint = {
  day: string; // YYYY-MM-DD, first day of the bucket
  toDay?: string; // YYYY-MM-DD, last day of the bucket (weekly buckets only)
  reviewsPositive: number; // 4-5 stars
  reviewsNeutral: number; // 3 stars
  reviewsNegative: number; // 1-2 stars
  replies: number;
  signups: number;
};

/**
 * One row per day for the last `rangeDays` days, zero-filled.
 * Reviews are counted on the day they were posted on Google, customers only.
 * Replies match the "Replies sent" KPI; signups match the "New signups" KPI.
 */
async function loadDailySeries(rangeDays: number): Promise<AdminDailyPoint[]> {
  return prisma.$queryRaw<AdminDailyPoint[]>`
    WITH days AS (
      SELECT to_char(d, 'YYYY-MM-DD') AS day
      FROM generate_series(
        (now() AT TIME ZONE ${ADMIN_TIMEZONE})::date - (${rangeDays}::int - 1),
        (now() AT TIME ZONE ${ADMIN_TIMEZONE})::date,
        interval '1 day'
      ) AS d
    ),
    reviews AS (
      SELECT
        to_char((r."createdAtGoogle" AT TIME ZONE 'UTC') AT TIME ZONE ${ADMIN_TIMEZONE}, 'YYYY-MM-DD') AS day,
        count(*) FILTER (WHERE r.rating >= 4)::int AS positive,
        count(*) FILTER (WHERE r.rating = 3)::int AS neutral,
        count(*) FILTER (WHERE r.rating <= 2)::int AS negative
      FROM "Review" r
      JOIN "Business" b ON b.id = r."businessId"
      JOIN "User" u ON u.id = b."userId"
      WHERE r.source = 'google'
        AND u.role = 'user'
        AND r."createdAtGoogle" >= now() - (${rangeDays + 1}::int * interval '1 day')
      GROUP BY 1
    ),
    replies AS (
      SELECT
        to_char(("sentAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ADMIN_TIMEZONE}, 'YYYY-MM-DD') AS day,
        count(*)::int AS n
      FROM "ReviewResponse"
      WHERE "sentAt" >= now() - (${rangeDays + 1}::int * interval '1 day')
      GROUP BY 1
    ),
    signups AS (
      SELECT
        to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${ADMIN_TIMEZONE}, 'YYYY-MM-DD') AS day,
        count(*)::int AS n
      FROM "User"
      WHERE role = 'user'
        AND "createdAt" >= now() - (${rangeDays + 1}::int * interval '1 day')
      GROUP BY 1
    )
    SELECT
      days.day,
      coalesce(reviews.positive, 0) AS "reviewsPositive",
      coalesce(reviews.neutral, 0) AS "reviewsNeutral",
      coalesce(reviews.negative, 0) AS "reviewsNegative",
      coalesce(replies.n, 0) AS replies,
      coalesce(signups.n, 0) AS signups
    FROM days
    LEFT JOIN reviews ON reviews.day = days.day
    LEFT JOIN replies ON replies.day = days.day
    LEFT JOIN signups ON signups.day = days.day
    ORDER BY days.day
  `;
}

/**
 * Groups daily points into 7-day buckets ending today (so the oldest bucket may be shorter),
 * matching the customer dashboard.
 */
function groupByWeek(daily: AdminDailyPoint[]): AdminDailyPoint[] {
  const weeks: AdminDailyPoint[] = [];
  for (let end = daily.length; end > 0; end -= 7) {
    const chunk = daily.slice(Math.max(0, end - 7), end);
    weeks.unshift({
      day: chunk[0].day,
      toDay: chunk[chunk.length - 1].day,
      reviewsPositive: chunk.reduce((n, d) => n + d.reviewsPositive, 0),
      reviewsNeutral: chunk.reduce((n, d) => n + d.reviewsNeutral, 0),
      reviewsNegative: chunk.reduce((n, d) => n + d.reviewsNegative, 0),
      replies: chunk.reduce((n, d) => n + d.replies, 0),
      signups: chunk.reduce((n, d) => n + d.signups, 0),
    });
  }
  return weeks;
}

export const ADMIN_OVERVIEW_RANGES = ["7", "30", "90", "all"] as const;
export type AdminOverviewRange = (typeof ADMIN_OVERVIEW_RANGES)[number];

export function parseAdminOverviewRange(value: unknown): AdminOverviewRange {
  return ADMIN_OVERVIEW_RANGES.includes(value as AdminOverviewRange) ? (value as AdminOverviewRange) : "30";
}

export async function getAdminOverviewData(range: AdminOverviewRange = "30") {
  const now = new Date();
  const cronWindowStart = new Date(now.getTime() - CRON_STALE_MS);

  // "all" = since the first customer signed up (not since the oldest Google review, which can
  // predate the product by years). There is no previous period to compare against.
  let rangeDays: number;
  let start: Date | null;
  let previousStart: Date | null;
  if (range === "all") {
    const firstSignup = await prisma.user.findFirst({
      where: { role: "user" },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    rangeDays = firstSignup ? Math.max(1, Math.ceil((now.getTime() - firstSignup.createdAt.getTime()) / DAY_MS) + 1) : 1;
    start = null;
    previousStart = null;
  } else {
    rangeDays = Number(range);
    start = new Date(now.getTime() - rangeDays * DAY_MS);
    previousStart = new Date(start.getTime() - rangeDays * DAY_MS);
  }
  const inRange = start ? { gte: start } : undefined;
  const inPrevious = start && previousStart ? { gte: previousStart, lt: start } : null;

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
    daily,
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
    prisma.user.count({ where: { role: "user", createdAt: inRange } }),
    inPrevious ? prisma.user.count({ where: { role: "user", createdAt: inPrevious } }) : null,
    prisma.paymentHistory.findMany({
      where: { status: "paid", createdAt: inRange },
      select: { amount: true, currency: true },
    }),
    inPrevious
      ? prisma.paymentHistory.findMany({
          where: { status: "paid", createdAt: inPrevious },
          select: { amount: true, currency: true },
        })
      : null,
    prisma.reviewResponse.count({ where: { sentAt: inRange ?? { not: null } } }),
    inPrevious ? prisma.reviewResponse.count({ where: { sentAt: inPrevious } }) : null,
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
    loadDailySeries(rangeDays),
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

  // Daily bars up to 30 days; longer ranges would be a wall of thin bars, so group by week.
  const bucket: "day" | "week" = rangeDays > 30 ? "week" : "day";

  return {
    range,
    rangeDays,
    bucket,
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
      revenue: { current: sumByCurrency(payments), previous: previousPayments ? sumByCurrency(previousPayments) : null },
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
    daily: bucket === "week" ? groupByWeek(daily) : daily,
  };
}
