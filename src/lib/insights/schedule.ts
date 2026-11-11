// Reports cover whole calendar months in the business's timezone and run on
// the 1st, once the month is over: the cron fires daily at 10:00 UTC, so a
// run that fails on the 1st is retried the next day.
//
// periodStart / periodEnd are stored as calendar days (midnight UTC of that
// date, so they display the same everywhere); periodEnd is exclusive and is
// the 1st of the month after the one covered. zonedDayStart() turns them into
// the real instants used to select reviews.

export const DEFAULT_TIMEZONE = "Australia/Sydney";

export function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Milliseconds the zone's wall clock is ahead of UTC at instant t. */
function zoneOffsetMs(t: number, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(t))
      .map((p) => [p.type, Number(p.value)])
  );
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallClock - Math.floor(t / 1000) * 1000;
}

/** The calendar day it is at `now` in the timezone, as a stored day. */
export function localDay(now: Date, timeZone: string) {
  return startOfUtcDay(new Date(now.getTime() + zoneOffsetMs(now.getTime(), timeZone)));
}

/** The instant a stored calendar day starts in the timezone (e.g. 1 Aug in Sydney = 31 Jul 14:00 UTC). */
export function zonedDayStart(day: Date, timeZone: string) {
  const wallClock = startOfUtcDay(day).getTime();
  const guess = wallClock - zoneOffsetMs(wallClock, timeZone);
  // Re-read the offset at the guess in case a DST change sits in between.
  return new Date(wallClock - zoneOffsetMs(guess, timeZone));
}

/** The 1st of d's UTC month, or of `monthsBack` months before it. */
export function startOfUtcMonth(d: Date, monthsBack = 0) {
  // Date.UTC rolls negative months back into the previous year.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - monthsBack, 1));
}

/**
 * When the report after this one runs: the 1st after the month that holds
 * the day after periodEnd. For a new report (periodEnd 1 Nov) that is 1 Dec.
 * Reports from the old schedule ended on the last day of a month (31 Oct)
 * or mid-month (11 Nov); both also get 1 Dec, so November is reported once.
 */
export function nextReportDate(latestPeriodEnd: Date) {
  const dayAfter = new Date(startOfUtcDay(latestPeriodEnd).getTime() + 86_400_000);
  return startOfUtcMonth(dayAfter, -1);
}

/** Due when there is no report yet, or the next month to report on is over in the business's timezone. */
export function isReportDue(latestPeriodEnd: Date | null, now: Date, timeZone: string) {
  if (!latestPeriodEnd) return true;
  return nextReportDate(latestPeriodEnd).getTime() <= localDay(now, timeZone).getTime();
}
