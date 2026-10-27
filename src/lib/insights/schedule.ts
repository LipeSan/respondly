// Monthly reports run on the last day of each month. Dates are UTC days:
// the cron fires at 10:00 UTC (20:00-21:00 in Sydney), so the UTC date is
// also the customer's date when it runs.

export function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function lastDayOfMonth(year: number, month: number) {
  // Day 0 of the next month is the last day of this one; Date.UTC rolls the year over.
  return new Date(Date.UTC(year, month + 1, 0));
}

/**
 * The run day the business should already have a report for: today if
 * today is the last day of the month, otherwise the previous month's last
 * day. A failed run on the 31st is therefore retried on the 1st.
 */
export function currentReportSlot(now = new Date()) {
  const today = startOfUtcDay(now);
  const endOfThisMonth = lastDayOfMonth(today.getUTCFullYear(), today.getUTCMonth());
  return today.getTime() === endOfThisMonth.getTime()
    ? endOfThisMonth
    : lastDayOfMonth(today.getUTCFullYear(), today.getUTCMonth() - 1);
}

/**
 * Due when there is no report yet (the first one is generated right after
 * the initial sync) or the latest one is older than the current slot.
 * A run sets periodEnd to its own UTC day, so a report made on the slot day
 * or later covers it.
 */
export function isReportDue(latestPeriodEnd: Date | null, now = new Date()) {
  if (!latestPeriodEnd) return true;
  return latestPeriodEnd.getTime() < currentReportSlot(now).getTime();
}

/** The next last-day-of-month run after a report with this periodEnd. */
export function nextReportDate(latestPeriodEnd: Date) {
  const day = startOfUtcDay(latestPeriodEnd);
  const endOfMonth = lastDayOfMonth(day.getUTCFullYear(), day.getUTCMonth());
  return day.getTime() < endOfMonth.getTime()
    ? endOfMonth
    : lastDayOfMonth(day.getUTCFullYear(), day.getUTCMonth() + 1);
}
