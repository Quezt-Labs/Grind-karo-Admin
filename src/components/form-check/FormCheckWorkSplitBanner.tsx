import { Link } from "react-router-dom";
import { ArrowRight, MessageSquareReply, Video } from "lucide-react";
import { cn } from "@/utils/cn";

type Variant = "inbox" | "reply_queue";

export function FormCheckWorkSplitBanner({
  variant,
  replyQueueCount,
  pendingVideoCount,
  className,
}: {
  variant: Variant;
  replyQueueCount?: number;
  pendingVideoCount?: number;
  className?: string;
}) {
  if (variant === "inbox") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/80 px-3 py-2.5 text-sm dark:border-indigo-900/50 dark:bg-indigo-950/30",
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-2">
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
          <p className="text-indigo-950 dark:text-indigo-100">
            <span className="font-semibold">Video inbox</span> — review new
            athlete uploads and leave first feedback here.
          </p>
        </div>
        <Link
          to="/form-check-action-queue"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-700 dark:bg-gray-900 dark:text-indigo-300"
        >
          <MessageSquareReply className="h-3.5 w-3.5" />
          Reply queue
          {replyQueueCount != null && replyQueueCount > 0 ? (
            <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {replyQueueCount}
            </span>
          ) : null}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2.5 text-sm dark:border-violet-900/50 dark:bg-violet-950/30",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        <MessageSquareReply className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
        <p className="text-violet-950 dark:text-violet-100">
          <span className="font-semibold">Reply queue</span> — follow up on
          athlete replies and conversation threads.
        </p>
      </div>
      <Link
        to="/form-checks"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:bg-gray-900 dark:text-violet-300"
      >
        <Video className="h-3.5 w-3.5" />
        Video inbox
        {pendingVideoCount != null && pendingVideoCount > 0 ? (
          <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {pendingVideoCount}
          </span>
        ) : null}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
