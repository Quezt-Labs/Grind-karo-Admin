import type {
  FormCheckActionQueueItem,
  FormCheckQueueTab,
} from "@/services/formCheckActionQueueService";

export type FormCheckActionQueueAthleteGroup = {
  athleteId: string;
  athleteName: string;
  athleteEmail: string;
  items: FormCheckActionQueueItem[];
  latestActivityAt: string;
  needsReplyCount: number;
  unreadCount: number;
};

function priorityRank(priority: FormCheckActionQueueItem["priority"]): number {
  if (priority === "P0") return 0;
  if (priority === "P1") return 1;
  if (priority === "P2") return 2;
  return 3;
}

function sortItemsInAthlete(
  items: FormCheckActionQueueItem[],
  tab: FormCheckQueueTab,
): FormCheckActionQueueItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const pr = priorityRank(a.priority) - priorityRank(b.priority);
    if (pr !== 0) return pr;
    const aAt = new Date(a.latestActivityAt).getTime();
    const bAt = new Date(b.latestActivityAt).getTime();
    const byTime = tab === "resolved" ? bAt - aAt : aAt - bAt;
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
  return copy;
}

export function groupFormCheckActionQueueByAthlete(
  items: FormCheckActionQueueItem[],
  tab: FormCheckQueueTab,
): FormCheckActionQueueAthleteGroup[] {
  const byAthlete = new Map<string, FormCheckActionQueueItem[]>();
  for (const item of items) {
    const key = item.athleteId ?? item.id;
    const bucket = byAthlete.get(key);
    if (bucket) bucket.push(item);
    else byAthlete.set(key, [item]);
  }

  const groups: FormCheckActionQueueAthleteGroup[] = [];
  for (const [athleteId, athleteItems] of byAthlete) {
    const sortedItems = sortItemsInAthlete(athleteItems, tab);
    const latestActivityAt = sortedItems.reduce(
      (latest, item) => {
        const t = new Date(item.latestActivityAt).getTime();
        return t > new Date(latest).getTime() ? item.latestActivityAt : latest;
      },
      sortedItems[0]?.latestActivityAt ?? new Date(0).toISOString(),
    );
    groups.push({
      athleteId,
      athleteName:
        sortedItems[0]?.athleteName?.trim() ||
        sortedItems[0]?.athleteEmail ||
        "Unknown athlete",
      athleteEmail: sortedItems[0]?.athleteEmail ?? "",
      items: sortedItems,
      latestActivityAt,
      needsReplyCount: sortedItems.filter((i) => i.state === "needs_reply")
        .length,
      unreadCount: sortedItems.reduce(
        (sum, i) => sum + (i.unreadCount ?? 0),
        0,
      ),
    });
  }

  groups.sort((a, b) => {
    if (a.needsReplyCount > 0 !== b.needsReplyCount > 0) {
      return a.needsReplyCount > 0 ? -1 : 1;
    }
    const aAt = new Date(a.latestActivityAt).getTime();
    const bAt = new Date(b.latestActivityAt).getTime();
    const byTime = tab === "resolved" ? bAt - aAt : aAt - bAt;
    if (byTime !== 0) return byTime;
    return a.athleteName.localeCompare(b.athleteName);
  });

  return groups;
}
