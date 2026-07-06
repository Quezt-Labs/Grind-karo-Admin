import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";

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
  ) =>
    [
      "form-check-inbox",
      review,
      userId,
      weekNumber ?? "all",
      dayNumber ?? "all",
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
