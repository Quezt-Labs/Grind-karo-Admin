import type { FormCheckInboxItem } from "@/services/formCheckInboxService";

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

export function formatProgramDayLabel(
  dayNumber: number,
  dayLabel?: string | null,
): string {
  if (dayLabel != null && dayLabel.trim() !== "") {
    return `Day ${dayNumber} · ${dayLabel.trim()}`;
  }
  return `Day ${dayNumber}`;
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
    if (!item.reviewed) row.pendingCount += 1;
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
  const day =
    video.dayLabel != null && video.dayLabel !== ""
      ? `Day ${video.dayNumber} · ${video.dayLabel}`
      : `Day ${video.dayNumber}`;
  return `${week} · ${day}`;
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
    if (!item.reviewed) row.pendingCount += 1;
    byWeek.set(item.weekNumber, row);
  }

  return [...byWeek.entries()]
    .sort(([a], [b]) => a - b)
    .map(([weekNumber, stats]) => ({
      weekNumber,
      ...stats,
    }));
}
