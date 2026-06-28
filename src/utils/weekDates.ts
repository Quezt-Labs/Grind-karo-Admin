/** YYYY-MM-DD helpers for program week calendar dates. */

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return formatIsoDate(d);
}

export function defaultWeekEnd(weekStart: string): string {
  return addDays(weekStart, 6);
}

export function formatCalendarDate(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatWeekDateRange(
  weekStart: string | null | undefined,
  weekEnd: string | null | undefined,
): string | null {
  if (!weekStart && !weekEnd) return null;
  if (weekStart && weekEnd) {
    if (weekStart === weekEnd) return formatCalendarDate(weekStart);
    const start = parseIsoDate(weekStart);
    const end = parseIsoDate(weekEnd);
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const startFmt = start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    const endFmt = formatCalendarDate(weekEnd);
    return `${startFmt} – ${endFmt}`;
  }
  if (weekStart) return `from ${formatCalendarDate(weekStart)}`;
  return `until ${formatCalendarDate(weekEnd!)}`;
}

export interface BlockDateRange {
  weekStart: string;
  weekEnd: string;
}

export function computeBlockDateRange(
  weeks: Array<{
    weekNumber: number;
    weekStart?: string | null;
    weekEnd?: string | null;
  }>,
): BlockDateRange | null {
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  let start: string | null = null;
  let end: string | null = null;
  for (const w of sorted) {
    if (w.weekStart && (!start || w.weekStart < start)) start = w.weekStart;
    if (w.weekEnd && (!end || w.weekEnd > end)) end = w.weekEnd;
  }
  if (!start && !end) return null;
  if (start && end) return { weekStart: start, weekEnd: end };
  if (start) return { weekStart: start, weekEnd: start };
  return { weekStart: end!, weekEnd: end! };
}

export function suggestNextWeekStart(
  weeks: Array<{
    weekNumber: number;
    weekStart?: string | null;
    weekEnd?: string | null;
  }>,
): string | null {
  if (!weeks.length) return null;
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  for (let i = sorted.length - 1; i >= 0; i--) {
    const w = sorted[i];
    if (w.weekEnd) return addDays(w.weekEnd, 1);
    if (w.weekStart) return addDays(w.weekStart, 7);
  }

  return null;
}

export function suggestNextWeekDates(
  weeks: Array<{
    weekNumber: number;
    weekStart?: string | null;
    weekEnd?: string | null;
  }>,
): { weekStart: string; weekEnd: string } | null {
  const weekStart = suggestNextWeekStart(weeks);
  if (!weekStart) return null;
  return { weekStart, weekEnd: defaultWeekEnd(weekStart) };
}

/** Default calendar range for the first week in a block (today → +6 days). */
export function suggestFirstWeekDates(): {
  weekStart: string;
  weekEnd: string;
} {
  const d = new Date();
  const weekStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { weekStart, weekEnd: defaultWeekEnd(weekStart) };
}

export function shiftWeekDatesBySevenDays(
  weekStart: string | null | undefined,
  weekEnd: string | null | undefined,
): { weekStart: string; weekEnd: string } | null {
  if (!weekStart) return null;
  const nextStart = addDays(weekStart, 7);
  const endBase = weekEnd ?? defaultWeekEnd(weekStart);
  return { weekStart: nextStart, weekEnd: addDays(endBase, 7) };
}

export function suggestNextWeekNumber(
  weeks: Array<{ weekNumber: number }>,
): number {
  if (!weeks.length) return 1;
  return Math.max(...weeks.map((w) => w.weekNumber)) + 1;
}
