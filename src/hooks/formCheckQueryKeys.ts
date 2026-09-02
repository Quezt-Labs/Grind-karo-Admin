import type { QueryClient } from "@tanstack/react-query";
import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import type {
  FormCheckInboxItem,
  FormCheckInboxResponse,
} from "@/services/formCheckInboxService";

export const FORM_CHECK_VIDEO_LIMIT = 100;

export const formCheckKeys = {
  all: ["form-check"] as const,
  pendingCount: () => ["form-check-pending-count"] as const,
  missing: () => ["form-check-missing"] as const,
  athletes: (review: ReviewFilter, handler?: string, search?: string) =>
    [
      "form-check-inbox-athletes",
      review,
      handler ?? "all",
      search ?? "",
    ] as const,
  athleteDetail: (review: ReviewFilter, userId: string, limit?: number) =>
    [
      "form-check-inbox-athlete-detail",
      review,
      userId,
      limit ?? FORM_CHECK_VIDEO_LIMIT,
    ] as const,
  videos: (
    review: ReviewFilter,
    userId: string,
    weekNumber?: number | null,
    dayNumber?: number | null,
    limit?: number,
  ) =>
    [
      "form-check-inbox",
      review,
      userId,
      weekNumber ?? "all",
      dayNumber ?? "all",
      limit ?? FORM_CHECK_VIDEO_LIMIT,
    ] as const,
  videoWeeks: (review: ReviewFilter, userId: string) =>
    ["form-check-inbox-weeks", review, userId] as const,
  videoDays: (
    review: ReviewFilter,
    userId: string,
    weekNumber?: number | null,
  ) => ["form-check-inbox-days", review, userId, weekNumber ?? "all"] as const,
  pendingUser: (userId: string, scopeKey: string) =>
    ["form-check-inbox-pending-user", userId, scopeKey] as const,
  purchases: (userId: string) => ["admin-user-purchases", userId] as const,
  assignment: (userId: string) => ["athlete-assignment", userId] as const,
};

export function invalidateFormCheckQueries(
  queryClient: {
    invalidateQueries: (opts: { queryKey: readonly unknown[] }) => void;
  },
  opts?: { userId?: string },
) {
  void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
  void queryClient.invalidateQueries({
    queryKey: ["form-check-inbox-athletes"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["form-check-pending-count"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["form-check-missing"],
  });
  if (opts?.userId) {
    void queryClient.invalidateQueries({
      queryKey: ["form-check-inbox-pending-user", opts.userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", opts.userId],
    });
  }
}

/**
 * Refresh counts / athlete lists / week-day chips without a full inbox refetch.
 * The commented video is dropped from pending caches in
 * `patchFormCheckVideoComments`.
 */
export function invalidateFormCheckCounts(
  queryClient: {
    invalidateQueries: (opts: { queryKey: readonly unknown[] }) => void;
  },
  opts?: { userId?: string },
) {
  void queryClient.invalidateQueries({
    queryKey: ["form-check-inbox-athletes"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["form-check-pending-count"],
  });
  void queryClient.invalidateQueries({ queryKey: ["form-check-inbox-weeks"] });
  void queryClient.invalidateQueries({ queryKey: ["form-check-inbox-days"] });
  if (opts?.userId) {
    void queryClient.invalidateQueries({
      queryKey: ["form-check-inbox-pending-user", opts.userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", opts.userId],
    });
  }
}

export type FormCheckCommentPatch = {
  exerciseLogId: string;
  setNumber: number;
  comment: string;
  coachCommentId?: string | null;
  coachCommentUpdatedAt?: string | null;
};

function findCommentPatch(
  item: FormCheckInboxItem,
  patches: FormCheckCommentPatch[],
) {
  return patches.find(
    (p) =>
      !!item.exerciseLogId &&
      p.exerciseLogId === item.exerciseLogId &&
      p.setNumber === item.setNumber,
  );
}

function withPatchedComment(
  item: FormCheckInboxItem,
  patch: FormCheckCommentPatch,
): FormCheckInboxItem {
  return {
    ...item,
    coachComment: patch.comment,
    coachCommentId: patch.coachCommentId ?? item.coachCommentId,
    coachCommentUpdatedAt:
      patch.coachCommentUpdatedAt ??
      item.coachCommentUpdatedAt ??
      new Date().toISOString(),
    reviewed: true,
  };
}

/**
 * Apply saved coach comments to cached inbox queries. Pending filters drop
 * the commented set immediately so it leaves the review queue.
 */
export function patchFormCheckVideoComments(
  queryClient: QueryClient,
  patches: FormCheckCommentPatch[],
) {
  if (patches.length === 0) return;

  const dropFromPending = (old: FormCheckInboxResponse | undefined) => {
    if (!old?.items?.length) return old;
    const items = old.items.filter((item) => !findCommentPatch(item, patches));
    if (items.length === old.items.length) return old;
    const removed = old.items.length - items.length;
    return {
      ...old,
      items,
      total: Math.max(0, old.total - removed),
      pendingCount: Math.max(0, old.pendingCount - removed),
    };
  };

  const patchInPlace = (old: FormCheckInboxResponse | undefined) => {
    if (!old?.items?.length) return old;
    let changed = false;
    let newlyReviewed = 0;
    const items: FormCheckInboxItem[] = old.items.map((item) => {
      const patch = findCommentPatch(item, patches);
      if (!patch) return item;
      changed = true;
      if (!item.coachComment?.trim()) newlyReviewed += 1;
      return withPatchedComment(item, patch);
    });
    if (!changed) return old;
    return {
      ...old,
      items,
      pendingCount: Math.max(0, old.pendingCount - newlyReviewed),
    };
  };

  for (const prefix of [
    "form-check-inbox",
    "form-check-inbox-athlete-detail",
  ]) {
    queryClient.setQueriesData<FormCheckInboxResponse>(
      { queryKey: [prefix, "pending"] },
      dropFromPending,
    );
    queryClient.setQueriesData<FormCheckInboxResponse>(
      { queryKey: [prefix, "reviewed"] },
      patchInPlace,
    );
    queryClient.setQueriesData<FormCheckInboxResponse>(
      { queryKey: [prefix, "all"] },
      patchInPlace,
    );
  }
}
