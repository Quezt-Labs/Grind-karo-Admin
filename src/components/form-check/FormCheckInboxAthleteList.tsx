import { useMemo, useState } from "react";
import { ChevronRight, Search, User, X } from "lucide-react";
import { FormCheckHandlerBadge } from "@/components/form-check/FormCheckHandlerBadge";
import { Spinner } from "@/components/ui/Spinner";
import type { FormCheckInboxAthlete } from "@/services/formCheckInboxService";
import type { PlanTier, ReviewFilter } from "@/hooks/useFormCheckInboxRoute";
import { formatRelativeTime } from "@/utils/formatRelativeTime";
import { cn } from "@/utils/cn";

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
        onClick={() => onChange("reviewed")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          filter === "reviewed"
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
        )}
      >
        Reviewed
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
  reviewFilter,
  onSelect,
}: {
  athlete: FormCheckInboxAthlete;
  reviewFilter: ReviewFilter;
  onSelect: () => void;
}) {
  const relativeUpload = formatRelativeTime(athlete.latestVideoAt);
  const highPriority = athlete.pendingCount >= 5;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:bg-gray-800 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20",
        athlete.pendingCount > 0
          ? highPriority
            ? "border-amber-400 dark:border-amber-700"
            : "border-amber-200/80 dark:border-amber-800/50"
          : reviewFilter === "all"
            ? "border-gray-200 opacity-90 dark:border-gray-700"
            : "border-gray-200 dark:border-gray-700",
      )}
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
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <FormCheckHandlerBadge
            formCheckHandler={athlete.formCheckHandler}
            formCheckCoachName={athlete.formCheckCoachName}
          />
          {relativeUpload ? (
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              Latest upload {relativeUpload}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {athlete.pendingCount > 0 ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              highPriority
                ? "bg-amber-500 text-white"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
            )}
          >
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

export function FormCheckInboxTierTabs({
  planTier,
  megaAthletes,
  ultraAthletes,
  megaPending,
  ultraPending,
  pendingLabel = "pending",
  onPlanChange,
}: {
  planTier: PlanTier;
  megaAthletes: { length: number };
  ultraAthletes: { length: number };
  megaPending: number;
  ultraPending: number;
  pendingLabel?: string;
  onPlanChange: (tier: PlanTier) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["mega", "ultra"] as const).map((tier) => {
        const pending = tier === "mega" ? megaPending : ultraPending;
        const count =
          tier === "mega" ? megaAthletes.length : ultraAthletes.length;
        return (
          <button
            key={tier}
            type="button"
            onClick={() => onPlanChange(tier)}
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
            </span>
            {pending > 0 ? (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs font-bold",
                  planTier === tier
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                )}
              >
                {pending} {pendingLabel}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

type AthleteSort = "oldest_waiting" | "newest" | "most_pending";

function sortAthletes(
  athletes: FormCheckInboxAthlete[],
  sort: AthleteSort,
): FormCheckInboxAthlete[] {
  const copy = [...athletes];
  const time = (iso: string | null) =>
    iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY;

  copy.sort((a, b) => {
    if (sort === "most_pending") {
      if (b.pendingCount !== a.pendingCount) {
        return b.pendingCount - a.pendingCount;
      }
      return time(a.latestVideoAt) - time(b.latestVideoAt);
    }
    if (sort === "oldest_waiting") {
      // Oldest latest-upload first = waiting longest for attention.
      return time(a.latestVideoAt) - time(b.latestVideoAt);
    }
    // newest
    return time(b.latestVideoAt) - time(a.latestVideoAt);
  });
  return copy;
}

export function FormCheckInboxAthleteList({
  planTier,
  tierAthletes,
  reviewFilter,
  isLoading,
  search,
  onSearchChange,
  onSelectAthlete,
}: {
  planTier: PlanTier;
  tierAthletes: FormCheckInboxAthlete[];
  reviewFilter: ReviewFilter;
  isLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectAthlete: (userId: string) => void;
}) {
  const [sort, setSort] = useState<AthleteSort>(() =>
    reviewFilter === "pending" ? "oldest_waiting" : "newest",
  );

  const sortedAthletes = useMemo(
    () => sortAthletes(tierAthletes, sort),
    [tierAthletes, sort],
  );

  const showSearchEmpty =
    search.trim().length > 0 && sortedAthletes.length === 0 && !isLoading;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search athletes by name or email…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { value: "oldest_waiting", label: "Oldest waiting" },
              { value: "newest", label: "Newest upload" },
              { value: "most_pending", label: "Most pending" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSort(opt.value)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors",
                sort === opt.value
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : showSearchEmpty ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No athletes match &ldquo;{search}&rdquo;.
          </p>
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="mt-3 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Clear search
          </button>
        </div>
      ) : sortedAthletes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <User className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {reviewFilter === "pending"
              ? `No ${planTier === "mega" ? "Mega" : "Ultra"} athletes with videos waiting for review.`
              : `No ${planTier === "mega" ? "Mega" : "Ultra"} athletes with form-check videos yet.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {sortedAthletes.map((athlete) => (
            <AthleteRow
              key={athlete.userId}
              athlete={athlete}
              reviewFilter={reviewFilter}
              onSelect={() => onSelectAthlete(athlete.userId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export { ReviewFilterBar };
