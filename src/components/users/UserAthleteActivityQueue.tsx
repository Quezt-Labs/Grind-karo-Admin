import { Link } from "react-router-dom";
import { AlertCircle, Video } from "lucide-react";
import type { FormCheckQuota } from "@/types/user";
import { cn } from "@/utils/cn";

interface UserAthleteActivityQueueProps {
  pendingVideoCount: number;
  formCheckQuota?: FormCheckQuota;
  onReviewClick?: () => void;
  className?: string;
}

export function UserAthleteActivityQueue({
  pendingVideoCount,
  formCheckQuota,
  onReviewClick,
  className,
}: UserAthleteActivityQueueProps) {
  const hasPending = pendingVideoCount > 0;

  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4",
        hasPending
          ? "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20"
          : "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {hasPending ? (
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
          ) : (
            <Video className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
          )}
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {hasPending
              ? `${pendingVideoCount} form-check video${pendingVideoCount === 1 ? "" : "s"} waiting for review`
              : "All sheet form-check videos reviewed"}
          </p>
        </div>
        {formCheckQuota?.weeklyLimit != null ? (
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Block quota ({formCheckQuota.weekStart}):{" "}
            <span className="font-semibold">
              {formCheckQuota.usedThisWeek}/{formCheckQuota.weeklyLimit}
            </span>{" "}
            program weeks reviewed
            {formCheckQuota.remainingThisWeek != null &&
            formCheckQuota.remainingThisWeek > 0
              ? ` · ${formCheckQuota.remainingThisWeek} left`
              : formCheckQuota.remainingThisWeek === 0
                ? " · limit reached"
                : ""}
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            Start with Form-check review, then use Sheet program for full
            context.
          </p>
        )}
      </div>
      <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0">
        {hasPending && onReviewClick ? (
          <button
            type="button"
            onClick={onReviewClick}
            className="inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            Review now
          </button>
        ) : null}
        <Link
          to="/form-checks"
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Open inbox
        </Link>
      </div>
    </div>
  );
}
