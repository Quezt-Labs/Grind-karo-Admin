import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ChevronDown,
  Loader2,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  workoutSummaryService,
  type FormCheckFeedbackItem,
  type WorkoutWeeklySummary,
} from "@/services/workoutSummaryService";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/utils/cn";
import {
  weekRangeOverlapsSubscription,
  type UserActivityScope,
} from "@/utils/userActivityScope";

function formatWeekRange(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(iso + "T12:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  return `${fmt(start)} – ${fmt(end)}`;
}

function getPreviousMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff - 7);
  return d.toISOString().slice(0, 10);
}

function StatsGrid({ stats }: { stats: WorkoutWeeklySummary["stats"] }) {
  const items = [
    { label: "Sessions", value: stats.sessionsCompleted },
    { label: "Exercises", value: stats.exercisesLogged },
    { label: "Total sets", value: stats.totalSets },
    { label: "Set videos", value: stats.setVideosUploaded },
    { label: "Form checks", value: stats.coachVideoComments },
    { label: "Check-ins", value: stats.progressCheckIns },
    {
      label: "Volume (kg)",
      value:
        stats.totalVolumeKg > 0 ? stats.totalVolumeKg.toLocaleString() : "—",
    },
  ];

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            {item.label}
          </p>
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function FormCheckFeedbackPreview({
  feedback,
}: {
  feedback: FormCheckFeedbackItem[];
}) {
  if (feedback.length === 0) {
    return (
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        No form-check comments this week. Add feedback on the athlete&apos;s set
        videos — it will appear here after regenerate.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300">
        <MessageSquare className="h-3.5 w-3.5" />
        Form check feedback ({feedback.length})
      </div>
      <ul className="space-y-2">
        {feedback.map((item, index) => (
          <li
            key={`${item.source}-${item.exerciseName}-${item.setNumber}-${index}`}
            className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200">
              {item.exerciseName}
              {item.weekNumber != null ? ` · W${item.weekNumber}` : ""}
              {` · Set ${item.setNumber}`}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-400">
              {item.comment}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({ summary }: { summary: WorkoutWeeklySummary }) {
  const [expanded, setExpanded] = useState(false);
  const formCheckFeedback = summary.stats.formCheckFeedback ?? [];

  const resendPush = useMutation({
    mutationFn: () => workoutSummaryService.resendPush(summary.id),
    onSuccess: (res) => {
      toast.success(
        res.sent ? "Summary push sent" : "No push sent (no activity)",
      );
    },
    onError: () => toast.error("Failed to send summary push"),
  });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatWeekRange(summary.weekStart, summary.weekEnd)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {summary.stats.sessionsCompleted} sessions ·{" "}
            {summary.stats.setVideosUploaded} set videos ·{" "}
            {formCheckFeedback.length} form-check comment
            {formCheckFeedback.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <StatsGrid stats={summary.stats} />
          {summary.stats.topLifts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                Top e1RM improvements
              </p>
              <ul className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                {summary.stats.topLifts.map((lift) => (
                  <li key={lift.exerciseName}>
                    {lift.exerciseName}: {lift.e1rm} kg (+{lift.delta} kg)
                  </li>
                ))}
              </ul>
            </div>
          )}
          <FormCheckFeedbackPreview feedback={formCheckFeedback} />
          <button
            type="button"
            disabled={resendPush.isPending}
            onClick={() => resendPush.mutate()}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            {resendPush.isPending && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            Resend push
          </button>
        </div>
      )}
    </div>
  );
}

interface UserWeeklySummariesPanelProps {
  userId: string;
  activityScope?: UserActivityScope;
}

export function UserWeeklySummariesPanel({
  userId,
  activityScope = { mode: "all" },
}: UserWeeklySummariesPanelProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-weekly-summaries", userId],
    queryFn: () => workoutSummaryService.listForUser(userId),
  });

  const regenerate = useMutation({
    mutationFn: () =>
      workoutSummaryService.generate(userId, getPreviousMondayISO(), true),
    onSuccess: () => {
      toast.success("Summary regenerated");
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-weekly-summaries", userId],
      });
    },
    onError: () => toast.error("Failed to regenerate summary"),
  });

  const summaries = useMemo(() => {
    const all = data ?? [];
    if (activityScope.mode !== "subscription") return all;
    return all.filter((summary) =>
      weekRangeOverlapsSubscription(
        summary.weekStart,
        summary.weekEnd,
        activityScope.range,
      ),
    );
  }, [data, activityScope]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <BarChart3 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Weekly summaries
        </h2>
        {summaries.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {summaries.length}
          </span>
        )}
        <button
          type="button"
          disabled={regenerate.isPending}
          onClick={() => regenerate.mutate()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300"
        >
          {regenerate.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Regenerate last week
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : summaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No weekly summaries yet. They are generated every Monday for active
            coaching clients.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            <SummaryCard key={s.id} summary={s} />
          ))}
        </div>
      )}
    </div>
  );
}
