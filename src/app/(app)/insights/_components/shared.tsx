import Link from "next/link";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getCurrentUserAndBusiness } from "@/lib/currentBusiness";
import { getBusinessPlan } from "@/lib/plan";
import { canUseInsights, insightItemSchema, type InsightItem } from "@/lib/insights/schema";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export const periodFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function parseItems(value: unknown): InsightItem[] {
  const parsed = insightItemSchema.array().safeParse(value);
  return parsed.success ? parsed.data : [];
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000);
}

// periodEnd is exclusive (start of the run's UTC day), so show the day before.
export function formatPeriod(periodStart: Date, periodEnd: Date) {
  return `${periodFormatter.format(periodStart)} – ${periodFormatter.format(addDays(periodEnd, -1))}`;
}

// Shared by the layout and every insights page; cache() dedupes it per request.
export const getInsightsAccess = cache(async () => {
  const { business } = await getCurrentUserAndBusiness();
  if (!business) return { business: null, allowed: false } as const;
  const { plan } = await getBusinessPlan(business.id);
  return { business, allowed: canUseInsights(plan) } as const;
});

// The latest report the customer should see. A failed run never hides it.
export const getLatestInsight = cache(async (businessId: string) =>
  prisma.reviewInsight.findFirst({
    where: { businessId, status: { in: ["ready", "insufficient_data"] } },
    orderBy: { periodEnd: "desc" },
  })
);

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <Card className="flex flex-col items-start gap-4 py-10 sm:items-center sm:text-center">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 max-w-md text-sm text-gray-500">{body}</p>
      </div>
      {action ? (
        <Link href={action.href}>
          <Button className="!w-auto px-5 py-2.5">{action.label}</Button>
        </Link>
      ) : null}
    </Card>
  );
}
