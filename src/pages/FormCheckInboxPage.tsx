import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Video } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import {
  formCheckInboxService,
  type FormCheckInboxItem,
} from "@/services/formCheckInboxService";
import { sheetsSetVideoCommentService } from "@/services/sheetsSetVideoService";
import { cn } from "@/utils/cn";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InboxCommentEditor({ video }: { video: FormCheckInboxItem }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(video.coachComment ?? "");

  const saveMutation = useMutation({
    mutationFn: () =>
      sheetsSetVideoCommentService.upsert({
        sheetsSetVideoId: video.id,
        comment: comment.trim(),
      }),
    onSuccess: () => {
      toast.success("Comment saved");
      void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
      void queryClient.invalidateQueries({
        queryKey: ["form-check-pending-count"],
      });
    },
    onError: () => toast.error("Failed to save comment"),
  });

  return (
    <div className="border-t border-gray-200 p-3 dark:border-gray-700">
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

function InboxVideoCard({ video }: { video: FormCheckInboxItem }) {
  const athleteLabel = video.userName ?? video.userEmail;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/users/${video.userId}`}
              className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {athleteLabel}
            </Link>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {video.exerciseName}
            </p>
          </div>
          {video.reviewed ? (
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
          {video.tabName} · W{video.weekNumber} · Day {video.dayNumber} · Set{" "}
          {video.setNumber} · {formatDateTime(video.createdAt)}
        </p>
      </div>
      <FormCheckVideoPlayer src={video.videoUrl} />
      <InboxCommentEditor video={video} />
    </div>
  );
}

export function FormCheckInboxPage() {
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  const { data, isLoading } = useQuery({
    queryKey: ["form-check-inbox", filter],
    queryFn: () =>
      formCheckInboxService.list({
        uncommentedOnly: filter === "pending",
        limit: 50,
      }),
  });

  const items = data?.items ?? [];
  const pendingCount = data?.pendingCount ?? 0;

  const subtitle = useMemo(() => {
    if (pendingCount === 0)
      return "All caught up — no videos waiting for review";
    return `${pendingCount} video${pendingCount === 1 ? "" : "s"} waiting for review`;
  }, [pendingCount]);

  return (
    <div>
      <PageHeader title="Form Check Inbox" description={subtitle} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilter("pending")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            filter === "pending"
              ? "bg-indigo-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
          )}
        >
          Needs review
          {pendingCount > 0 && (
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            filter === "all"
              ? "bg-indigo-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
          )}
        >
          All videos
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <Video className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {filter === "pending"
              ? "No videos waiting for review."
              : "No form-check videos yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {items.map((video) => (
            <InboxVideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
