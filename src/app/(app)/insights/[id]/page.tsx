import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getInsightsAccess, getLatestInsight } from "../_components/shared";
import { InsightReport } from "../_components/InsightReport";

export default async function PastInsightPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { business, allowed } = await getInsightsAccess();
  if (!business || !allowed) return null;

  const insight = await prisma.reviewInsight.findFirst({
    where: { id, businessId: business.id, status: { in: ["ready", "insufficient_data"] } },
  });
  if (!insight) notFound();

  const latest = await getLatestInsight(business.id);
  if (latest?.id === insight.id) redirect("/insights");

  return (
    <>
      <Link href="/insights/history" className="inline-block text-sm font-medium text-gray-500 hover:text-gray-700">
        ← Back to history
      </Link>
      <InsightReport insight={insight} isLatest={false} />
    </>
  );
}
