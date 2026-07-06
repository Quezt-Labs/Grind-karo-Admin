import type { FormCheckInboxItem } from "@/services/formCheckInboxService";

export interface FormCheckInboxGroup {
  key: string;
  videos: FormCheckInboxItem[];
  representative: FormCheckInboxItem;
  pendingCount: number;
  reviewedCount: number;
}

/** Safe HTML id for scroll targets (group keys may contain spaces/colons). */
export function formCheckExerciseDomId(groupKey: string): string {
  const encoded = btoa(encodeURIComponent(groupKey))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `form-check-exercise-${encoded}`;
}

export function formCheckExerciseGroupKey(video: FormCheckInboxItem): string {
  if (video.programExerciseId) {
    return `program-ex:${video.userId}:${video.programExerciseId}`;
  }
  if (video.programId && video.weekNumber != null && video.dayNumber != null) {
    return `program-day:${video.userId}:${video.programId}:W${video.weekNumber}D${video.dayNumber}:${video.exerciseName}`;
  }
  if (video.exerciseLogId) {
    return `program:${video.exerciseLogId}`;
  }
  return `video:${video.id}`;
}

/** Drop duplicate inbox rows (same id or same exercise + set from re-logs). */
export function dedupeFormCheckInboxItems(
  items: FormCheckInboxItem[],
): FormCheckInboxItem[] {
  const byKey = new Map<string, FormCheckInboxItem>();

  for (const item of items) {
    const key =
      item.programExerciseId != null
        ? `${item.userId}:${item.programExerciseId}:${item.setNumber}`
        : item.exerciseLogId != null
          ? `${item.userId}:${item.exerciseLogId}:${item.setNumber}`
          : item.videoUrl
            ? `${item.userId}:${item.videoUrl}:${item.setNumber}`
            : item.id;
    const existing = byKey.get(key);
    if (
      !existing ||
      new Date(item.createdAt).getTime() >
        new Date(existing.createdAt).getTime()
    ) {
      byKey.set(key, item);
    }
  }

  return [...byKey.values()];
}

function dedupeVideosInGroup(
  videos: FormCheckInboxItem[],
): FormCheckInboxItem[] {
  const bySet = new Map<number, FormCheckInboxItem>();
  for (const video of videos) {
    const existing = bySet.get(video.setNumber);
    if (
      !existing ||
      new Date(video.createdAt).getTime() >
        new Date(existing.createdAt).getTime()
    ) {
      bySet.set(video.setNumber, video);
    }
  }
  return [...bySet.values()].sort((a, b) => a.setNumber - b.setNumber);
}

export function groupFormCheckInboxItems(
  items: FormCheckInboxItem[],
): FormCheckInboxGroup[] {
  const programItems = dedupeFormCheckInboxItems(
    items.filter((item) => item.source === "program"),
  );
  const byKey = new Map<string, FormCheckInboxItem[]>();

  for (const item of programItems) {
    const key = formCheckExerciseGroupKey(item);
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }

  const groups: FormCheckInboxGroup[] = [];

  for (const [key, videos] of byKey) {
    const sorted = dedupeVideosInGroup(videos);
    const pendingCount = sorted.filter((v) => !v.reviewed).length;
    const reviewedCount = sorted.length - pendingCount;
    groups.push({
      key,
      videos: sorted,
      representative: sorted[0],
      pendingCount,
      reviewedCount,
    });
  }

  return groups.sort((a, b) => {
    const aPending = a.pendingCount > 0 ? 0 : 1;
    const bPending = b.pendingCount > 0 ? 0 : 1;
    if (aPending !== bPending) return aPending - bPending;
    const aLatest = Math.max(
      ...a.videos.map((v) => new Date(v.createdAt).getTime()),
    );
    const bLatest = Math.max(
      ...b.videos.map((v) => new Date(v.createdAt).getTime()),
    );
    return bLatest - aLatest;
  });
}
