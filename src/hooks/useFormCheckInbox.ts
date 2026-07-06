import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FORM_CHECK_VIDEO_LIMIT,
  formCheckKeys,
} from "@/hooks/formCheckQueryKeys";
import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import { groupFormCheckInboxItems } from "@/utils/groupFormCheckInboxItems";
import { pendingTargetsForVideos } from "@/utils/formCheckCommentTargets";
import {
  collectProgramDayOptions,
  collectProgramWeekOptions,
} from "@/utils/formCheckWeekUtils";

export function useFormCheckAthletes(reviewFilter: ReviewFilter) {
  return useQuery({
    queryKey: formCheckKeys.athletes(reviewFilter),
    queryFn: () =>
      formCheckInboxService.listAthletes({
        uncommentedOnly: reviewFilter === "pending",
      }),
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
        uncommentedOnly: reviewFilter === "pending",
        limit: FORM_CHECK_VIDEO_LIMIT,
      });
      return collectProgramWeekOptions(data.items);
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
        uncommentedOnly: reviewFilter === "pending",
        weekNumber: weekNumber ?? undefined,
        limit: FORM_CHECK_VIDEO_LIMIT,
      });
      return collectProgramDayOptions(data.items, weekNumber);
    },
    enabled: enabled && !!userId,
  });
}

export function useFormCheckVideos(opts: {
  userId: string | null | undefined;
  reviewFilter: ReviewFilter;
  weekNumber?: number | null;
  dayNumber?: number | null;
  enabled?: boolean;
}) {
  const {
    userId,
    reviewFilter,
    weekNumber = null,
    dayNumber = null,
    enabled = true,
  } = opts;

  const query = useQuery({
    queryKey: formCheckKeys.videos(
      reviewFilter,
      userId ?? "",
      weekNumber,
      dayNumber,
    ),
    queryFn: () =>
      formCheckInboxService.list({
        userId: userId!,
        uncommentedOnly: reviewFilter === "pending",
        weekNumber: weekNumber ?? undefined,
        dayNumber: dayNumber ?? undefined,
        limit: FORM_CHECK_VIDEO_LIMIT,
      }),
    enabled: enabled && !!userId,
  });

  const videos = useMemo(() => query.data?.items ?? [], [query.data?.items]);

  const exerciseGroups = useMemo(
    () => groupFormCheckInboxItems(videos),
    [videos],
  );

  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(videos),
    [videos],
  );

  const reviewedSetCount = useMemo(
    () => videos.filter((v) => v.reviewed).length,
    [videos],
  );

  const pendingExerciseCount = useMemo(
    () => exerciseGroups.filter((g) => g.pendingCount > 0).length,
    [exerciseGroups],
  );

  const hasMore = (query.data?.items.length ?? 0) >= FORM_CHECK_VIDEO_LIMIT;

  return {
    ...query,
    videos,
    exerciseGroups,
    pendingTargets,
    reviewedSetCount,
    pendingExerciseCount,
    totalSetCount: videos.length,
    hasMore,
  };
}
