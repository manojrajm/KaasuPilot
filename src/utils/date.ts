/**
 * Calendar helpers that work in the device's local time zone.
 * Month boundaries are computed locally (IST for Indian users) and only then
 * converted to ISO instants, so a transaction at 12:30 AM on the 1st is
 * never counted in the previous month.
 */

const MS_PER_DAY = 86_400_000;

/** Local midnight at the start of the given date's day. */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** [start, end) of the local calendar month containing `date`, as ISO instants. */
export function localMonthRangeIso(date: Date = new Date()): { startIso: string; endIso: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

/** Number of days in a month (monthIndex is 0-based). */
export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Local date on `day` of the month that is `monthOffset` months after (year, monthIndex).
 * The day is clamped to the month's length, so day 31 becomes 28/29 Feb or 30 Apr
 * instead of spilling into the next month.
 */
export function dateOnClampedDay(
  year: number,
  monthIndex: number,
  monthOffset: number,
  day: number
): Date {
  const firstOfTarget = new Date(year, monthIndex + monthOffset, 1);
  const targetYear = firstOfTarget.getFullYear();
  const targetMonth = firstOfTarget.getMonth();
  const clampedDay = Math.min(Math.max(1, day), daysInMonth(targetYear, targetMonth));
  return new Date(targetYear, targetMonth, clampedDay);
}

/** The next local date (today or later) that falls on `day` of a month, clamped per month. */
export function nextOccurrenceOfDay(day: number, from: Date = new Date()): Date {
  const today = startOfLocalDay(from);
  const thisMonth = dateOnClampedDay(today.getFullYear(), today.getMonth(), 0, day);
  if (thisMonth.getTime() >= today.getTime()) {
    return thisMonth;
  }
  return dateOnClampedDay(today.getFullYear(), today.getMonth(), 1, day);
}

/** Whole calendar days from `from` to `to` (negative when `to` is in the past). */
export function daysBetween(from: Date, to: Date): number {
  const a = startOfLocalDay(from);
  const b = startOfLocalDay(to);
  // Math.round absorbs the one-hour difference on daylight-saving transitions.
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/** "16 Nov" style short date. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "Today, 1:15 PM" / "Yesterday, 6:40 PM" / "8 Nov" style label for activity feeds. */
export function formatRelativeDateTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diff = daysBetween(date, now);
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (diff === 0) return `Today, ${time}`;
  if (diff === 1) return `Yesterday, ${time}`;
  return formatShortDate(date);
}
