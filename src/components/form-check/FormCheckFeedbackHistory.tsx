import { useMemo } from "react";
import { MessageSquare, Play, Video } from "lucide-react";
import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import { sortFeedbackVideos } from "@/utils/formCheckReview";
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
} from "@/utils/formCheckWeekUtils";
import { cn } from "@/utils/cn";

function formatReviewedAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scopeLabel(video: FormCheckInboxItem): string {
  const parts: string[] = [];
  if (video.weekNumber != null) {
    parts.push(formatProgramWeekLabel(video.weekNumber));
  }
  if (video.dayNumber != null) {
    parts.push(formatProgramDayLabel(video.dayNumber, video.dayLabel));
  }
  parts.push(`Set ${video.setNumber}`);
  return parts.join(" · ");
}

function FeedbackRow({
  video,
  onWatchVideo,
}: {
  video: FormCheckInboxItem;
  onWatchVideo?: (video: FormCheckInboxItem) => void;
}) {
  const comment = video.coachComment?.trim() ?? "";
  const reviewedAt = formatReviewedAt(video.coachCommentUpdatedAt);

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {video.exerciseName}
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {scopeLabel(video)}
            {video.programName ? ` · ${video.programName}` : ""}
          </p>
        </div>
        {onWatchVideo ? (
          <button
            type="button"
            onClick={() => onWatchVideo(video)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            <Play className="h-3 w-3" />
            Watch video
          </button>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2.5 dark:border-indigo-800/50 dark:bg-indigo-950/30">
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
          <MessageSquare className="h-3 w-3" />
          Coach feedback
          {!video.reviewed ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              Earlier upload
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap dark:text-gray-100">
          {comment}
        </p>
        {reviewedAt ? (
          <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
            Reviewed {reviewedAt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function FormCheckInboxLayoutToggle({
  layout,
  onChange,
  feedbackCount,
  className,
}: {
  layout: "videos" | "feedback";
  onChange: (layout: "videos" | "feedback") => void;
  feedbackCount: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-600 dark:bg-gray-900/50",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onChange("feedback")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          layout === "feedback"
            ? "bg-white text-indigo-700 shadow-sm dark:bg-gray-800 dark:text-indigo-300"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Feedback log
        {feedbackCount > 0 ? (
          <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200">
            {feedbackCount}
          </span>
        ) : null}
      </button>
      <button
        type="button"
        onClick={() => onChange("videos")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          layout === "videos"
            ? "bg-white text-indigo-700 shadow-sm dark:bg-gray-800 dark:text-indigo-300"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200",
        )}
      >
        <Video className="h-3.5 w-3.5" />
        Video review
      </button>
    </div>
  );
}

export function FormCheckFeedbackHistory({
  videos,
  onWatchVideo,
  emptyMessage = "No coach feedback yet.",
}: {
  videos: FormCheckInboxItem[];
  onWatchVideo?: (video: FormCheckInboxItem) => void;
  emptyMessage?: string;
}) {
  const items = useMemo(() => sortFeedbackVideos(videos), [videos]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-gray-800">
        <MessageSquare className="mx-auto h-9 w-9 text-gray-300 dark:text-gray-600" />
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((video) => (
        <FeedbackRow key={video.id} video={video} onWatchVideo={onWatchVideo} />
      ))}
    </div>
  );
}
