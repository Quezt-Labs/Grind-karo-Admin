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
} from "@/utils/formCheckWeekUtils";

function filterAthletesByReview(
  athletes: FormCheckInboxAthlete[],
  reviewFilter: ReviewFilter,
): FormCheckInboxAthlete[] {
  if (reviewFilter !== "reviewed") return athletes;
  return athletes.filter((a) => a.totalCount > a.pendingCount);
}

export function useFormCheckAthletes(reviewFilter: ReviewFilter) {
  return useQuery({
    queryKey: formCheckKeys.athletes(reviewFilter),
    queryFn: async () => {
      const data = await formCheckInboxService.listAthletes({
        uncommentedOnly: reviewFilter === "pending",
      });
      return {
        mega: filterAthletesByReview(data.mega, reviewFilter),
        ultra: filterAthletesByReview(data.ultra, reviewFilter),
      };
    },
  });
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
        filterVideosByReview(data.items, reviewFilter),
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
      const data = await formCheckInboxService.list({
        userId: userId!,
        ...formCheckInboxListParams(reviewFilter),
        weekNumber: weekNumber ?? undefined,
        limit: FORM_CHECK_VIDEO_LIMIT,
      });
      return collectProgramDayOptions(
        filterVideosByReview(data.items, reviewFilter),
        weekNumber,
      );
    },
    enabled: enabled && !!userId,
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
        weekNumber: weekNumber ?? undefined,
        dayNumber: dayNumber ?? undefined,
        limit,
      }),
    enabled: enabled && !!userId,
  });

  const videos = useMemo(
    () =>
      dedupeFormCheckInboxItems(
        filterVideosByReview(query.data?.items ?? [], reviewFilter),
      ),
    [query.data?.items, reviewFilter],
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

  // Server total is program-scoped (source=program). Prefer it for "all"
  // when it covers more than the loaded page; otherwise use loaded length.
  const fetchedCount = query.data?.items.length ?? 0;
  const serverTotal = query.data?.total ?? 0;
  const hasMore =
    serverTotal > 0 ? serverTotal > fetchedCount : fetchedCount >= limit;

  const totalSetCount =
    reviewFilter === "all" && serverTotal > videos.length
      ? serverTotal
      : videos.length;

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
