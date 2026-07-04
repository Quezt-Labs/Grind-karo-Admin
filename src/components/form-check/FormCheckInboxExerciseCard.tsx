import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import toast from "react-hot-toast";
import { FormCheckAthleteNotesBlocks } from "@/components/shared/FormCheckAthleteNotesBlocks";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { FORM_CHECK_PASS_COMMENT } from "@/constants/formCheckComments";
import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";
import {
  bulkUpsertFormCheckComments,
  type BulkCommentResult,
} from "@/utils/bulkFormCheckComments";
import { pendingTargetsForVideos } from "@/utils/formCheckCommentTargets";
import { cn } from "@/utils/cn";

function formatUploadedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ExerciseContextChips({ video }: { video: FormCheckInboxItem }) {
  const chips: string[] = [];

  if (video.programName) chips.push(video.programName);
  if (video.weekNumber != null && video.dayNumber != null) {
    const day =
      video.dayLabel != null && video.dayLabel !== ""
        ? `Day ${video.dayNumber} · ${video.dayLabel}`
        : `Day ${video.dayNumber}`;
    chips.push(`W${video.weekNumber}`, day);
  }
  if (video.exerciseCategory) chips.push(video.exerciseCategory);
  if (video.prescriptionSets != null || video.repScheme) {
    chips.push(`${video.prescriptionSets ?? "?"}×${video.repScheme ?? "?"}`);
  }

  if (chips.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip}
          className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 dark:bg-gray-700/60 dark:text-gray-200"
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

function SetCommentPanelWithBulk({
  video,
  allVideos,
  exerciseName,
}: {
  video: FormCheckInboxItem;
  allVideos: FormCheckInboxItem[];
  exerciseName: string;
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(video.coachComment ?? "");
  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(allVideos),
    [allVideos],
  );
  const pendingSiblings = pendingTargets.length;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
    void queryClient.invalidateQueries({
      queryKey: ["form-check-inbox-athletes"],
    });
    void queryClient.invalidateQueries({
      queryKey: ["form-check-pending-count"],
    });
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmed = comment.trim();
      if (!video.exerciseLogId) throw new Error("Missing exercise log");
      return workoutVideoCommentService.upsert({
        exerciseLogId: video.exerciseLogId,
        setNumber: video.setNumber,
        comment: trimmed,
      });
    },
    onSuccess: () => {
      toast.success(`Set ${video.setNumber} saved`);
      invalidate();
    },
    onError: () => toast.error("Failed to save comment"),
  });

  const bulkMutation = useMutation({
    mutationFn: (text: string) =>
      bulkUpsertFormCheckComments(pendingTargets, text),
    onSuccess: (result: BulkCommentResult) => {
      if (result.failed === 0 && result.succeeded > 0) {
        toast.success(
          `${result.succeeded} set comment${result.succeeded === 1 ? "" : "s"} saved`,
        );
        invalidate();
        return;
      }
      if (result.succeeded > 0) {
        toast.error(`${result.succeeded} saved · ${result.failed} failed`);
        invalidate();
        return;
      }
      toast.error("Failed to save comments");
    },
  });

  const saving = saveMutation.isPending || bulkMutation.isPending;

  return (
    <div className="flex h-full flex-col p-3 lg:p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
          <MessageSquare className="h-3 w-3" />
          Coach comment
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => setComment(FORM_CHECK_PASS_COMMENT)}
          className="rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
        >
          Pass
        </button>
      </div>

      {(video.setNotes?.trim() || video.athleteNotes?.trim()) && (
        <div className="mb-3">
          <FormCheckAthleteNotesBlocks
            setNotes={video.setNotes}
            setNumber={video.setNumber}
            athleteNotes={video.athleteNotes}
          />
        </div>
      )}

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        placeholder={`Feedback for ${exerciseName}, set ${video.setNumber}…`}
        className="min-h-[88px] w-full flex-1 resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />

      <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
        Uploaded {formatUploadedAt(video.createdAt)}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!comment.trim() || saving}
          onClick={() => saveMutation.mutate()}
          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saveMutation.isPending && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
          Save this set
        </button>
        {pendingSiblings > 1 ? (
          <button
            type="button"
            disabled={!comment.trim() || saving}
            onClick={() => bulkMutation.mutate(comment.trim())}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
          >
            {bulkMutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Apply to all {pendingSiblings} pending sets
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function FormCheckInboxExerciseCard({
  videos,
  showAthleteLink = true,
  expanded = true,
  onToggle,
}: {
  videos: FormCheckInboxItem[];
  showAthleteLink?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const head = videos[0];
  const multiSet = videos.length > 1;
  const reviewedCount = videos.filter((v) => v.reviewed).length;
  const pendingCount = videos.length - reviewedCount;

  const defaultIndex = useMemo(() => {
    const pending = videos.findIndex((v) => !v.reviewed);
    return pending >= 0 ? pending : 0;
  }, [videos]);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const activeIndex = useMemo(() => {
    if (activeVideoId) {
      const fromSelection = videos.findIndex((v) => v.id === activeVideoId);
      if (fromSelection >= 0) return fromSelection;
    }
    return defaultIndex;
  }, [activeVideoId, videos, defaultIndex]);

  const goPrev = () => {
    const next = Math.max(0, activeIndex - 1);
    setActiveVideoId(videos[next]?.id ?? null);
  };
  const goNext = () => {
    const next = Math.min(videos.length - 1, activeIndex + 1);
    setActiveVideoId(videos[next]?.id ?? null);
  };

  useEffect(() => {
    if (!multiSet || !expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLInputElement
      ) {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        const next = Math.max(0, activeIndex - 1);
        setActiveVideoId(videos[next]?.id ?? null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        const next = Math.min(videos.length - 1, activeIndex + 1);
        setActiveVideoId(videos[next]?.id ?? null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [multiSet, videos.length, expanded, activeIndex, videos]);

  const active = videos[activeIndex] ?? head;
  const athleteName = head.userName ?? head.userEmail;
  const collapsible = onToggle != null;
  const HeaderTag = collapsible ? "button" : "div";

  const headerSummary = multiSet
    ? `${videos.length} sets · ${pendingCount} pending`
    : active.reviewed
      ? "Reviewed"
      : "Pending";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-gray-800",
        pendingCount > 0
          ? "border-amber-200/80 dark:border-amber-800/50"
          : "border-gray-200 dark:border-gray-700",
        !expanded && "opacity-95",
      )}
    >
      <header
        className={cn(
          "border-gray-200 bg-gradient-to-r from-gray-50/90 to-white dark:border-gray-700 dark:from-gray-900/50 dark:to-gray-800",
          expanded ? "border-b px-4 py-3" : "px-4 py-3",
        )}
      >
        <HeaderTag
          type={collapsible ? "button" : undefined}
          onClick={collapsible ? onToggle : undefined}
          className={cn(
            "flex w-full items-start justify-between gap-3 text-left",
            collapsible &&
              "cursor-pointer rounded-lg hover:bg-white/60 dark:hover:bg-gray-800/60",
          )}
        >
          <div className="min-w-0 flex-1">
            {showAthleteLink ? (
              <Link
                to={`/users/${head.userId}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {athleteName}
              </Link>
            ) : null}
            <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white">
              {head.exerciseName}
            </h3>
            {expanded ? (
              <ExerciseContextChips video={head} />
            ) : (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                {formatExerciseContextLine(head)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="flex flex-col items-end gap-1.5">
              <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                Program
              </span>
              {multiSet ? (
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  {reviewedCount}/{videos.length} reviewed
                </span>
              ) : active.reviewed ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Reviewed
                </span>
              ) : (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Pending
                </span>
              )}
              {!expanded ? (
                <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                  {headerSummary}
                </span>
              ) : null}
            </div>
            {collapsible ? (
              <ChevronDown
                className={cn(
                  "mt-1 h-5 w-5 shrink-0 text-gray-400 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            ) : null}
          </div>
        </HeaderTag>

        {expanded && multiSet ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(reviewedCount / videos.length) * 100}%` }}
            />
          </div>
        ) : null}

        {expanded && head.exerciseNotes?.trim() ? (
          <div className="mt-3">
            <FormCheckAthleteNotesBlocks exerciseNotes={head.exerciseNotes} />
          </div>
        ) : null}
      </header>

      {expanded ? (
        <>
          {multiSet ? (
            <div className="flex items-center gap-1 border-b border-gray-200 bg-gray-50/60 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
              <button
                type="button"
                onClick={goPrev}
                disabled={activeIndex === 0}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white disabled:opacity-30 dark:hover:bg-gray-800"
                aria-label="Previous set"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {videos.map((video, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setActiveVideoId(video.id)}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-600",
                      )}
                    >
                      Set {video.setNumber}
                      {video.reviewed ? (
                        <CheckCircle2
                          className={cn(
                            "h-3.5 w-3.5",
                            isActive ? "text-indigo-200" : "text-indigo-500",
                          )}
                        />
                      ) : (
                        <Circle
                          className={cn(
                            "h-3 w-3 fill-amber-400 text-amber-400",
                            isActive && "fill-amber-200 text-amber-200",
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={activeIndex === videos.length - 1}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white disabled:opacity-30 dark:hover:bg-gray-800"
                aria-label="Next set"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-5">
            <div className="bg-black lg:col-span-3">
              <FormCheckVideoPlayer
                key={active.id}
                src={active.videoUrl}
                downloadFileName={`${head.exerciseName}-set-${active.setNumber}`}
              />
            </div>
            <div className="border-t border-gray-200 lg:col-span-2 lg:border-l lg:border-t-0 dark:border-gray-700">
              <SetCommentPanelWithBulk
                key={active.id}
                video={active}
                allVideos={videos}
                exerciseName={head.exerciseName}
              />
            </div>
          </div>
        </>
      ) : null}
    </article>
  );
}

function formatExerciseContextLine(video: FormCheckInboxItem): string {
  const parts: string[] = [];
  if (video.programName) parts.push(video.programName);
  if (video.weekNumber != null && video.dayNumber != null) {
    parts.push(`W${video.weekNumber} · Day ${video.dayNumber}`);
  }
  return parts.join(" · ");
}
