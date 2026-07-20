import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Search, Video, X } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import {
  FormCheckInboxAthleteList,
  FormCheckInboxTierTabs,
} from "@/components/form-check/FormCheckInboxAthleteList";
import { FormCheckInboxAthleteHeader } from "@/components/form-check/FormCheckInboxAthleteHeader";
import { FormCheckInboxExerciseList } from "@/components/form-check/FormCheckInboxExerciseList";
import { FormCheckMissingList } from "@/components/form-check/FormCheckMissingList";
import { FormCheckQuotaBanner } from "@/components/form-check/FormCheckQuotaBanner";
import { FormCheckWeekFilterBar } from "@/components/form-check/FormCheckWeekFilterBar";
import { FormCheckDayFilterBar } from "@/components/form-check/FormCheckDayFilterBar";
import { FormCheckFeedbackHistory } from "@/components/form-check/FormCheckFeedbackHistory";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import {
  FORM_CHECK_VIDEO_LIMIT,
  formCheckKeys,
} from "@/hooks/formCheckQueryKeys";
import {
  useFormCheckAthletes,
  useFormCheckVideoDays,
  useFormCheckVideoWeeks,
  useFormCheckVideos,
} from "@/hooks/useFormCheckInbox";
import { useFormCheckMutations } from "@/hooks/useFormCheckMutations";
import { useFormCheckInboxRoute } from "@/hooks/useFormCheckInboxRoute";
import type { FormCheckInboxAthlete } from "@/services/formCheckInboxService";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import { userService } from "@/services/userService";
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
} from "@/utils/formCheckWeekUtils";
import { sortFeedbackVideos } from "@/utils/formCheckReview";
import { cn } from "@/utils/cn";

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
    view,
    tier: planTier,
    selectedUserId,
    focusVideoId,
    reviewFilter,
    layout,
    handlerFilter,
    weekNumber,
    dayNumber,
    setView,
    setPlanTier,
    setSelectedUserId,
    setReviewFilter,
    setLayout,
    setHandlerFilter,
    setWeekNumber,
    setDayNumber,
    clearAthleteSelection,
  } = route;

  const isMissingView = view === "missing";
  const [exerciseSearch, setExerciseSearch] = useState("");

  // Reset pagination whenever the filter/scope changes. Handled during render
  // (not an effect) to avoid a cascading re-render.
  const [pageSize, setPageSize] = useState(FORM_CHECK_VIDEO_LIMIT);
  const scopeKey = `${reviewFilter}|${weekNumber ?? "all"}|${dayNumber ?? "all"}|${selectedUserId ?? "none"}`;
  const [prevScopeKey, setPrevScopeKey] = useState(scopeKey);
  if (scopeKey !== prevScopeKey) {
    setPrevScopeKey(scopeKey);
    setPageSize(FORM_CHECK_VIDEO_LIMIT);
  }

  const { data: athletesData, isLoading: athletesLoading } =
    useFormCheckAthletes(reviewFilter);

  const { data: missingData, isLoading: missingLoading } = useQuery({
    queryKey: formCheckKeys.missing(),
    queryFn: () => formCheckInboxService.listMissing(),
    enabled: isMissingView,
  });

  const { data: weekModel } = useFormCheckVideoWeeks({
    userId: selectedUserId,
    reviewFilter,
    enabled: !!selectedUserId && !isMissingView,
  });

  const { data: dayModel } = useFormCheckVideoDays({
    userId: selectedUserId,
    reviewFilter,
    weekNumber,
    enabled: !!selectedUserId && !isMissingView,
  });

  const {
    isLoading: videosLoading,
    isFetching: videosFetching,
    videos,
    exerciseGroups,
    pendingTargets,
    reviewedSetCount,
    pendingSetCount,
    pendingExerciseCount,
    totalSetCount,
    hasMore,
  } = useFormCheckVideos({
    userId: selectedUserId,
    reviewFilter,
    weekNumber,
    dayNumber,
    limit: pageSize,
    enabled: !!selectedUserId && !isMissingView,
  });

  const { bulkApply } = useFormCheckMutations(selectedUserId ?? undefined);

  // Deep-linked video may already be reviewed — widen filter so it can surface.
  useEffect(() => {
    if (!focusVideoId || !selectedUserId || videosLoading) return;
    const found = videos.some((v) => v.id === focusVideoId);
    if (!found && reviewFilter === "pending") {
      setReviewFilter("all");
    }
  }, [
    focusVideoId,
    selectedUserId,
    videos,
    videosLoading,
    reviewFilter,
    setReviewFilter,
  ]);

  const filteredExerciseGroups = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    if (!q) return exerciseGroups;
    return exerciseGroups.filter((g) =>
      g.representative.exerciseName.toLowerCase().includes(q),
    );
  }, [exerciseGroups, exerciseSearch]);

  const feedbackCount = useMemo(
    () => sortFeedbackVideos(videos).length,
    [videos],
  );

  const showFeedbackLog = reviewFilter !== "pending" && layout === "feedback";

  const { data: purchasesData } = useQuery({
    queryKey: formCheckKeys.purchases(selectedUserId ?? ""),
    queryFn: () => userService.getPurchases(selectedUserId!),
    enabled: !!selectedUserId && !isMissingView,
  });

  const selectedAthlete = useMemo(() => {
    if (!selectedUserId || !athletesData) return null;
    const all = [...athletesData.mega, ...athletesData.ultra];
    return all.find((a) => a.userId === selectedUserId) ?? null;
  }, [athletesData, selectedUserId]);

  const megaAthletes = useMemo(
    () => athletesData?.mega ?? [],
    [athletesData?.mega],
  );
  const ultraAthletes = useMemo(
    () => athletesData?.ultra ?? [],
    [athletesData?.ultra],
  );
  const tierAthletes = planTier === "mega" ? megaAthletes : ultraAthletes;

  const missingMega = missingData?.mega ?? [];
  const missingUltra = missingData?.ultra ?? [];
  const missingTierAthletes = planTier === "mega" ? missingMega : missingUltra;
  const missingTotal = missingData?.total ?? 0;

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
    if (isMissingView) {
      return missingTotal === 0
        ? "All due athletes have uploaded this week"
        : `${missingTotal} athlete${missingTotal === 1 ? "" : "s"} missing a form-check upload this week`;
    }
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
    isMissingView,
    missingTotal,
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

  const handleSelectAthlete = useCallback(
    (userId: string | null) => {
      if (!userId) {
        setSelectedUserId(null);
        setExerciseSearch("");
        return;
      }
      const all = [...megaAthletes, ...ultraAthletes];
      const athlete = all.find((a) => a.userId === userId);
      setSelectedUserId(userId);
      setExerciseSearch("");
      // Fully-reviewed athletes have nothing under "Needs review" — show history.
      if (
        athlete &&
        athlete.pendingCount === 0 &&
        athlete.totalCount > 0 &&
        reviewFilter === "pending"
      ) {
        setReviewFilter("all");
      }
    },
    [
      megaAthletes,
      ultraAthletes,
      setSelectedUserId,
      setReviewFilter,
      reviewFilter,
    ],
  );

  const goToNextAthlete = useCallback(() => {
    if (nextAthleteInQueue) {
      handleSelectAthlete(nextAthleteInQueue.userId);
      return;
    }
    clearAthleteSelection();
    toast("No more athletes in this queue", { icon: "✓" });
  }, [nextAthleteInQueue, handleSelectAthlete, clearAthleteSelection]);

  return (
    <div>
      <PageHeader title="Form Check Inbox" description={subtitle} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            { value: "inbox" as const, label: "Inbox" },
            {
              value: "missing" as const,
              label: "Missing",
              count: isMissingView ? missingTotal : undefined,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setView(tab.value)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              view === tab.value
                ? "bg-indigo-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
            )}
          >
            {tab.label}
            {"count" in tab && tab.count != null && tab.count > 0 ? (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs font-bold",
                  view === tab.value
                    ? "bg-white/20 text-white"
                    : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="mb-4 border-b border-gray-200 pb-4 dark:border-gray-700">
        <FormCheckInboxTierTabs
          planTier={planTier}
          megaAthletes={isMissingView ? missingMega : megaAthletes}
          ultraAthletes={isMissingView ? missingUltra : ultraAthletes}
          megaPending={isMissingView ? missingMega.length : megaPending}
          ultraPending={isMissingView ? missingUltra.length : ultraPending}
          pendingLabel={isMissingView ? "missing" : "pending"}
          onPlanChange={setPlanTier}
        />
      </div>

      {isMissingView ? (
        <FormCheckMissingList
          planTier={planTier}
          athletes={missingTierAthletes}
          isLoading={missingLoading}
        />
      ) : selectedUserId ? (
        <div className="space-y-4">
          <FormCheckInboxAthleteHeader
            planTier={planTier}
            selectedUserId={selectedUserId}
            selectedAthlete={selectedAthlete}
            reviewFilter={reviewFilter}
            reviewedSetCount={reviewedSetCount}
            totalSetCount={totalSetCount}
            pendingSetCount={pendingSetCount}
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

          {weekModel && (weekModel.weeks.length > 0 || weekModel.unscoped) ? (
            <FormCheckWeekFilterBar
              model={weekModel}
              selectedWeek={weekNumber}
              onChange={setWeekNumber}
            />
          ) : null}

          {dayModel && (dayModel.days.length > 0 || dayModel.unscoped) ? (
            <FormCheckDayFilterBar
              model={dayModel}
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
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>
                      More videos available. Use &ldquo;Needs review&rdquo; to
                      narrow the list, or load more.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPageSize((n) => n + FORM_CHECK_VIDEO_LIMIT)
                    }
                    disabled={videosFetching}
                    className="shrink-0 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/70"
                  >
                    {videosFetching ? "Loading…" : "Load more"}
                  </button>
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

              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={exerciseSearch}
                  onChange={(e) => setExerciseSearch(e.target.value)}
                  placeholder="Filter exercises by name…"
                  className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                />
                {exerciseSearch ? (
                  <button
                    type="button"
                    onClick={() => setExerciseSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                    aria-label="Clear exercise filter"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {filteredExerciseGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No exercises match &ldquo;{exerciseSearch}&rdquo;.
                  </p>
                </div>
              ) : (
                <FormCheckInboxExerciseList
                  listKey={`${selectedUserId}-${reviewFilter}-${weekNumber ?? "all"}-${dayNumber ?? "all"}-${exerciseSearch}`}
                  exerciseGroups={filteredExerciseGroups}
                  pendingCount={pendingTargets.length}
                  onBulkApply={handleBulkApply}
                  hasMore={false}
                  onAllPendingReviewed={handleAllPendingReviewed}
                  showBulkBar={false}
                  focusVideoId={focusVideoId}
                />
              )}
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
          onSelectAthlete={handleSelectAthlete}
          onReviewFilterChange={setReviewFilter}
          onHandlerFilterChange={setHandlerFilter}
        />
      )}
    </div>
  );
}
