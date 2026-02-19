import { addDays, differenceInCalendarWeeks, eachDayOfInterval, format, isSameDay, startOfDay } from 'date-fns';

/**
 * Growing weeks run Thursday → Wednesday.
 * Week 1 of 2025 starts on Thursday 2 Jan 2025.
 * The anchor date is the first Thursday of 2025.
 */

const ANCHOR_DATE = new Date(2025, 0, 2); // Thu 2 Jan 2025 = GW1 2025

/** Get the Thursday that starts the growing week containing `date`. */
export function getGrowingWeekStart(date: Date): Date {
  const d = startOfDay(date);
  const dayOfWeek = d.getDay(); // 0=Sun..6=Sat
  // Thursday=4. We need to go back to the most recent Thursday.
  // daysBack: (dayOfWeek - 4 + 7) % 7
  const daysBack = (dayOfWeek - 4 + 7) % 7;
  return addDays(d, -daysBack);
}

/** Get the Wednesday that ends the growing week containing `date`. */
export function getGrowingWeekEnd(date: Date): Date {
  return addDays(getGrowingWeekStart(date), 6);
}

/** Get the growing week number for a given date. */
export function getGrowingWeekNumber(date: Date): number {
  const weekStart = getGrowingWeekStart(date);
  const yearStart = getGrowingWeekStart(new Date(weekStart.getFullYear(), 0, 2));
  // If weekStart is before yearStart (e.g. early Jan), use previous year's anchor
  const anchor = weekStart < yearStart
    ? getGrowingWeekStart(new Date(weekStart.getFullYear() - 1, 0, 2))
    : yearStart;
  const diffDays = Math.round((weekStart.getTime() - anchor.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

/** Get the year for a growing week (based on the Thursday start). */
export function getGrowingWeekYear(date: Date): number {
  const weekStart = getGrowingWeekStart(date);
  return weekStart.getFullYear();
}

/** Get all 7 days (Thu→Wed) for the growing week containing `date`. */
export function getGrowingWeekDays(date: Date): Date[] {
  const start = getGrowingWeekStart(date);
  const end = getGrowingWeekEnd(date);
  return eachDayOfInterval({ start, end });
}

/** Format growing week label, e.g. "GW8 · 2025" */
export function formatGrowingWeek(date: Date): string {
  return `GW${getGrowingWeekNumber(date)} · ${getGrowingWeekYear(date)}`;
}

/** Format growing week date range, e.g. "20 Feb — 26 Feb 2025" */
export function formatGrowingWeekRange(date: Date): string {
  const start = getGrowingWeekStart(date);
  const end = getGrowingWeekEnd(date);
  return `${format(start, 'd MMM')} — ${format(end, 'd MMM yyyy')}`;
}
