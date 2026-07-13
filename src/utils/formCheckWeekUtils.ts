import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import { isFormCheckPending } from "@/utils/formCheckReview";

/** Sentinel for videos with null weekNumber / dayNumber in filter UI + URL. */
export const FORM_CHECK_UNSCOPED = -1;

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

export type ProgramWeekFilterModel = {
  weeks: ProgramWeekOption[];
  unscoped: { videoCount: number; pendingCount: number } | null;
  /** Pending across every video in the source list (including unscoped). */
  totalPending: number;
  totalVideos: number;
};

export type ProgramDayFilterModel = {
  days: ProgramDayOption[];
  unscoped: { videoCount: number; pendingCount: number } | null;
  totalPending: number;
  totalVideos: number;
};

export function formatProgramWeekLabel(weekNumber: number): string {
  if (weekNumber === FORM_CHECK_UNSCOPED) return "No week";
  return `Week ${weekNumber}`;
}

/**
 * Avoid "Day 1 · Day 1" when program day title is already "Day 1".
 */
export function formatProgramDayLabel(
  dayNumber: number,
  dayLabel?: string | null,
): string {
  if (dayNumber === FORM_CHECK_UNSCOPED) return "No day";

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

export function isFormCheckUnscopedFilter(
  value: number | null | undefined,
): boolean {
  return value === FORM_CHECK_UNSCOPED;
}

/** Unique program days from inbox items, optionally scoped to one week. */
export function collectProgramDayOptions(
  items: FormCheckInboxItem[],
  weekNumber?: number | null,
): ProgramDayFilterModel {
  const byDay = new Map<
    number,
    { dayLabel: string | null; videoCount: number; pendingCount: number }
  >();
  let unscopedVideos = 0;
  let unscopedPending = 0;
  let totalPending = 0;
  let totalVideos = 0;

  for (const item of items) {
    if (
      weekNumber != null &&
      weekNumber > 0 &&
      item.weekNumber !== weekNumber
    ) {
      continue;
    }
    if (weekNumber === FORM_CHECK_UNSCOPED && item.weekNumber != null) {
      continue;
    }

    totalVideos += 1;
    if (isFormCheckPending(item)) totalPending += 1;

    if (item.dayNumber == null) {
      unscopedVideos += 1;
      if (isFormCheckPending(item)) unscopedPending += 1;
      continue;
    }

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

  return {
    days: [...byDay.entries()]
      .sort(([a], [b]) => a - b)
      .map(([dayNumber, stats]) => ({
        dayNumber,
        dayLabel: stats.dayLabel,
        videoCount: stats.videoCount,
        pendingCount: stats.pendingCount,
      })),
    unscoped:
      unscopedVideos > 0
        ? { videoCount: unscopedVideos, pendingCount: unscopedPending }
        : null,
    totalPending,
    totalVideos,
  };
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
): ProgramWeekFilterModel {
  const byWeek = new Map<
    number,
    { videoCount: number; pendingCount: number }
  >();
  let unscopedVideos = 0;
  let unscopedPending = 0;
  let totalPending = 0;
  let totalVideos = 0;

  for (const item of items) {
    totalVideos += 1;
    if (isFormCheckPending(item)) totalPending += 1;

    if (item.weekNumber == null) {
      unscopedVideos += 1;
      if (isFormCheckPending(item)) unscopedPending += 1;
      continue;
    }

    const row = byWeek.get(item.weekNumber) ?? {
      videoCount: 0,
      pendingCount: 0,
    };
    row.videoCount += 1;
    if (isFormCheckPending(item)) row.pendingCount += 1;
    byWeek.set(item.weekNumber, row);
  }

  return {
    weeks: [...byWeek.entries()]
      .sort(([a], [b]) => a - b)
      .map(([weekNumber, stats]) => ({
        weekNumber,
        ...stats,
      })),
    unscoped:
      unscopedVideos > 0
        ? { videoCount: unscopedVideos, pendingCount: unscopedPending }
        : null,
    totalPending,
    totalVideos,
  };
}
