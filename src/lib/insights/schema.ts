import { z } from "zod";

// Minimum written reviews in the window before we generate an insight;
// below this the report is stored as `insufficient_data`.
export const MIN_COMMENTS_FOR_INSIGHT = 5;
// The first report covers this many months; each monthly report after it
// starts where the previous one ended.
export const FIRST_INSIGHT_WINDOW_MONTHS = 3;
// After a long gap (e.g. a lapsed subscription) a monthly report still only
// looks back this far.
export const MAX_MONTHLY_WINDOW_DAYS = 31;
// When a new insight is due lives in ./schedule.ts (last day of each month).

export const insightItemSchema = z.object({
  // Stable snake_case key (e.g. "wait_time") reused across months so the
  // UI can show trends against the previous insight.
  theme: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  mentions: z.number().int().nonnegative(),
  avgRating: z.number().min(1).max(5).nullable(),
  // Review ids quoted as evidence; validated against the analyzed set.
  reviewIds: z.array(z.string()).min(1),
  suggestion: z.string().min(1),
});

export const insightResultSchema = z.object({
  strengths: z.array(insightItemSchema).max(3),
  improvements: z.array(insightItemSchema).max(3),
});

// What the model returns. `mentions` and `avgRating` are computed from
// `matchingIds` in code rather than trusted from the model.
export const modelInsightItemSchema = z.object({
  theme: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  matchingIds: z.array(z.string()),
  quoteIds: z.array(z.string()),
  suggestion: z.string().min(1),
});

export const modelInsightResultSchema = z.object({
  strengths: z.array(modelInsightItemSchema).max(3),
  improvements: z.array(modelInsightItemSchema).max(3),
});

export type InsightItem = z.infer<typeof insightItemSchema>;
export type ModelInsightItem = z.infer<typeof modelInsightItemSchema>;
export type InsightResult = z.infer<typeof insightResultSchema>;

export function canUseInsights(plan: "free" | "starter" | "pro") {
  return plan !== "free";
}
