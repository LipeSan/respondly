import { blockedBillingStatuses, isActiveSubscriptionStatus } from "@/lib/plan";

// Single definition of "is this customer OK?" for the admin area: the
// overview's attention list, the customer table's health column and the
// customer detail checklist all derive from these rules.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** The cron runs daily; anything older than this means a business was skipped. */
export const SYNC_STALE_MS = 48 * HOUR_MS;
/** Allow the daily cron some slack before calling the whole system stale. */
export const CRON_STALE_MS = 26 * HOUR_MS;
const TRIAL_ENDING_MS = 7 * DAY_MS;

export type HealthSeverity = "critical" | "warning";
export type HealthLevel = "healthy" | HealthSeverity;

export type HealthIssue = {
  code:
    | "google_missing"
    | "location_missing"
    | "no_plan"
    | "billing_problem"
    | "auto_replies_off"
    | "never_synced"
    | "sync_failed"
    | "sync_stale"
    | "cancel_scheduled"
    | "trial_ending";
  severity: HealthSeverity;
  label: string;
};

export type BusinessHealthInput = {
  autoResponderEnabled: boolean;
  googleConnected: boolean;
  locationSelected: boolean;
  subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
    trialEndsAt: Date | string | null;
  } | null;
  latestBillingStatus: string | null;
  lastSync: { status: "success" | "failed"; at: Date | string } | null;
};

function toTime(value: Date | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function daysFrom(ms: number) {
  return Math.max(1, Math.round(ms / DAY_MS));
}

export function isPaying(input: Pick<BusinessHealthInput, "subscription" | "latestBillingStatus">) {
  const billingBlocked = input.latestBillingStatus ? blockedBillingStatuses.has(input.latestBillingStatus) : false;
  return isActiveSubscriptionStatus(input.subscription?.status) && !billingBlocked;
}

export function getBusinessHealthIssues(input: BusinessHealthInput, now = Date.now()): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const paying = isPaying(input);

  if (input.latestBillingStatus && blockedBillingStatuses.has(input.latestBillingStatus)) {
    issues.push({ code: "billing_problem", severity: "critical", label: "Payment problem" });
  } else if (input.subscription?.status === "past_due") {
    issues.push({ code: "billing_problem", severity: "critical", label: "Payment past due" });
  }

  if (!input.googleConnected) {
    issues.push({ code: "google_missing", severity: paying ? "critical" : "warning", label: "Google not connected" });
  } else if (!input.locationSelected) {
    issues.push({ code: "location_missing", severity: paying ? "critical" : "warning", label: "No Google location selected" });
  }

  if (!input.subscription) {
    issues.push({ code: "no_plan", severity: "warning", label: "No plan" });
  }

  // A paying customer with automation off gets nothing for their money; this
  // went unnoticed for two weeks once, so it's always critical.
  if (paying && !input.autoResponderEnabled) {
    issues.push({ code: "auto_replies_off", severity: "critical", label: "Paying, but auto-replies are off" });
  }

  // The cron only syncs businesses with auto-replies on, so sync health only
  // applies to those.
  if (paying && input.autoResponderEnabled && input.googleConnected && input.locationSelected) {
    if (!input.lastSync) {
      issues.push({ code: "never_synced", severity: "warning", label: "Never synced" });
    } else if (input.lastSync.status === "failed") {
      issues.push({ code: "sync_failed", severity: "critical", label: "Last sync failed" });
    } else {
      const age = now - toTime(input.lastSync.at);
      if (age > SYNC_STALE_MS) {
        issues.push({ code: "sync_stale", severity: "critical", label: `No sync for ${daysFrom(age)} days` });
      }
    }
  }

  if (input.subscription?.cancelAtPeriodEnd && input.subscription.status !== "canceled") {
    issues.push({ code: "cancel_scheduled", severity: "warning", label: "Cancellation scheduled" });
  }

  if (input.subscription?.status === "trialing" && input.subscription.trialEndsAt) {
    const left = toTime(input.subscription.trialEndsAt) - now;
    if (left > 0 && left <= TRIAL_ENDING_MS) {
      issues.push({ code: "trial_ending", severity: "warning", label: `Trial ends in ${daysFrom(left)} days` });
    }
  }

  return issues;
}

export function getHealthLevel(issues: HealthIssue[]): HealthLevel {
  if (issues.some((i) => i.severity === "critical")) return "critical";
  if (issues.length > 0) return "warning";
  return "healthy";
}
