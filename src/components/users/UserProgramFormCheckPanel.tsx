import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video } from "lucide-react";
import { FormCheckInboxExerciseList } from "@/components/form-check/FormCheckInboxExerciseList";
import { FormCheckHandlerBadge } from "@/components/form-check/FormCheckHandlerBadge";
import { FormCheckQuotaBanner } from "@/components/form-check/FormCheckQuotaBanner";
import { FormCheckWeekFilterBar } from "@/components/form-check/FormCheckWeekFilterBar";
import { FormCheckDayFilterBar } from "@/components/form-check/FormCheckDayFilterBar";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { formCheckKeys } from "@/hooks/formCheckQueryKeys";
import {
  useFormCheckVideoDays,
  useFormCheckVideoWeeks,
  useFormCheckVideos,
} from "@/hooks/useFormCheckInbox";
import { useFormCheckMutations } from "@/hooks/useFormCheckMutations";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import type { FormCheckQuota, Purchase } from "@/types/user";
import { FormCheckBillingControls } from "@/components/users/FormCheckBillingControls";
import type { FormCheckHandlerInfo } from "@/utils/formCheckHandler";
import type { ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
} from "@/utils/formCheckWeekUtils";

type UserReviewFilter = ReviewFilter;

function resolveFormCheckHandlerFromAssignment(
  assignment: Awaited<
    ReturnType<typeof athleteAssignmentService.getByAthleteId>
  > | null,
): FormCheckHandlerInfo {
  if (
    assignment?.formCheckEnabled &&
    assignment.assistantCoachId &&
    assignment.assistantCoach
  ) {
    return {
      formCheckHandler: "assistant_coach",
      formCheckCoachId: assignment.assistantCoachId,
      formCheckCoachName:
        assignment.assistantCoach.name?.trim() ||
        assignment.assistantCoach.email,
    };
  }
  return {
    formCheckHandler: "admin",
    formCheckCoachId: null,
    formCheckCoachName: null,
  };
}

interface UserProgramFormCheckPanelProps {
  userId: string;
  formCheckQuota?: FormCheckQuota;
  purchases?: Purchase[];
  showBilling?: boolean;
  onBillingUpdated?: () => void;
}

export function UserProgramFormCheckPanel({
  userId,
  formCheckQuota: formCheckQuotaProp,
  purchases = [],
  showBilling = false,
  onBillingUpdated,
}: UserProgramFormCheckPanelProps) {
  const [reviewFilter, setReviewFilter] = useState<UserReviewFilter>("pending");
  const [weekNumber, setWeekNumber] = useState<number | null>(null);
  const [dayNumber, setDayNumber] = useState<number | null>(null);

  const { data: weekOptions = [] } = useFormCheckVideoWeeks({
    userId,
    reviewFilter,
  });

  const { data: dayOptions = [] } = useFormCheckVideoDays({
    userId,
    reviewFilter,
    weekNumber,
  });

  const { isLoading, videos, exerciseGroups, pendingTargets, hasMore } =
    useFormCheckVideos({
      userId,
      reviewFilter,
      weekNumber,
      dayNumber,
    });

  const { bulkApply } = useFormCheckMutations(userId);

  const { data: assignment } = useQuery({
    queryKey: formCheckKeys.assignment(userId),
    queryFn: () => athleteAssignmentService.getByAthleteId(userId),
  });

  const handlerInfo = useMemo(
    () => resolveFormCheckHandlerFromAssignment(assignment ?? null),
    [assignment],
  );

  const handleBulkApply = async (comment: string) =>
    bulkApply(pendingTargets, comment);

  const quota = formCheckQuotaProp;

  return (
    <div>
      {showBilling && (
        <FormCheckBillingControls
          userId={userId}
          purchases={purchases}
          onUpdated={onBillingUpdated}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Video className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Form-check review
        </h2>
        {!isLoading ? (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {videos.length}
            {reviewFilter === "all" && pendingTargets.length > 0
              ? ` · ${pendingTargets.length} pending`
              : ""}
          </span>
        ) : null}
        <FormCheckHandlerBadge {...handlerInfo} size="md" />
        <div className="ml-auto">
          <Select
            className="h-8 w-36 text-xs"
            options={[
              { value: "pending", label: "Needs review" },
              { value: "reviewed", label: "Reviewed" },
              { value: "all", label: "All videos" },
            ]}
            value={reviewFilter}
            onValueChange={(v) => setReviewFilter(v as UserReviewFilter)}
          />
        </div>
      </div>

      {quota?.weeklyLimit != null ? (
        <div className="mb-3">
          <FormCheckQuotaBanner quota={quota} />
        </div>
      ) : null}

      {weekOptions.length > 0 ? (
        <div className="mb-4">
          <FormCheckWeekFilterBar
            weeks={weekOptions}
            selectedWeek={weekNumber}
            onChange={setWeekNumber}
          />
        </div>
      ) : null}

      {dayOptions.length > 0 ? (
        <div className="mb-4">
          <FormCheckDayFilterBar
            days={dayOptions}
            selectedDay={dayNumber}
            onChange={setDayNumber}
          />
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          {reviewFilter === "pending"
            ? weekNumber != null || dayNumber != null
              ? `No videos waiting for review${weekNumber != null ? ` in ${formatProgramWeekLabel(weekNumber)}` : ""}${dayNumber != null ? ` on ${formatProgramDayLabel(dayNumber)}` : ""}.`
              : "No program form-check videos waiting for review."
            : reviewFilter === "reviewed"
              ? weekNumber != null || dayNumber != null
                ? `No reviewed videos${weekNumber != null ? ` in ${formatProgramWeekLabel(weekNumber)}` : ""}${dayNumber != null ? ` on ${formatProgramDayLabel(dayNumber)}` : ""}.`
                : "No reviewed form-check videos yet."
              : weekNumber != null || dayNumber != null
                ? `No form-check videos${weekNumber != null ? ` in ${formatProgramWeekLabel(weekNumber)}` : ""}${dayNumber != null ? ` on ${formatProgramDayLabel(dayNumber)}` : ""}.`
                : "No program form-check videos uploaded yet."}
        </div>
      ) : (
        <FormCheckInboxExerciseList
          listKey={`${userId}-${reviewFilter}-${weekNumber ?? "all"}-${dayNumber ?? "all"}`}
          exerciseGroups={exerciseGroups}
          pendingCount={pendingTargets.length}
          onBulkApply={handleBulkApply}
          hasMore={hasMore}
          bulkBarStickyTopClassName="top-0"
        />
      )}
    </div>
  );
}
