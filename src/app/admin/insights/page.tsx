import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentAdminUser } from "@/lib/admin";
import { formatAdminDateTime } from "@/lib/date";
import { Badge, Card, PageHeader, formatRelative } from "../ui";
import { AdminInsightEmailButton } from "./AdminInsightEmailButton";

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

// periodEnd is exclusive, so the last day shown is the day before it.
function formatPeriod(start: Date, end: Date) {
  return `${dayFormatter.format(start)} – ${dayFormatter.format(new Date(end.getTime() - 86_400_000))}`;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone?: "blue" }) {
  const valueClass = tone === "blue" && value !== 0 ? "text-blue-600" : "text-gray-900";
  return (
    <Card className="!p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${valueClass}`}>{value}</p>
    </Card>
  );
}

export default async function AdminInsightsPage() {
  const [adminContext, latest] = await Promise.all([
    getCurrentAdminUser(),
    // The latest report of each business: what its customer sees on /insights.
    prisma.reviewInsight.findMany({
      where: { status: { in: ["ready", "insufficient_data"] } },
      orderBy: { periodEnd: "desc" },
      distinct: ["businessId"],
      include: { business: { select: { id: true, name: true, user: { select: { email: true } } } } },
    }),
  ]);
  const canSend = adminContext?.accessLevel === "admin";

  const toSend = latest.filter((r) => r.status === "ready" && !r.emailedAt);
  const emailed = latest.filter((r) => r.emailedAt);
  const insufficient = latest.filter((r) => r.status === "insufficient_data");
  // Reports still to send first, then the newest.
  const rows = [...toSend, ...latest.filter((r) => !toSend.includes(r))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="The latest review report of each business. Email it to the owner once it's ready."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        <SummaryCard label="Ready to send" value={toSend.length} tone="blue" />
        <SummaryCard label="Emailed" value={emailed.length} />
        <SummaryCard label="Not enough reviews" value={insufficient.length} />
      </div>

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-gray-100 bg-gray-50/60 text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">Business</th>
                <th scope="col" className="px-4 py-3">Period</th>
                <th scope="col" className="px-4 py-3 text-right">Rating</th>
                <th scope="col" className="px-4 py-3 text-right">Reviews</th>
                <th scope="col" className="px-4 py-3">Emailed</th>
                <th scope="col" className="px-6 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No reports yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="align-top hover:bg-gray-50/60">
                    <td className="px-6 py-3">
                      <Link href={`/admin/businesses/${r.business.id}`} className="font-medium text-gray-900 hover:underline">
                        {r.business.name}
                      </Link>
                      <p className="text-xs text-gray-500">{r.business.user.email}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatPeriod(r.periodStart, r.periodEnd)}
                      <p className="text-xs text-gray-400">generated {formatRelative(r.createdAt)}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-900">
                      {r.avgRating !== null ? `${r.avgRating.toFixed(1)}★` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                      {r.reviewCount}
                      <p className="text-xs text-gray-400">{r.commentCount} with text</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "insufficient_data" ? (
                        <Badge tone="gray">not enough reviews</Badge>
                      ) : r.emailedAt ? (
                        <>
                          <Badge tone="green">emailed</Badge>
                          <p className="mt-1 text-xs text-gray-400">{formatAdminDateTime(r.emailedAt)}</p>
                        </>
                      ) : (
                        <Badge tone="blue">ready to send</Badge>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {canSend && r.status === "ready" ? (
                        <AdminInsightEmailButton
                          insightId={r.id}
                          businessName={r.business.name}
                          to={r.business.user.email}
                          emailed={Boolean(r.emailedAt)}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
