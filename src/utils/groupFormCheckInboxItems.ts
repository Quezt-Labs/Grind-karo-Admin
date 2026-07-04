import type { FormCheckInboxItem } from "@/services/formCheckInboxService";

export interface FormCheckInboxGroup {
  key: string;
  videos: FormCheckInboxItem[];
  representative: FormCheckInboxItem;
  pendingCount: number;
  reviewedCount: number;
}

/** Stable key for grouping set videos that belong to the same logged exercise. */
export function formCheckExerciseGroupKey(video: FormCheckInboxItem): string {
  if (video.exerciseLogId) {
    return `program:${video.exerciseLogId}`;
  }
  return `video:${video.id}`;
}

export function groupFormCheckInboxItems(
  items: FormCheckInboxItem[],
): FormCheckInboxGroup[] {
  const programItems = items.filter((item) => item.source === "program");
  const byKey = new Map<string, FormCheckInboxItem[]>();

  for (const item of programItems) {
    const key = formCheckExerciseGroupKey(item);
    const list = byKey.get(key) ?? [];
    list.push(item);
    byKey.set(key, list);
  }

  const groups: FormCheckInboxGroup[] = [];

  for (const [key, videos] of byKey) {
    const sorted = [...videos].sort((a, b) => a.setNumber - b.setNumber);
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
