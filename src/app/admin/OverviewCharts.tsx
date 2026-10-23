"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import type { AdminDailyPoint } from "@/lib/adminData";

// Rating polarity: blue = good, red = bad, gray midpoint for 3 stars.
const ratingColors = {
  positive: "#2a78d6",
  neutral: "#b8b7ae",
  negative: "#e34948",
};
const singleSeriesColor = "#2a78d6";

const dayLabel = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const dayLabelLong = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// `day` is a calendar date (YYYY-MM-DD) already bucketed server side, so format it as UTC to keep it unshifted.
function toLabels(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return { label: dayLabel.format(date), longLabel: dayLabelLong.format(date) };
}

type Series = { key: string; name: string; color: string };

function DailyBarChart({
  data,
  series,
  emptyTitle,
  emptyDetail,
  heightClass = "h-56",
}: {
  data: Array<Record<string, number | string>>;
  series: Series[];
  emptyTitle: string;
  emptyDetail: string;
  heightClass?: string;
}) {
  const hasData = data.some((d) => series.some((s) => Number(d[s.key]) > 0));

  if (!hasData) {
    return (
      <div className={`mt-5 flex ${heightClass} flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 text-center`}>
        <p className="text-sm font-medium text-gray-700">{emptyTitle}</p>
        <p className="mt-1 max-w-xs text-sm text-gray-500">{emptyDetail}</p>
      </div>
    );
  }

  return (
    <div className={`mt-5 ${heightClass} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#F3F4F6" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
          <Tooltip
            cursor={{ fill: "#F9FAFB" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as { longLabel: string };
              const total = payload.reduce((sum, p) => sum + Number(p.value ?? 0), 0);
              return (
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
                  <p className="font-semibold text-gray-900">{point.longLabel}</p>
                  {payload.map((p) => (
                    <p key={String(p.dataKey)} className="mt-1 flex items-center justify-between gap-6 text-gray-600">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                        {p.name}
                      </span>
                      <span className="font-semibold text-gray-900 tabular-nums">{p.value}</span>
                    </p>
                  ))}
                  {payload.length > 1 ? (
                    <p className="mt-1.5 flex justify-between gap-6 border-t border-gray-100 pt-1.5 text-gray-600">
                      Total <span className="font-semibold text-gray-900 tabular-nums">{total}</span>
                    </p>
                  ) : null}
                </div>
              );
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="day"
              fill={s.color}
              stroke="#fff"
              strokeWidth={series.length > 1 ? 1 : 0}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} /> {s.name}
        </span>
      ))}
    </div>
  );
}

const reviewSeries: Series[] = [
  { key: "reviewsNegative", name: "1–2 stars", color: ratingColors.negative },
  { key: "reviewsNeutral", name: "3 stars", color: ratingColors.neutral },
  { key: "reviewsPositive", name: "4–5 stars", color: ratingColors.positive },
];

export function DailyReviewsChart({ daily }: { daily: AdminDailyPoint[] }) {
  const data = daily.map((d) => ({ ...d, ...toLabels(d.day) }));
  return (
    <>
      <DailyBarChart
        data={data}
        series={reviewSeries}
        heightClass="h-64"
        emptyTitle="No new reviews in this period"
        emptyDetail="Reviews customers receive on Google will show up here once they're synced."
      />
      <Legend series={reviewSeries} />
    </>
  );
}

export function DailyCountChart({
  daily,
  metric,
  name,
  emptyTitle,
  emptyDetail,
}: {
  daily: AdminDailyPoint[];
  metric: "replies" | "signups";
  name: string;
  emptyTitle: string;
  emptyDetail: string;
}) {
  const data = daily.map((d) => ({ ...d, ...toLabels(d.day) }));
  return (
    <DailyBarChart
      data={data}
      series={[{ key: metric, name, color: singleSeriesColor }]}
      heightClass="h-48"
      emptyTitle={emptyTitle}
      emptyDetail={emptyDetail}
    />
  );
}
