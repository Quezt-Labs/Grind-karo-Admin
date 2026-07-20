import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { userService } from "@/services/userService";
import { Select } from "@/components/ui/Select";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";
import type { Purchase } from "@/types/user";
import type {
  AdminWorkoutLog,
  AdminWorkoutLogsResponse,
  SetVideoEntryDto,
} from "@/types/workoutLogs";
import {
  isWithinSubscriptionRange,
  type UserActivityScope,
} from "@/utils/userActivityScope";

const PAGE_SIZE = 10;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rowHasSetVideos(
  row: AdminWorkoutLog["rows"][number],
): row is AdminWorkoutLog["rows"][number] & {
  setVideos: SetVideoEntryDto[];
} {
  return (row.setVideos?.length ?? 0) > 0;
}

function countPendingVideos(log: AdminWorkoutLog): number {
  return log.rows.reduce((sum, row) => {
    if (!rowHasSetVideos(row)) return sum;
    return sum + row.setVideos.filter((v) => !v.coachComment?.trim()).length;
  }, 0);
}

function SessionFormCheckCta({
  userId,
  pendingCount,
}: {
  userId: string;
  pendingCount: number;
}) {
  if (pendingCount <= 0) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 dark:border-indigo-800/60 dark:bg-indigo-950/30">
      <p className="text-xs text-indigo-900 dark:text-indigo-100">
        {pendingCount} set video{pendingCount === 1 ? "" : "s"} waiting for
        review — comment in Form Checks (primary coach queue).
      </p>
      <Link
        to={`/form-checks?userId=${encodeURIComponent(userId)}&review=pending`}
        className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
      >
        Review in Form Checks
        <ExternalLink className="h-3 w-3" />
      </Link>
    </div>
  );
}

function SetVideosGrid({
  userId,
  videos,
}: {
  userId: string;
  videos: SetVideoEntryDto[];
}) {
  const sorted = [...videos].sort((a, b) => a.setNumber - b.setNumber);
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {sorted.map((v) => {
        const savedComment = v.coachComment?.trim() ?? "";
        return (
          <div
            key={`${v.setNumber}-${v.videoUrl}`}
            className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40"
          >
            <div className="border-b border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
              Set {v.setNumber}
            </div>
            <FormCheckVideoPlayer src={v.videoUrl} compact />
            <div className="space-y-2 border-t border-gray-200 bg-white p-2.5 dark:border-gray-600 dark:bg-gray-800/60">
              {savedComment ? (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/90 px-2.5 py-2 dark:border-indigo-800/50 dark:bg-indigo-950/30">
                  <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Coach feedback
                  </div>
                  <LinkifiedText
                    text={savedComment}
                    className="text-xs leading-relaxed text-gray-900 dark:text-gray-100"
                  />
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-[11px] text-amber-800 dark:text-amber-200">
                  <MessageSquare className="mt-0.5 h-3 w-3 shrink-0" />
                  Pending review — leave feedback in Form Checks.
                </div>
              )}
              <Link
                to={`/form-checks?userId=${encodeURIComponent(userId)}&review=${savedComment ? "reviewed" : "pending"}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {savedComment ? "Edit in Form Checks" : "Review in Form Checks"}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface UserWorkoutLogsPanelProps {
  userId: string;
  purchases?: Purchase[];
  coachMode?: boolean;
  activityScope?: UserActivityScope;
  /** Expand this workout log when opening from a Form Check deep link. */
  initialExpandedLogId?: string | null;
}

export function UserWorkoutLogsPanel({
  userId,
  purchases = [],
  coachMode = false,
  activityScope = { mode: "all" },
  initialExpandedLogId = null,
}: UserWorkoutLogsPanelProps) {
  const [offset, setOffset] = useState(0);
  const [programId, setProgramId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(
    () => initialExpandedLogId,
  );
  const [prevExpandedLogId, setPrevExpandedLogId] =
    useState(initialExpandedLogId);

  if (initialExpandedLogId !== prevExpandedLogId) {
    setPrevExpandedLogId(initialExpandedLogId);
    if (initialExpandedLogId) setExpandedId(initialExpandedLogId);
  }

  const programOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of purchases) {
      if (p.kind === "program_purchase" && p.status === "PAID") {
        seen.set(p.programId, p.programName);
      }
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [purchases]);

  const queryKey = useMemo(
    () =>
      coachMode
        ? (["coach-workout-logs", userId, programId, offset] as const)
        : (["admin-user-workout-logs", userId, programId, offset] as const),
    [coachMode, userId, programId, offset],
  );

  const { data, isLoading } = useQuery<AdminWorkoutLogsResponse>({
    queryKey,
    queryFn: async () => {
      const params = {
        programId: programId || undefined,
        limit: PAGE_SIZE,
        offset,
      };
      if (coachMode) {
        const { athleteAssignmentService } =
          await import("@/services/athleteAssignmentService");
        return athleteAssignmentService.getCoachAthleteWorkoutLogs(
          userId,
          params,
        );
      }
      return userService.getWorkoutLogs(userId, params);
    },
  });

  const total = data?.total ?? 0;
  const items: AdminWorkoutLog[] = useMemo(() => {
    const raw = data?.items ?? [];
    if (activityScope.mode !== "subscription") return raw;
    return raw.filter((log) =>
      isWithinSubscriptionRange(log.completedAt, activityScope.range),
    );
  }, [data?.items, activityScope]);
  const displayTotal =
    activityScope.mode === "subscription" ? items.length : total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Dumbbell className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Workout logs
        </h2>
        {data && (
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {displayTotal}
          </span>
        )}
        {programOptions.length > 1 && (
          <div className="ml-auto w-48">
            <Select
              className="h-9 text-sm"
              options={[
                { value: "", label: "All programs" },
                ...programOptions.map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
              value={programId}
              onValueChange={(v) => {
                setProgramId(v);
                setOffset(0);
                setExpandedId(null);
              }}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-gray-800">
          <ClipboardList className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No workouts logged yet.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((log) => {
              const videoCount = log.rows.reduce(
                (sum, row) => sum + (row.setVideos?.length ?? 0),
                0,
              );
              const expanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatDateTime(log.completedAt)}
                        </p>
                        {log.programName && (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {log.programName}
                          </span>
                        )}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {log.rows.length} exercise
                          {log.rows.length !== 1 ? "s" : ""}
                        </span>
                        {videoCount > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {videoCount} set video{videoCount !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      {log.notes && (
                        <p className="mt-1 truncate text-xs italic text-gray-500 dark:text-gray-400">
                          "{log.notes}"
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                        expanded && "rotate-180",
                      )}
                    />
                  </button>

                  {expanded && (
                    <div className="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
                      <SessionFormCheckCta
                        userId={userId}
                        pendingCount={countPendingVideos(log)}
                      />
                      {log.rows.map((row) => (
                        <div
                          key={row.id}
                          className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/30"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {row.exerciseName ?? "Exercise"}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                            {row.actualSets != null && (
                              <span>
                                Sets:{" "}
                                <strong className="text-gray-900 dark:text-gray-200">
                                  {row.actualSets}
                                </strong>
                              </span>
                            )}
                            {row.actualReps != null && (
                              <span>
                                Reps:{" "}
                                <strong className="text-gray-900 dark:text-gray-200">
                                  {row.actualReps}
                                </strong>
                              </span>
                            )}
                            {row.actualLoad != null && (
                              <span>
                                Load:{" "}
                                <strong className="text-gray-900 dark:text-gray-200">
                                  {row.actualLoad} kg
                                </strong>
                              </span>
                            )}
                            {row.actualRpe != null && (
                              <span>
                                RPE:{" "}
                                <strong className="text-gray-900 dark:text-gray-200">
                                  {(row.actualRpe / 100).toFixed(1)}
                                </strong>
                              </span>
                            )}
                            {row.e1rm != null && (
                              <span>
                                e1RM:{" "}
                                <strong className="text-indigo-600 dark:text-indigo-400">
                                  {row.e1rm} kg
                                </strong>
                              </span>
                            )}
                          </div>
                          {row.notes && (
                            <p className="mt-1 text-xs italic text-gray-500 dark:text-gray-400">
                              "{row.notes}"
                            </p>
                          )}
                          {rowHasSetVideos(row) && (
                            <SetVideosGrid
                              userId={userId}
                              videos={row.setVideos}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {total > PAGE_SIZE && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => {
                    setOffset(Math.max(0, offset - PAGE_SIZE));
                    setExpandedId(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-600"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <button
                  type="button"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => {
                    setOffset(offset + PAGE_SIZE);
                    setExpandedId(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-gray-600"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
