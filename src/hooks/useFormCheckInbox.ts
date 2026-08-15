import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FORM_CHECK_VIDEO_LIMIT,
  formCheckKeys,
} from "@/hooks/formCheckQueryKeys";
import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import {
  formCheckInboxService,
  type FormCheckInboxAthlete,
  type FormCheckInboxItem,
} from "@/services/formCheckInboxService";
import {
  dedupeFormCheckInboxItems,
  groupFormCheckInboxItems,
} from "@/utils/groupFormCheckInboxItems";
import { pendingTargetsForVideos } from "@/utils/formCheckCommentTargets";
import {
  filterVideosByReview,
  formCheckInboxListParams,
  isFormCheckPending,
  isFormCheckReviewed,
} from "@/utils/formCheckReview";
import {
  collectProgramDayOptions,
  collectProgramWeekOptions,
  FORM_CHECK_UNSCOPED,
  isFormCheckUnscopedFilter,
} from "@/utils/formCheckWeekUtils";

function filterAthletesByReview(
  athletes: FormCheckInboxAthlete[],
  reviewFilter: ReviewFilter,
): FormCheckInboxAthlete[] {
  if (reviewFilter !== "reviewed") return athletes;
  return athletes.filter((a) => a.totalCount > a.pendingCount);
}

function applyWeekDayClientFilter(
  items: FormCheckInboxItem[],
  weekNumber: number | null,
  dayNumber: number | null,
): FormCheckInboxItem[] {
  let next = items;
  if (isFormCheckUnscopedFilter(weekNumber)) {
    next = next.filter((v) => v.weekNumber == null);
  }
  if (isFormCheckUnscopedFilter(dayNumber)) {
    next = next.filter((v) => v.dayNumber == null);
  }
  return next;
}

function apiWeekParam(weekNumber: number | null): number | undefined {
  return weekNumber != null && weekNumber > 0 ? weekNumber : undefined;
}

function apiDayParam(dayNumber: number | null): number | undefined {
  return dayNumber != null && dayNumber > 0 ? dayNumber : undefined;
}

export function useFormCheckAthletes(
  reviewFilter: ReviewFilter,
  handlerFilter?: "all" | "assistant_coach" | "admin",
  searchQuery?: string,
) {
  const handler =
    handlerFilter && handlerFilter !== "all" ? handlerFilter : undefined;
  const q = searchQuery?.trim() || undefined;

  return useQuery({
    queryKey: formCheckKeys.athletes(reviewFilter, handler ?? "all", q ?? ""),
    queryFn: async () => {
      const data = await formCheckInboxService.listAthletes({
        uncommentedOnly: reviewFilter === "pending",
        handler,
        q,
      });
      return {
        mega: filterAthletesByReview(data.mega, reviewFilter),
        ultra: filterAthletesByReview(data.ultra, reviewFilter),
      };
    },
  });
}

/** Single fetch for athlete detail — weeks, days, and videos derived client-side. */
export function useFormCheckAthleteDetail(opts: {
  userId: string | null | undefined;
  reviewFilter: ReviewFilter;
  weekNumber?: number | null;
  dayNumber?: number | null;
  limit?: number;
  enabled?: boolean;
}) {
  const {
    userId,
    reviewFilter,
    weekNumber = null,
    dayNumber = null,
    limit = FORM_CHECK_VIDEO_LIMIT,
    enabled = true,
  } = opts;

  const query = useQuery({
    queryKey: formCheckKeys.athleteDetail(reviewFilter, userId ?? "", limit),
    queryFn: () =>
      formCheckInboxService.list({
        userId: userId!,
        ...formCheckInboxListParams(reviewFilter),
        limit,
      }),
    enabled: enabled && !!userId,
  });

  const allVideos = useMemo(
    () =>
      dedupeFormCheckInboxItems(
        filterVideosByReview(query.data?.items ?? [], reviewFilter),
      ),
    [query.data?.items, reviewFilter],
  );

  const weekModel = useMemo(
    () => collectProgramWeekOptions(allVideos),
    [allVideos],
  );

  const dayModel = useMemo(() => {
    let scoped = allVideos;
    if (isFormCheckUnscopedFilter(weekNumber)) {
      scoped = scoped.filter((v) => v.weekNumber == null);
    } else if (weekNumber != null && weekNumber > 0) {
      scoped = scoped.filter((v) => v.weekNumber === weekNumber);
    }
    return collectProgramDayOptions(scoped, weekNumber);
  }, [allVideos, weekNumber]);

  const videos = useMemo(
    () => applyWeekDayClientFilter(allVideos, weekNumber, dayNumber),
    [allVideos, weekNumber, dayNumber],
  );

  const exerciseGroups = useMemo(
    () => groupFormCheckInboxItems(videos),
    [videos],
  );

  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(videos),
    [videos],
  );

  const reviewedSetCount = useMemo(
    () => videos.filter((v) => isFormCheckReviewed(v)).length,
    [videos],
  );

  const pendingSetCount = useMemo(
    () => videos.filter((v) => isFormCheckPending(v)).length,
    [videos],
  );

  const pendingExerciseCount = useMemo(
    () => exerciseGroups.filter((g) => g.pendingCount > 0).length,
    [exerciseGroups],
  );

  const fetchedCount = query.data?.items.length ?? 0;
  const serverTotal = query.data?.total ?? 0;
  const usingUnscopedFilter =
    isFormCheckUnscopedFilter(weekNumber) ||
    isFormCheckUnscopedFilter(dayNumber);
  const hasMore = usingUnscopedFilter
    ? false
    : serverTotal > 0
      ? serverTotal > fetchedCount
      : fetchedCount >= limit;

  const totalSetCount = videos.length;

  return {
    ...query,
    weekModel,
    dayModel,
    videos,
    exerciseGroups,
    pendingTargets,
    reviewedSetCount,
    pendingSetCount,
    pendingExerciseCount,
    totalSetCount,
    serverTotal,
    fetchedCount,
    hasMore,
  };
}

/** Weeks available for an athlete (unfiltered list, for week chips). */
export function useFormCheckVideoWeeks(opts: {
  userId: string | null | undefined;
  reviewFilter: ReviewFilter;
  enabled?: boolean;
}) {
  const { userId, reviewFilter, enabled = true } = opts;

  return useQuery({
    queryKey: formCheckKeys.videoWeeks(reviewFilter, userId ?? ""),
    queryFn: async () => {
      const data = await formCheckInboxService.list({
        userId: userId!,
        ...formCheckInboxListParams(reviewFilter),
        limit: FORM_CHECK_VIDEO_LIMIT,
      });
      return collectProgramWeekOptions(
        dedupeFormCheckInboxItems(
          filterVideosByReview(data.items, reviewFilter),
        ),
      );
    },
    enabled: enabled && !!userId,
  });
}

/** Days available for an athlete (scoped to selected week when set). */
export function useFormCheckVideoDays(opts: {
  userId: string | null | undefined;
  reviewFilter: ReviewFilter;
  weekNumber?: number | null;
  enabled?: boolean;
}) {
  const { userId, reviewFilter, weekNumber = null, enabled = true } = opts;

  return useQuery({
    queryKey: formCheckKeys.videoDays(reviewFilter, userId ?? "", weekNumber),
    queryFn: async () => {
      // Unscoped week has no day chips from API week filter — fetch all then scope.
      const data = await formCheckInboxService.list({
        userId: userId!,
        ...formCheckInboxListParams(reviewFilter),
        weekNumber: apiWeekParam(weekNumber),
        limit: FORM_CHECK_VIDEO_LIMIT,
      });
      let items = dedupeFormCheckInboxItems(
        filterVideosByReview(data.items, reviewFilter),
      );
      if (isFormCheckUnscopedFilter(weekNumber)) {
        items = items.filter((v) => v.weekNumber == null);
      }
      return collectProgramDayOptions(items, weekNumber);
    },
    enabled: enabled && !!userId && !isFormCheckUnscopedFilter(weekNumber),
  });
}

export function useFormCheckVideos(opts: {
  userId: string | null | undefined;
  reviewFilter: ReviewFilter;
  weekNumber?: number | null;
  dayNumber?: number | null;
  limit?: number;
  enabled?: boolean;
}) {
  const {
    userId,
    reviewFilter,
    weekNumber = null,
    dayNumber = null,
    limit = FORM_CHECK_VIDEO_LIMIT,
    enabled = true,
  } = opts;

  const query = useQuery({
    queryKey: formCheckKeys.videos(
      reviewFilter,
      userId ?? "",
      weekNumber,
      dayNumber,
      limit,
    ),
    queryFn: () =>
      formCheckInboxService.list({
        userId: userId!,
        ...formCheckInboxListParams(reviewFilter),
        weekNumber: apiWeekParam(weekNumber),
        dayNumber: apiDayParam(dayNumber),
        limit,
      }),
    enabled: enabled && !!userId,
  });

  const videos = useMemo(
    () =>
      applyWeekDayClientFilter(
        dedupeFormCheckInboxItems(
          filterVideosByReview(query.data?.items ?? [], reviewFilter),
        ),
        weekNumber,
        dayNumber,
      ),
    [query.data?.items, reviewFilter, weekNumber, dayNumber],
  );

  const exerciseGroups = useMemo(
    () => groupFormCheckInboxItems(videos),
    [videos],
  );

  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(videos),
    [videos],
  );

  const reviewedSetCount = useMemo(
    () => videos.filter((v) => isFormCheckReviewed(v)).length,
    [videos],
  );

  const pendingSetCount = useMemo(
    () => videos.filter((v) => isFormCheckPending(v)).length,
    [videos],
  );

  const pendingExerciseCount = useMemo(
    () => exerciseGroups.filter((g) => g.pendingCount > 0).length,
    [exerciseGroups],
  );

  const fetchedCount = query.data?.items.length ?? 0;
  const serverTotal = query.data?.total ?? 0;
  const usingUnscopedFilter =
    isFormCheckUnscopedFilter(weekNumber) ||
    isFormCheckUnscopedFilter(dayNumber);
  // Server total is undeduped / may ignore client unscoped filters — only trust
  // it for pagination when we are not applying client-only filters.
  const hasMore = usingUnscopedFilter
    ? false
    : serverTotal > 0
      ? serverTotal > fetchedCount
      : fetchedCount >= limit;

  // Keep total/reviewed/pending on the same video set (never mix serverTotal
  // with client-derived reviewed/pending — that caused chip vs header mismatches).
  const totalSetCount = videos.length;

  return {
    ...query,
    videos,
    exerciseGroups,
    pendingTargets,
    reviewedSetCount,
    pendingSetCount,
    pendingExerciseCount,
    totalSetCount,
    serverTotal,
    fetchedCount,
    hasMore,
  };
}

export { FORM_CHECK_UNSCOPED };
