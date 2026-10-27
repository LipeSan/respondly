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
        body="We're reading your reviews now. Your first insights will be ready within 24 hours."
      />
    ) : (
      <EmptyState
        title="Connect Google to get insights"
        body="Once your Google reviews are synced, we'll prepare your first report within 24 hours."
        action={{ href: "/google", label: "Connect Google" }}
      />
    );
  }

  return <InsightReport insight={current} isLatest />;
}
