import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, User, Video } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckInboxExerciseList } from "@/components/form-check/FormCheckInboxExerciseList";
import { FormCheckHandlerBadge } from "@/components/form-check/FormCheckHandlerBadge";
import {
  formCheckInboxService,
  type FormCheckInboxAthlete,
} from "@/services/formCheckInboxService";
import { bulkUpsertFormCheckComments } from "@/utils/bulkFormCheckComments";
import { pendingTargetsForVideos } from "@/utils/formCheckCommentTargets";
import { groupFormCheckInboxItems } from "@/utils/groupFormCheckInboxItems";
import { cn } from "@/utils/cn";

type PlanTier = "mega" | "ultra";
type ReviewFilter = "pending" | "all";
type HandlerFilter = "all" | "assistant_coach" | "admin";

function athleteLabel(
  athlete: Pick<FormCheckInboxAthlete, "userName" | "userEmail">,
) {
  return athlete.userName?.trim() || athlete.userEmail;
}

function ReviewFilterBar({
  filter,
  onChange,
  pendingCount,
}: {
  filter: ReviewFilter;
  onChange: (next: ReviewFilter) => void;
  pendingCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("pending")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          filter === "pending"
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
        )}
      >
        Needs review
        {pendingCount != null && pendingCount > 0 && (
          <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
            {pendingCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange("all")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          filter === "all"
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
        )}
      >
        All videos
      </button>
    </div>
  );
}

function AthleteRow({
  athlete,
  onSelect,
}: {
  athlete: FormCheckInboxAthlete;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {athleteLabel(athlete)}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {athlete.userEmail}
        </p>
        <div className="mt-1.5">
          <FormCheckHandlerBadge
            formCheckHandler={athlete.formCheckHandler}
            formCheckCoachName={athlete.formCheckCoachName}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {athlete.pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            {athlete.pendingCount} pending
          </span>
        ) : (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {athlete.totalCount} video{athlete.totalCount === 1 ? "" : "s"}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </button>
  );
}

function HandlerFilterBar({
  filter,
  onChange,
  counts,
}: {
  filter: HandlerFilter;
  onChange: (next: HandlerFilter) => void;
  counts: { all: number; assistant_coach: number; admin: number };
}) {
  const options: { value: HandlerFilter; label: string }[] = [
    { value: "all", label: `All (${counts.all})` },
    {
      value: "assistant_coach",
      label: `Assistant coach (${counts.assistant_coach})`,
    },
    { value: "admin", label: `Admin (${counts.admin})` },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            filter === opt.value
              ? "bg-violet-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FormCheckInboxPage() {
  const queryClient = useQueryClient();
  const [planTier, setPlanTier] = useState<PlanTier>("mega");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("pending");
  const [handlerFilter, setHandlerFilter] = useState<HandlerFilter>("all");

  const { data: athletesData, isLoading: athletesLoading } = useQuery({
    queryKey: ["form-check-inbox-athletes", reviewFilter],
    queryFn: () =>
      formCheckInboxService.listAthletes({
        uncommentedOnly: reviewFilter === "pending",
      }),
  });

  const selectedAthlete = useMemo(() => {
    if (!selectedUserId || !athletesData) return null;
    const all = [...athletesData.mega, ...athletesData.ultra];
    return all.find((a) => a.userId === selectedUserId) ?? null;
  }, [athletesData, selectedUserId]);

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["form-check-inbox", reviewFilter, selectedUserId],
    queryFn: () =>
      formCheckInboxService.list({
        userId: selectedUserId!,
        uncommentedOnly: reviewFilter === "pending",
        limit: 100,
      }),
    enabled: !!selectedUserId,
  });

  const megaAthletes = athletesData?.mega ?? [];
  const ultraAthletes = athletesData?.ultra ?? [];
  const tierAthletes = planTier === "mega" ? megaAthletes : ultraAthletes;

  const handlerCounts = useMemo(() => {
    return {
      all: tierAthletes.length,
      assistant_coach: tierAthletes.filter(
        (a) => a.formCheckHandler === "assistant_coach",
      ).length,
      admin: tierAthletes.filter((a) => a.formCheckHandler === "admin").length,
    };
  }, [tierAthletes]);

  const filteredTierAthletes = useMemo(() => {
    if (handlerFilter === "all") return tierAthletes;
    return tierAthletes.filter((a) => a.formCheckHandler === handlerFilter);
  }, [tierAthletes, handlerFilter]);

  const megaPending = megaAthletes.reduce((sum, a) => sum + a.pendingCount, 0);
  const ultraPending = ultraAthletes.reduce(
    (sum, a) => sum + a.pendingCount,
    0,
  );
  const globalPending = megaPending + ultraPending;

  const videos = useMemo(() => videosData?.items ?? [], [videosData?.items]);
  const exerciseGroups = useMemo(
    () => groupFormCheckInboxItems(videos),
    [videos],
  );

  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(videos),
    [videos],
  );

  const subtitle = useMemo(() => {
    if (selectedUserId && selectedAthlete) {
      if (reviewFilter === "pending") {
        const exercises = exerciseGroups.length;
        return exercises > 0
          ? `${pendingTargets.length} set video${pendingTargets.length === 1 ? "" : "s"} across ${exercises} exercise${exercises === 1 ? "" : "s"}`
          : "No videos waiting for review";
      }
      return `${selectedAthlete.totalCount} form-check video${selectedAthlete.totalCount === 1 ? "" : "s"} total`;
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
    exerciseGroups.length,
    pendingTargets.length,
  ]);

  const handlePlanChange = (tier: PlanTier) => {
    setPlanTier(tier);
    setSelectedUserId(null);
    setHandlerFilter("all");
  };

  const handleReviewFilterChange = (next: ReviewFilter) => {
    setReviewFilter(next);
    if (next === "pending") setSelectedUserId(null);
  };

  const handleBulkApply = async (comment: string) => {
    const result = await bulkUpsertFormCheckComments(pendingTargets, comment);
    if (result.succeeded > 0) {
      void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
      void queryClient.invalidateQueries({
        queryKey: ["form-check-inbox-athletes"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["form-check-pending-count"],
      });
    }
    return result;
  };

  return (
    <div>
      <PageHeader title="Form Check Inbox" description={subtitle} />

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
        {(["mega", "ultra"] as const).map((tier) => {
          const pending = tier === "mega" ? megaPending : ultraPending;
          const count =
            tier === "mega" ? megaAthletes.length : ultraAthletes.length;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => handlePlanChange(tier)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors",
                planTier === tier
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
              )}
            >
              {tier}
              <span className="ml-2 text-xs font-medium opacity-80">
                {count} athlete{count === 1 ? "" : "s"}
                {pending > 0 ? ` · ${pending} pending` : ""}
              </span>
            </button>
          );
        })}
      </div>

      {selectedUserId ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {planTier.toUpperCase()} athletes
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
                className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {selectedAthlete
                  ? athleteLabel(selectedAthlete)
                  : "Athlete profile"}
              </Link>
              <ReviewFilterBar
                filter={reviewFilter}
                onChange={setReviewFilter}
                pendingCount={selectedAthlete?.pendingCount}
              />
            </div>
          </div>

          {videosLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <Video className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {reviewFilter === "pending"
                  ? "No videos waiting for review for this athlete."
                  : "No form-check videos for this athlete yet."}
              </p>
            </div>
          ) : (
            <FormCheckInboxExerciseList
              key={`${selectedUserId}-${reviewFilter}`}
              exerciseGroups={exerciseGroups}
              pendingCount={pendingTargets.length}
              onBulkApply={handleBulkApply}
            />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <HandlerFilterBar
              filter={handlerFilter}
              onChange={setHandlerFilter}
              counts={handlerCounts}
            />
            <ReviewFilterBar
              filter={reviewFilter}
              onChange={handleReviewFilterChange}
              pendingCount={planTier === "mega" ? megaPending : ultraPending}
            />
          </div>

          {athletesLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : filteredTierAthletes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <User className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {handlerFilter !== "all"
                  ? `No ${planTier.toUpperCase()} athletes in this handler queue.`
                  : reviewFilter === "pending"
                    ? `No ${planTier.toUpperCase()} athletes with videos waiting for review.`
                    : `No ${planTier.toUpperCase()} athletes with form-check videos yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredTierAthletes.map((athlete) => (
                <AthleteRow
                  key={athlete.userId}
                  athlete={athlete}
                  onSelect={() => setSelectedUserId(athlete.userId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
