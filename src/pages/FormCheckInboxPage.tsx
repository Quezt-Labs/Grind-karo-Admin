import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Video } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import {
  FormCheckInboxAthleteList,
  FormCheckInboxTierTabs,
} from "@/components/form-check/FormCheckInboxAthleteList";
import { FormCheckInboxAthleteHeader } from "@/components/form-check/FormCheckInboxAthleteHeader";
import { FormCheckInboxExerciseList } from "@/components/form-check/FormCheckInboxExerciseList";
import { FormCheckQuotaBanner } from "@/components/form-check/FormCheckQuotaBanner";
import { FormCheckWeekFilterBar } from "@/components/form-check/FormCheckWeekFilterBar";
import { FormCheckDayFilterBar } from "@/components/form-check/FormCheckDayFilterBar";
import { FormCheckFeedbackHistory } from "@/components/form-check/FormCheckFeedbackHistory";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { formCheckKeys } from "@/hooks/formCheckQueryKeys";
import {
  useFormCheckAthletes,
  useFormCheckVideoDays,
  useFormCheckVideoWeeks,
  useFormCheckVideos,
} from "@/hooks/useFormCheckInbox";
import { useFormCheckMutations } from "@/hooks/useFormCheckMutations";
import { useFormCheckInboxRoute } from "@/hooks/useFormCheckInboxRoute";
import type { FormCheckInboxAthlete } from "@/services/formCheckInboxService";
import { userService } from "@/services/userService";
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
} from "@/utils/formCheckWeekUtils";
import { sortFeedbackVideos } from "@/utils/formCheckReview";

function athleteLabel(
  athlete: Pick<FormCheckInboxAthlete, "userName" | "userEmail">,
) {
  return athlete.userName?.trim() || athlete.userEmail;
}

function filterAthletesByHandler(
  athletes: FormCheckInboxAthlete[],
  handlerFilter: "all" | "assistant_coach" | "admin",
) {
  if (handlerFilter === "all") return athletes;
  return athletes.filter((a) => a.formCheckHandler === handlerFilter);
}

export function FormCheckInboxPage() {
  const route = useFormCheckInboxRoute();
  const {
    tier: planTier,
    selectedUserId,
    reviewFilter,
    layout,
    handlerFilter,
    weekNumber,
    dayNumber,
    setPlanTier,
    setSelectedUserId,
    setReviewFilter,
    setLayout,
    setHandlerFilter,
    setWeekNumber,
    setDayNumber,
    clearAthleteSelection,
  } = route;

  const { data: athletesData, isLoading: athletesLoading } =
    useFormCheckAthletes(reviewFilter);

  const { data: weekOptions = [] } = useFormCheckVideoWeeks({
    userId: selectedUserId,
    reviewFilter,
    enabled: !!selectedUserId,
  });

  const { data: dayOptions = [] } = useFormCheckVideoDays({
    userId: selectedUserId,
    reviewFilter,
    weekNumber,
    enabled: !!selectedUserId,
  });

  const {
    isLoading: videosLoading,
    videos,
    exerciseGroups,
    pendingTargets,
    reviewedSetCount,
    pendingExerciseCount,
    totalSetCount,
    hasMore,
  } = useFormCheckVideos({
    userId: selectedUserId,
    reviewFilter,
    weekNumber,
    dayNumber,
    enabled: !!selectedUserId,
  });

  const { bulkApply } = useFormCheckMutations(selectedUserId ?? undefined);

  const feedbackCount = useMemo(
    () => sortFeedbackVideos(videos).length,
    [videos],
  );

  const showFeedbackLog = reviewFilter !== "pending" && layout === "feedback";

  const { data: purchasesData } = useQuery({
    queryKey: formCheckKeys.purchases(selectedUserId ?? ""),
    queryFn: () => userService.getPurchases(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const selectedAthlete = useMemo(() => {
    if (!selectedUserId || !athletesData) return null;
    const all = [...athletesData.mega, ...athletesData.ultra];
    return all.find((a) => a.userId === selectedUserId) ?? null;
  }, [athletesData, selectedUserId]);

  const megaAthletes = athletesData?.mega ?? [];
  const ultraAthletes = athletesData?.ultra ?? [];
  const tierAthletes = planTier === "mega" ? megaAthletes : ultraAthletes;

  const handlerCounts = useMemo(
    () => ({
      all: tierAthletes.length,
      assistant_coach: tierAthletes.filter(
        (a) => a.formCheckHandler === "assistant_coach",
      ).length,
      admin: tierAthletes.filter((a) => a.formCheckHandler === "admin").length,
    }),
    [tierAthletes],
  );

  const megaPending = megaAthletes.reduce((sum, a) => sum + a.pendingCount, 0);
  const ultraPending = ultraAthletes.reduce(
    (sum, a) => sum + a.pendingCount,
    0,
  );
  const globalPending = megaPending + ultraPending;
  const tierPending = planTier === "mega" ? megaPending : ultraPending;

  const filteredQueue = useMemo(
    () => filterAthletesByHandler(tierAthletes, handlerFilter),
    [tierAthletes, handlerFilter],
  );

  const nextAthleteInQueue = useMemo(() => {
    if (!selectedUserId) return null;
    const index = filteredQueue.findIndex((a) => a.userId === selectedUserId);
    if (index < 0) return filteredQueue[0] ?? null;
    return filteredQueue[index + 1] ?? null;
  }, [filteredQueue, selectedUserId]);

  const subtitle = useMemo(() => {
    if (selectedUserId && selectedAthlete) {
      const weekLabel =
        weekNumber != null ? ` · ${formatProgramWeekLabel(weekNumber)}` : "";
      const dayLabel =
        dayNumber != null ? ` · ${formatProgramDayLabel(dayNumber)}` : "";
      const scopeLabel = `${weekLabel}${dayLabel}`;
      if (reviewFilter === "pending") {
        const exercises = exerciseGroups.length;
        return exercises > 0
          ? `${pendingTargets.length} set video${pendingTargets.length === 1 ? "" : "s"} across ${exercises} exercise${exercises === 1 ? "" : "s"}${scopeLabel}`
          : `No videos waiting for review${scopeLabel}`;
      }
      if (reviewFilter === "reviewed") {
        return totalSetCount > 0
          ? `${totalSetCount} reviewed set video${totalSetCount === 1 ? "" : "s"}${scopeLabel}`
          : `No reviewed videos${scopeLabel}`;
      }
      return `${totalSetCount || selectedAthlete.totalCount} form-check video${(totalSetCount || selectedAthlete.totalCount) === 1 ? "" : "s"}${scopeLabel}`;
    }
    if (globalPending === 0) {
      return "All caught up — no videos waiting for review";
    }
    return `${globalPending} video${globalPending === 1 ? "" : "s"} waiting for review`;
  }, [
    selectedUserId,
    selectedAthlete,
    reviewFilter,
    globalPending,
    weekNumber,
    dayNumber,
    exerciseGroups.length,
    pendingTargets.length,
    totalSetCount,
  ]);

  const handleBulkApply = useCallback(
    (comment: string) => bulkApply(pendingTargets, comment),
    [bulkApply, pendingTargets],
  );

  const handleAllPendingReviewed = useCallback(() => {
    const name = selectedAthlete ? athleteLabel(selectedAthlete) : "Athlete";
    toast.success(`All caught up for ${name}`);
  }, [selectedAthlete]);

  const goToNextAthlete = useCallback(() => {
    if (nextAthleteInQueue) {
      setSelectedUserId(nextAthleteInQueue.userId);
      return;
    }
    clearAthleteSelection();
    toast("No more athletes in this queue", { icon: "✓" });
  }, [nextAthleteInQueue, setSelectedUserId, clearAthleteSelection]);

  return (
    <div>
      <PageHeader title="Form Check Inbox" description={subtitle} />

      <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <FormCheckInboxTierTabs
          planTier={planTier}
          megaAthletes={megaAthletes}
          ultraAthletes={ultraAthletes}
          megaPending={megaPending}
          ultraPending={ultraPending}
          onPlanChange={setPlanTier}
        />
      </div>

      {selectedUserId ? (
        <div className="space-y-4">
          <FormCheckInboxAthleteHeader
            planTier={planTier}
            selectedUserId={selectedUserId}
            selectedAthlete={selectedAthlete}
            reviewFilter={reviewFilter}
            reviewedSetCount={reviewedSetCount}
            totalSetCount={totalSetCount}
            pendingExerciseCount={pendingExerciseCount}
            totalExerciseCount={exerciseGroups.length}
            onBack={clearAthleteSelection}
            onReviewFilterChange={setReviewFilter}
            selectedWeek={weekNumber}
            selectedDay={dayNumber}
            layout={layout}
            feedbackCount={feedbackCount}
            onLayoutChange={setLayout}
          />

          {weekOptions.length > 0 ? (
            <FormCheckWeekFilterBar
              weeks={weekOptions}
              selectedWeek={weekNumber}
              onChange={setWeekNumber}
            />
          ) : null}

          {dayOptions.length > 0 ? (
            <FormCheckDayFilterBar
              days={dayOptions}
              selectedDay={dayNumber}
              onChange={setDayNumber}
            />
          ) : null}

          {purchasesData?.formCheckQuota ? (
            <FormCheckQuotaBanner quota={purchasesData.formCheckQuota} />
          ) : null}

          {pendingTargets.length === 0 &&
          reviewFilter === "pending" &&
          !videosLoading ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950/30">
              <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                All caught up for{" "}
                {selectedAthlete
                  ? athleteLabel(selectedAthlete)
                  : "this athlete"}
                .
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReviewFilter("reviewed");
                    setLayout("feedback");
                  }}
                  className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-gray-900 dark:text-indigo-300"
                >
                  View reviewed feedback
                </button>
                {nextAthleteInQueue ? (
                  <button
                    type="button"
                    onClick={goToNextAthlete}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Next in queue — {athleteLabel(nextAthleteInQueue)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={clearAthleteSelection}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  >
                    Back to athlete list
                  </button>
                )}
              </div>
            </div>
          ) : null}

          {videosLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : showFeedbackLog ? (
            <FormCheckFeedbackHistory
              videos={videos}
              onWatchVideo={() => setLayout("videos")}
              emptyMessage={
                reviewFilter === "reviewed"
                  ? "No coach feedback for this athlete yet."
                  : "No coach comments in the current filter."
              }
            />
          ) : videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <Video className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {reviewFilter === "pending"
                  ? weekNumber != null || dayNumber != null
                    ? `No videos waiting for review${weekNumber != null ? ` in ${formatProgramWeekLabel(weekNumber)}` : ""}${dayNumber != null ? ` on ${formatProgramDayLabel(dayNumber)}` : ""}.`
                    : "No videos waiting for review for this athlete."
                  : reviewFilter === "reviewed"
                    ? weekNumber != null || dayNumber != null
                      ? `No reviewed videos${weekNumber != null ? ` in ${formatProgramWeekLabel(weekNumber)}` : ""}${dayNumber != null ? ` on ${formatProgramDayLabel(dayNumber)}` : ""}.`
                      : "No reviewed form-check videos for this athlete yet."
                    : weekNumber != null || dayNumber != null
                      ? `No form-check videos${weekNumber != null ? ` in ${formatProgramWeekLabel(weekNumber)}` : ""}${dayNumber != null ? ` on ${formatProgramDayLabel(dayNumber)}` : ""}.`
                      : "No form-check videos for this athlete yet."}
              </p>
            </div>
          ) : (
            <>
              {hasMore ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    Showing first 100 videos. Use &ldquo;Needs review&rdquo; to
                    narrow the list, or contact engineering if more pagination
                    is needed.
                  </p>
                </div>
              ) : null}

              <div className="-mx-1 px-1 pb-2 pt-1">
                <BulkFormCheckCommentBar
                  pendingCount={pendingTargets.length}
                  onApply={handleBulkApply}
                  sticky
                  stickyTopClassName="top-0"
                />
              </div>

              <FormCheckInboxExerciseList
                listKey={`${selectedUserId}-${reviewFilter}-${weekNumber ?? "all"}-${dayNumber ?? "all"}`}
                exerciseGroups={exerciseGroups}
                pendingCount={pendingTargets.length}
                onBulkApply={handleBulkApply}
                hasMore={false}
                onAllPendingReviewed={handleAllPendingReviewed}
                showBulkBar={false}
              />
            </>
          )}
        </div>
      ) : (
        <FormCheckInboxAthleteList
          planTier={planTier}
          tierAthletes={tierAthletes}
          reviewFilter={reviewFilter}
          handlerFilter={handlerFilter}
          handlerCounts={handlerCounts}
          tierPending={tierPending}
          isLoading={athletesLoading}
          onSelectAthlete={setSelectedUserId}
          onReviewFilterChange={setReviewFilter}
          onHandlerFilterChange={setHandlerFilter}
        />
      )}
    </div>
  );
}
