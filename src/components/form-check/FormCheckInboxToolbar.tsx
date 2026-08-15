import { useQuery } from "@tanstack/react-query";
import { cn } from "@/utils/cn";
import { formCheckActionQueueService } from "@/services/formCheckActionQueueService";
import { FormCheckWorkSplitBanner } from "@/components/form-check/FormCheckWorkSplitBanner";
import type {
  HandlerFilter,
  InboxView,
  PlanTier,
  ReviewFilter,
} from "@/hooks/useFormCheckInboxRoute";

type TierCounts = {
  megaAthletes: number;
  ultraAthletes: number;
  megaPending: number;
  ultraPending: number;
};

export function FormCheckInboxToolbar({
  view,
  planTier,
  reviewFilter,
  handlerFilter,
  tierCounts,
  globalPending,
  missingTotal,
  isMissingView,
  showHandlerFilter,
  onViewChange,
  onPlanTierChange,
  onReviewFilterChange,
  onHandlerFilterChange,
}: {
  view: InboxView;
  planTier: PlanTier;
  reviewFilter: ReviewFilter;
  handlerFilter: HandlerFilter;
  tierCounts: TierCounts;
  globalPending: number;
  missingTotal: number;
  isMissingView: boolean;
  showHandlerFilter: boolean;
  onViewChange: (view: InboxView) => void;
  onPlanTierChange: (tier: PlanTier) => void;
  onReviewFilterChange: (filter: ReviewFilter) => void;
  onHandlerFilterChange: (filter: HandlerFilter) => void;
}) {
  const pendingLabel = isMissingView ? "missing" : "pending";

  const { data: replyQueueSummary } = useQuery({
    queryKey: ["form-check-action-queue-summary"],
    queryFn: () =>
      formCheckActionQueueService.list({ tab: "needs_reply", limit: 1 }),
    staleTime: 30_000,
    enabled: !isMissingView,
  });
  const replyQueueCount = replyQueueSummary?.tabCounts.needs_reply ?? 0;

  return (
    <div className="space-y-3">
      {!isMissingView ? (
        <FormCheckWorkSplitBanner
          variant="inbox"
          replyQueueCount={replyQueueCount}
        />
      ) : null}
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { value: "inbox" as const, label: "Review queue" },
                {
                  value: "missing" as const,
                  label: "Missing uploads",
                  badge: missingTotal,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onViewChange(tab.value)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  view === tab.value
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
                )}
              >
                {tab.label}
                {"badge" in tab && tab.badge != null && tab.badge > 0 ? (
                  <span
                    className={cn(
                      "ml-2 rounded-full px-2 py-0.5 text-xs font-bold",
                      view === tab.value
                        ? "bg-white/20 text-white"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
                    )}
                  >
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {!isMissingView ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
                {globalPending} pending
              </span>
              <span>
                Mega {tierCounts.megaPending} · Ultra {tierCounts.ultraPending}
              </span>
            </div>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {missingTotal} athlete{missingTotal === 1 ? "" : "s"} due this
              week
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(["mega", "ultra"] as const).map((tier) => {
            const athleteCount =
              tier === "mega"
                ? tierCounts.megaAthletes
                : tierCounts.ultraAthletes;
            const pending =
              tier === "mega"
                ? tierCounts.megaPending
                : tierCounts.ultraPending;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => onPlanTierChange(tier)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  planTier === tier
                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
                )}
              >
                {tier === "mega" ? "Mega" : "Ultra"}
                <span className="ml-1.5 text-xs font-medium opacity-80">
                  {athleteCount}
                </span>
                {pending > 0 ? (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      planTier === tier
                        ? "bg-white/20 text-white dark:bg-gray-900/20 dark:text-gray-900"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                    )}
                  >
                    {pending} {pendingLabel}
                  </span>
                ) : null}
              </button>
            );
          })}

          {!isMissingView ? (
            <>
              <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-600" />
              {(
                [
                  { value: "pending" as const, label: "Needs review" },
                  { value: "reviewed" as const, label: "Reviewed" },
                  { value: "all" as const, label: "All videos" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onReviewFilterChange(opt.value)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                    reviewFilter === opt.value
                      ? "bg-indigo-600 text-white"
                      : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </>
          ) : null}

          {showHandlerFilter && !isMissingView ? (
            <>
              <span className="hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-600" />
              <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Handler</span>
                <select
                  value={handlerFilter}
                  onChange={(e) =>
                    onHandlerFilterChange(e.target.value as HandlerFilter)
                  }
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-800 outline-none focus:border-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="all">All handlers</option>
                  <option value="assistant_coach">Assistant coach</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
