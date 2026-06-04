import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Loader2, MessageSquare } from "lucide-react";
import toast from "react-hot-toast";
import { Spinner } from "@/components/ui/Spinner";
import {
  sheetsSetVideoCommentService,
  sheetsSetVideoService,
  type AdminSheetsSetVideo,
} from "@/services/sheetsSetVideoService";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SheetVideoCommentEditor({
  userId,
  video,
  queryKey,
}: {
  userId: string;
  video: AdminSheetsSetVideo;
  queryKey: unknown[];
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

interface UserSheetsWorkoutVideosPanelProps {
  userId: string;
}

export function UserSheetsWorkoutVideosPanel({
  userId,
}: UserSheetsWorkoutVideosPanelProps) {
  const queryKey = ["admin-user-sheets-set-videos", userId] as const;

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => sheetsSetVideoService.listForUser(userId),
  });

  const videos = data ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FileSpreadsheet className="h-5 w-5 text-gray-500 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sheet workout videos
        </h2>
        {data && (
          <span className="ml-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {videos.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : videos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          No sheet workout videos uploaded yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {videos.map((video) => (
            <div
              key={video.id}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {video.exerciseName}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {video.tabName} · W{video.weekNumber} · Day {video.dayNumber}{" "}
                  · Set {video.setNumber} · {formatDateTime(video.createdAt)}
                </p>
              </div>
              <video
                src={video.videoUrl}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full bg-black object-contain"
              />
              <SheetVideoCommentEditor
                userId={userId}
                video={video}
                queryKey={[...queryKey]}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
