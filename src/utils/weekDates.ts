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
  weeks: Array<{ weekNumber: number; weekEnd?: string | null }>,
): string | null {
  if (!weeks.length) return null;
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const last = sorted[sorted.length - 1];
  if (last.weekEnd) return addDays(last.weekEnd, 1);
  return null;
}

export function suggestNextWeekNumber(
  weeks: Array<{ weekNumber: number }>,
): number {
  if (!weeks.length) return 1;
  return Math.max(...weeks.map((w) => w.weekNumber)) + 1;
}
