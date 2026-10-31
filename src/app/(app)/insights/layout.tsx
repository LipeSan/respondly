import type { ReactNode } from "react";
import { FIRST_INSIGHT_WINDOW_MONTHS } from "@/lib/insights/schema";
import { Text } from "@/components/Text";
import { EmptyState, getInsightsAccess } from "./_components/shared";
import { InsightTabs } from "./_components/InsightTabs";

export default async function InsightsLayout({ children }: { children: ReactNode }) {
  const { business, allowed } = await getInsightsAccess();

  let content: ReactNode;
  if (!business) {
    content = (
      <EmptyState
        title="Set up your business first"
        body="Insights are built from your Google reviews once your business is set up."
        action={{ href: "/onboarding", label: "Get started" }}
      />
    );
  } else if (!allowed) {
    content = (
      <EmptyState
        title="Monthly review insights"
        body={`Your first report covers your last ${FIRST_INSIGHT_WINDOW_MONTHS} months of reviews, then every month we read that month's reviews. Each report shows the 3 things customers love most and the 3 things they want you to improve, with real quotes as proof. Available on Starter and Pro.`}
        action={{ href: "/subscription", label: "See plans" }}
      />
    );
  } else {
    content = (
      <>
        <InsightTabs />
        {children}
      </>
    );
  }

  return (
    <div className="pb-12">
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <Text variant="h1">Insights</Text>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-600">
            What your customers love, and what they want you to fix.
          </p>
        </div>
        {content}
      </main>
    </div>
  );
}
