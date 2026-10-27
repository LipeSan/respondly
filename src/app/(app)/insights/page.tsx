import { INSIGHT_WINDOW_MONTHS } from "@/lib/insights/schema";
import { EmptyState, getInsightsAccess, getLatestInsight } from "./_components/shared";
import { InsightReport } from "./_components/InsightReport";

export default async function InsightsPage() {
  const { business, allowed } = await getInsightsAccess();
  // The layout renders the setup / upgrade state instead of this page.
  if (!business || !allowed) return null;

  const current = await getLatestInsight(business.id);

  if (!current) {
    return business.initialSyncCompleted ? (
      <EmptyState
        title="Your first report is on its way"
        body={`We're reading your last ${INSIGHT_WINDOW_MONTHS} months of reviews. Your first insights are usually ready in a few minutes. Refresh this page to check.`}
      />
    ) : (
      <EmptyState
        title="Connect Google to get insights"
        body="As soon as your Google reviews are synced, we'll prepare your first report."
        action={{ href: "/google", label: "Connect Google" }}
      />
    );
  }

  return <InsightReport insight={current} isLatest />;
}
