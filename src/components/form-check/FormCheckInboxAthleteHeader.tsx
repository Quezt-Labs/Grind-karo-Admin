import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { FormCheckHandlerBadge } from "@/components/form-check/FormCheckHandlerBadge";
import { ReviewFilterBar } from "@/components/form-check/FormCheckInboxAthleteList";
import type { FormCheckInboxAthlete } from "@/services/formCheckInboxService";
import type { PlanTier, ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import { FormCheckWeekBadge } from "@/components/form-check/FormCheckWeekFilterBar";
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
} from "@/utils/formCheckWeekUtils";
import { cn } from "@/utils/cn";

function athleteLabel(
  athlete: Pick<FormCheckInboxAthlete, "userName" | "userEmail">,
) {
  return athlete.userName?.trim() || athlete.userEmail;
}

export function FormCheckInboxAthleteHeader({
  planTier,
  selectedUserId,
  selectedAthlete,
  reviewFilter,
  reviewedSetCount,
  totalSetCount,
  pendingExerciseCount,
  totalExerciseCount,
  onBack,
  onReviewFilterChange,
  selectedWeek = null,
  selectedDay = null,
}: {
  planTier: PlanTier;
  selectedUserId: string;
  selectedAthlete: FormCheckInboxAthlete | null;
  reviewFilter: ReviewFilter;
  reviewedSetCount: number;
  totalSetCount: number;
  pendingExerciseCount: number;
  totalExerciseCount: number;
  onBack: () => void;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  selectedWeek?: number | null;
  selectedDay?: number | null;
}) {
  const progressPct =
    totalSetCount > 0
      ? Math.round((reviewedSetCount / totalSetCount) * 100)
      : 0;
  const exercisesLeft = pendingExerciseCount;

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {planTier.toUpperCase()} queue
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {selectedAthlete ? (
            <FormCheckHandlerBadge
              formCheckHandler={selectedAthlete.formCheckHandler}
              formCheckCoachName={selectedAthlete.formCheckCoachName}
              size="md"
            />
          ) : null}
          <Link
            to={`/users/${selectedUserId}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {selectedAthlete
              ? athleteLabel(selectedAthlete)
              : "Athlete profile"}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <ReviewFilterBar
            filter={reviewFilter}
            onChange={onReviewFilterChange}
            pendingCount={selectedAthlete?.pendingCount}
          />
        </div>
      </div>

      {selectedWeek != null || selectedDay != null ? (
        <div className="flex flex-wrap items-center gap-2">
          {selectedWeek != null ? (
            <FormCheckWeekBadge weekNumber={selectedWeek} />
          ) : null}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Showing
            {selectedWeek != null
              ? ` ${formatProgramWeekLabel(selectedWeek)}`
              : ""}
            {selectedDay != null
              ? `${selectedWeek != null ? " ·" : ""} ${formatProgramDayLabel(selectedDay)}`
              : ""}{" "}
            only
          </span>
        </div>
      ) : null}

      {totalSetCount > 0 ? (
        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {reviewedSetCount}
              </span>
              {" / "}
              {totalSetCount} sets reviewed
              {exercisesLeft > 0
                ? ` · ${exercisesLeft} exercise${exercisesLeft === 1 ? "" : "s"} left`
                : " · all exercises reviewed"}
            </span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                progressPct === 100 ? "bg-emerald-500" : "bg-indigo-500",
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {totalExerciseCount > 0 ? (
            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
              {totalExerciseCount} exercise{totalExerciseCount === 1 ? "" : "s"}{" "}
              in current view
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
