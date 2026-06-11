import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { BulkFormCheckCommentBar } from "@/components/shared/BulkFormCheckCommentBar";
import { FormCheckAthleteLoggedMetrics } from "@/components/shared/FormCheckSheetContext";
import { formatAthleteLoggedLine } from "@/components/shared/formCheckSheetContext.utils";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { Spinner } from "@/components/ui/Spinner";
import {
  SheetWeekFilter,
  SheetPanelIcon,
} from "@/components/users/UserSheetsExerciseNotesPanel";
import {
  sheetsSetVideoCommentService,
  sheetsSetVideoService,
  type AdminSheetsSetVideo,
} from "@/services/sheetsSetVideoService";
import type { FormCheckQuota } from "@/types/user";
import {
  bulkUpsertFormCheckComments,
  type FormCheckCommentTarget,
} from "@/utils/bulkFormCheckComments";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function FormCheckQuotaHint({
  quota,
  weekNumber,
  weekAlreadyReviewed,
}: {
  quota?: FormCheckQuota;
  weekNumber: number;
  weekAlreadyReviewed: boolean;
}) {
  if (!quota || quota.weeklyLimit == null) return null;

  const remaining = quota.remainingThisWeek ?? 0;
  const weekGate =
    quota.formCheckWeekAllowed === false
      ? " · Not a delivery week for this plan"
      : "";

  return (
    <p className="mb-2 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
      {quota.weekStart}: {quota.usedThisWeek}/{quota.weeklyLimit} program weeks
      used
      {remaining > 0 ? ` · ${remaining} remaining` : " · limit reached"}
      {weekGate}
      {weekAlreadyReviewed
        ? " · Extra comments on W" + weekNumber + " don't count toward quota."
        : null}
    </p>
  );
}

function SheetVideoCommentEditor({
  userId,
  video,
  queryKey,
  quota,
  weekAlreadyReviewed,
}: {
  userId: string;
  video: AdminSheetsSetVideo;
  queryKey: unknown[];
  quota?: FormCheckQuota;
  weekAlreadyReviewed: boolean;
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(video.coachComment ?? "");
  const hadComment = Boolean(video.coachComment?.trim());

  const saveMutation = useMutation({
    mutationFn: () =>
      sheetsSetVideoCommentService.upsert({
        sheetsSetVideoId: video.id,
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
      <FormCheckQuotaHint
        quota={quota}
        weekNumber={video.weekNumber}
        weekAlreadyReviewed={weekAlreadyReviewed}
      />
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

interface UserSheetsWorkoutVideosPanelProps {
  userId: string;
  formCheckQuota?: FormCheckQuota;
}

export function UserSheetsWorkoutVideosPanel({
  userId,
  formCheckQuota,
}: UserSheetsWorkoutVideosPanelProps) {
  const queryClient = useQueryClient();
  const [weekFilter, setWeekFilter] = useState<number | "all">("all");
  const [reviewFilter, setReviewFilter] = useState<"all" | "unreviewed">("all");

  const { data: weeks = [] } = useQuery({
    queryKey: ["admin-user-sheet-weeks", userId],
    queryFn: () => sheetsSetVideoService.listSheetWeeks(userId),
  });

  const queryKey = [
    "admin-user-sheets-set-videos",
    userId,
    weekFilter,
  ] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      sheetsSetVideoService.listForUser(
        userId,
        weekFilter === "all" ? undefined : weekFilter,
      ),
  });

  const rawVideos = useMemo(() => data ?? [], [data]);

  const formCheckWeeks = useMemo(() => {
    const set = new Set<number>();
    for (const v of rawVideos) {
      if (v.coachComment?.trim()) set.add(v.weekNumber);
    }
    return set;
  }, [rawVideos]);

  const videos = useMemo(() => {
    const filtered =
      reviewFilter === "unreviewed"
        ? rawVideos.filter((v) => !v.coachComment?.trim())
        : rawVideos;

    return [...filtered].sort((a, b) => {
      const aReviewed = Boolean(a.coachComment?.trim());
      const bReviewed = Boolean(b.coachComment?.trim());
      if (aReviewed !== bReviewed) return aReviewed ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rawVideos, reviewFilter]);

  const unreviewedCount = rawVideos.filter(
    (v) => !v.coachComment?.trim(),
  ).length;

  const pendingTargets = useMemo((): FormCheckCommentTarget[] => {
    return videos
      .filter((v) => !v.coachComment?.trim())
      .map((v) => ({
        source: "sheet" as const,
        sheetsSetVideoId: v.id,
        label: (() => {
          const logged = formatAthleteLoggedLine(v.sheetContext);
          const base = `${v.exerciseName} · W${v.weekNumber} · Set ${v.setNumber}`;
          return logged ? `${base} · ${logged}` : base;
        })(),
      }));
  }, [videos]);

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
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SheetPanelIcon />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sheet workout videos
        </h2>
        {data && (
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {videos.length}
            {reviewFilter === "all" && unreviewedCount > 0
              ? ` · ${unreviewedCount} pending`
              : ""}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select
            value={reviewFilter}
            onChange={(e) =>
              setReviewFilter(e.target.value as "all" | "unreviewed")
            }
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            <option value="all">All videos</option>
            <option value="unreviewed">Needs review</option>
          </select>
          <SheetWeekFilter
            weeks={weeks}
            value={weekFilter}
            onChange={setWeekFilter}
          />
        </div>
      </div>

      {formCheckQuota && formCheckQuota.weeklyLimit != null && (
        <div className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
          Form checks this block ({formCheckQuota.weekStart}):{" "}
          <span className="font-semibold">
            {formCheckQuota.usedThisWeek}/{formCheckQuota.weeklyLimit}
          </span>{" "}
          program weeks reviewed
          {formCheckQuota.remainingThisWeek != null &&
          formCheckQuota.remainingThisWeek > 0
            ? ` · ${formCheckQuota.remainingThisWeek} remaining`
            : formCheckQuota.remainingThisWeek === 0
              ? " · limit reached"
              : ""}
          {formCheckQuota.formCheckWeekAllowed === false
            ? ` · Sub week ${formCheckQuota.subscriptionWeek ?? "?"} is not a delivery week`
            : ""}
        </div>
      )}

      {weekFilter !== "all" && formCheckWeeks.has(weekFilter) && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-900 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-200">
          Form check delivered for Week {weekFilter} (counts as one review for
          this program week). Additional comments this week are free.
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          {reviewFilter === "unreviewed"
            ? "No videos waiting for review."
            : "No sheet workout videos uploaded yet."}
        </div>
      ) : (
        <div className="space-y-3">
          <BulkFormCheckCommentBar
            pendingCount={pendingTargets.length}
            onApply={handleBulkApply}
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {videos.map((video) => (
              <div
                key={video.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {video.exerciseName}
                    </p>
                    {video.coachComment?.trim() ? (
                      <span className="shrink-0 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                        Reviewed
                      </span>
                    ) : (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {video.tabName} · W{video.weekNumber} · Day{" "}
                    {video.dayNumber} · Set {video.setNumber} ·{" "}
                    {formatDateTime(video.createdAt)}
                  </p>
                  <FormCheckAthleteLoggedMetrics
                    ctx={video.sheetContext}
                    compact
                  />
                  {video.athleteNotes?.trim() ? (
                    <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 dark:border-amber-800/60 dark:bg-amber-900/20">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                        Athlete notes
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-xs text-amber-950 dark:text-amber-100">
                        {video.athleteNotes.trim()}
                      </p>
                    </div>
                  ) : null}
                </div>
                <FormCheckVideoPlayer src={video.videoUrl} />
                <SheetVideoCommentEditor
                  key={`${video.id}-${video.coachComment ?? ""}`}
                  userId={userId}
                  video={video}
                  queryKey={[...queryKey]}
                  quota={formCheckQuota}
                  weekAlreadyReviewed={formCheckWeeks.has(video.weekNumber)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
