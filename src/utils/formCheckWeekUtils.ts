import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import { isFormCheckPending } from "@/utils/formCheckReview";

export type ProgramWeekOption = {
  weekNumber: number;
  videoCount: number;
  pendingCount: number;
};

export type ProgramDayOption = {
  dayNumber: number;
  dayLabel: string | null;
  videoCount: number;
  pendingCount: number;
};

export function formatProgramWeekLabel(weekNumber: number): string {
  return `Week ${weekNumber}`;
}

/**
 * Avoid "Day 1 · Day 1" when program day title is already "Day 1".
 */
export function formatProgramDayLabel(
  dayNumber: number,
  dayLabel?: string | null,
): string {
  const trimmed = dayLabel?.trim() ?? "";
  if (!trimmed) return `Day ${dayNumber}`;

  const dayPrefix = `day ${dayNumber}`;
  const lower = trimmed.toLowerCase();

  if (lower === dayPrefix || lower === `day${dayNumber}`) {
    return `Day ${dayNumber}`;
  }

  if (lower.startsWith(dayPrefix)) {
    const rest = trimmed
      .slice(dayPrefix.length)
      .replace(/^[·\-–:,\s]+/, "")
      .trim();
    if (!rest || rest.toLowerCase() === dayPrefix) {
      return `Day ${dayNumber}`;
    }
    return `Day ${dayNumber} · ${rest}`;
  }

  return `Day ${dayNumber} · ${trimmed}`;
}

/** Unique program days from inbox items, optionally scoped to one week. */
export function collectProgramDayOptions(
  items: FormCheckInboxItem[],
  weekNumber?: number | null,
): ProgramDayOption[] {
  const byDay = new Map<
    number,
    { dayLabel: string | null; videoCount: number; pendingCount: number }
  >();

  for (const item of items) {
    if (item.dayNumber == null) continue;
    if (weekNumber != null && item.weekNumber !== weekNumber) continue;
    const row = byDay.get(item.dayNumber) ?? {
      dayLabel: item.dayLabel ?? null,
      videoCount: 0,
      pendingCount: 0,
    };
    if (
      item.dayLabel != null &&
      item.dayLabel.trim() !== "" &&
      (row.dayLabel == null || row.dayLabel === "")
    ) {
      row.dayLabel = item.dayLabel;
    }
    row.videoCount += 1;
    if (isFormCheckPending(item)) row.pendingCount += 1;
    byDay.set(item.dayNumber, row);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, stats]) => ({
      dayNumber,
      dayLabel: stats.dayLabel,
      videoCount: stats.videoCount,
      pendingCount: stats.pendingCount,
    }));
}

export function formatProgramWeekDayLabel(
  video: FormCheckInboxItem,
): string | null {
  if (video.weekNumber == null) return null;
  const week = formatProgramWeekLabel(video.weekNumber);
  if (video.dayNumber == null) return week;
  return `${week} · ${formatProgramDayLabel(video.dayNumber, video.dayLabel)}`;
}

/** Unique program weeks from inbox items, sorted ascending. */
export function collectProgramWeekOptions(
  items: FormCheckInboxItem[],
): ProgramWeekOption[] {
  const byWeek = new Map<
    number,
    { videoCount: number; pendingCount: number }
  >();

  for (const item of items) {
    if (item.weekNumber == null) continue;
    const row = byWeek.get(item.weekNumber) ?? {
      videoCount: 0,
      pendingCount: 0,
    };
    row.videoCount += 1;
    if (isFormCheckPending(item)) row.pendingCount += 1;
    byWeek.set(item.weekNumber, row);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, stats]) => ({
      weekNumber,
      ...stats,
    }));
}
