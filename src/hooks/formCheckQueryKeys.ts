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
  athletes: (review: ReviewFilter) =>
    ["form-check-inbox-athletes", review] as const,
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
 * Refresh counts / athlete lists / chips WITHOUT refetching the video list.
 * Refetching the video list re-applies `uncommentedOnly` and drops the item
 * you just commented on, making the video vanish mid-review. Instead we patch
 * the cached item in place (see `patchFormCheckVideoComments`) and only
 * invalidate the surrounding count queries.
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

/**
 * Optimistically apply saved coach comments to every cached video-inbox query
 * so the just-commented set stays on screen (now showing saved feedback +
 * "Reviewed"), instead of disappearing on the next `uncommentedOnly` refetch.
 */
export function patchFormCheckVideoComments(
  queryClient: QueryClient,
  patches: FormCheckCommentPatch[],
) {
  if (patches.length === 0) return;

  queryClient.setQueriesData<FormCheckInboxResponse>(
    { queryKey: ["form-check-inbox"] },
    (old) => {
      if (!old?.items?.length) return old;

      let changed = false;
      const items: FormCheckInboxItem[] = old.items.map((item) => {
        const patch = patches.find(
          (p) =>
            !!item.exerciseLogId &&
            p.exerciseLogId === item.exerciseLogId &&
            p.setNumber === item.setNumber,
        );
        if (!patch) return item;
        changed = true;
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
      });

      return changed ? { ...old, items } : old;
    },
  );
}
