import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Video } from "lucide-react";
import { userService } from "@/services/userService";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import type { SbdBaselineLift, SbdBaselineVideoItemDto } from "@/types/user";

const LIFT_LABELS: Record<SbdBaselineLift, string> = {
  squat: "Squat",
  bench: "Bench Press",
  deadlift: "Deadlift",
};

function CoachCommentEditor({
  userId,
  item,
}: {
  userId: string;
  item: SbdBaselineVideoItemDto;
}) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(item.coachComment ?? "");

  const saveMutation = useMutation({
    mutationFn: (text: string) =>
      userService.commentSbdBaseline(userId, item.lift, text),
    onSuccess: (status) => {
      queryClient.setQueryData(["sbd-baseline", userId], status);
    },
  });

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <MessageSquare className="h-3.5 w-3.5" />
        Coach feedback
      </label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Depth, bar path, bracing, setup cues..."
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      />
      <button
        type="button"
        onClick={() => saveMutation.mutate(comment)}
        disabled={saveMutation.isPending || !comment.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : null}
        Save comment
      </button>
    </div>
  );
}

function LiftCard({
  userId,
  item,
}: {
  userId: string;
  item: SbdBaselineVideoItemDto;
}) {
  const reviewed = Boolean(item.coachComment?.trim());
  const uploaded = Boolean(item.videoUrl);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          {LIFT_LABELS[item.lift]}
        </h4>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            !uploaded
              ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              : reviewed
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {!uploaded ? "Missing" : reviewed ? "Reviewed" : "Pending review"}
        </span>
      </div>

      {item.videoUrl ? (
        <FormCheckVideoPlayer
          src={item.videoUrl}
          compact
          downloadFileName={`${item.lift}-baseline.mp4`}
          className="mb-3 overflow-hidden rounded-lg"
        />
      ) : (
        <div className="mb-3 flex h-36 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-900/20 dark:text-gray-400">
          No video uploaded
        </div>
      )}

      {item.notes ? (
        <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="font-semibold">Athlete notes:</span> {item.notes}
        </p>
      ) : null}

      {uploaded ? (
        <CoachCommentEditor
          key={`${item.lift}-${item.coachComment ?? ""}`}
          userId={userId}
          item={item}
        />
      ) : null}
    </div>
  );
}

type Props = {
  userId: string;
};

export function SbdBaselinePanel({ userId }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["sbd-baseline", userId],
    queryFn: () => userService.getSbdBaseline(userId),
    enabled: Boolean(userId),
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Video className="h-5 w-5 text-indigo-500" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          SBD baseline videos
        </h2>
        {data ? (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {data.uploadedCount}/3 uploaded
            {data.skipped ? " · skipped by athlete" : ""}
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : isError ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Baseline videos are available after intake is submitted.
        </p>
      ) : data ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {data.lifts.map((lift) => (
            <LiftCard key={lift.lift} userId={userId} item={lift} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
