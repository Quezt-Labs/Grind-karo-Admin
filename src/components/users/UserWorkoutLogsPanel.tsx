import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Dumbbell,
  Loader2,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { userService } from "@/services/userService";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { Select } from "@/components/ui/Select";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";
import type { Purchase } from "@/types/user";
import type {
  AdminWorkoutLog,
  AdminWorkoutLogsResponse,
  SetVideoEntryDto,
} from "@/types/workoutLogs";
import {
  bulkUpsertFormCheckComments,
  type FormCheckCommentTarget,
} from "@/utils/bulkFormCheckComments";
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

function collectPendingProgramVideoTargets(
  log: AdminWorkoutLog,
): FormCheckCommentTarget[] {
  return log.rows.flatMap((row) => {
    if (!rowHasSetVideos(row)) return [];
    return row.setVideos
      .filter((v) => !v.coachComment?.trim())
      .map((v) => ({
        source: "program" as const,
        exerciseLogId: row.id,
        setNumber: v.setNumber,
        label: `${row.exerciseName ?? "Exercise"} · Set ${v.setNumber}`,
      }));
  });
}

function ExpandedWorkoutBulkComment({
  log,
  userId,
  queryKey,
}: {
  log: AdminWorkoutLog;
  userId: string;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const pendingTargets = useMemo(
    () => collectPendingProgramVideoTargets(log),
    [log],
  );

  const handleBulkApply = async (comment: string) => {
    const result = await bulkUpsertFormCheckComments(pendingTargets, comment);
    if (result.succeeded > 0) {
      void queryClient.invalidateQueries({ queryKey });
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-purchases", userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["form-check-pending-count"],
      });
      void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
    }
    return result;
  };

  return (
    <BulkFormCheckCommentBar
      pendingCount={pendingTargets.length}
      onApply={handleBulkApply}
      className="mb-3"
    />
  );
}

function SetVideoCommentEditor({
  userId,
  exerciseLogId,
  video,
  queryKey,
}: {
  userId: string;
  exerciseLogId: string;
  video: SetVideoEntryDto;
  queryKey: unknown[];
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(video.coachComment ?? "");
  const hadComment = Boolean(video.coachComment?.trim());

  const saveMutation = useMutation({
    mutationFn: () =>
      workoutVideoCommentService.upsert({
        exerciseLogId,
        setNumber: video.setNumber,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      toast.success("Comment saved");
      void queryClient.invalidateQueries({ queryKey });
      if (!hadComment) {
        void queryClient.invalidateQueries({
          queryKey: ["admin-user-purchases", userId],
        });
        void queryClient.invalidateQueries({
          queryKey: ["form-check-pending-count"],
        });
        void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
      }
    },
  });

  return (
    <div className="border-t border-gray-200 bg-white p-2.5 dark:border-gray-600 dark:bg-gray-800/60">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        <MessageSquare className="h-3 w-3" />
        Coach comment
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Form-check feedback for the client…"
        className="w-full resize-y rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      <button
        type="button"
        disabled={!comment.trim() || saveMutation.isPending}
        onClick={() => saveMutation.mutate()}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
      >
        {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
        Save comment
      </button>
    </div>
  );
}

function SetVideosGrid({
  userId,
  exerciseLogId,
  videos,
  queryKey,
}: {
  userId: string;
  exerciseLogId: string;
  videos: SetVideoEntryDto[];
  queryKey: unknown[];
}) {
  const sorted = [...videos].sort((a, b) => a.setNumber - b.setNumber);
  return (
    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {sorted.map((v) => (
        <div
          key={`${v.setNumber}-${v.videoUrl}`}
          className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-900/40"
        >
          <div className="border-b border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-600 dark:text-gray-400">
            Set {v.setNumber}
          </div>
          <FormCheckVideoPlayer src={v.videoUrl} compact />
          <SetVideoCommentEditor
            key={`${exerciseLogId}-${v.setNumber}-${v.coachComment ?? ""}`}
            userId={userId}
            exerciseLogId={exerciseLogId}
            video={v}
            queryKey={queryKey}
          />
        </div>
      ))}
    </div>
  );
}

interface UserWorkoutLogsPanelProps {
  userId: string;
  purchases?: Purchase[];
  coachMode?: boolean;
  activityScope?: UserActivityScope;
}

export function UserWorkoutLogsPanel({
  userId,
  purchases = [],
  coachMode = false,
  activityScope = { mode: "all" },
}: UserWorkoutLogsPanelProps) {
  const [offset, setOffset] = useState(0);
  const [programId, setProgramId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
                      <ExpandedWorkoutBulkComment
                        log={log}
                        userId={userId}
                        queryKey={[...queryKey]}
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
                              exerciseLogId={row.id}
                              videos={row.setVideos}
                              queryKey={[...queryKey]}
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
