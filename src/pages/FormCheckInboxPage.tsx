import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
  User,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import {
  formCheckInboxService,
  type FormCheckInboxAthlete,
  type FormCheckInboxItem,
} from "@/services/formCheckInboxService";
import { sheetsSetVideoCommentService } from "@/services/sheetsSetVideoService";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";
import { cn } from "@/utils/cn";

type PlanTier = "mega" | "ultra";
type ReviewFilter = "pending" | "all";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function athleteLabel(
  athlete: Pick<FormCheckInboxAthlete, "userName" | "userEmail">,
) {
  return athlete.userName?.trim() || athlete.userEmail;
}

function InboxCommentEditor({ video }: { video: FormCheckInboxItem }) {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState(video.coachComment ?? "");

  const saveMutation = useMutation({
    mutationFn: () => {
      const trimmed = comment.trim();
      if (video.source === "program") {
        if (!video.exerciseLogId) {
          throw new Error("Missing exercise log");
        }
        return workoutVideoCommentService.upsert({
          exerciseLogId: video.exerciseLogId,
          setNumber: video.setNumber,
          comment: trimmed,
        });
      }
      return sheetsSetVideoCommentService.upsert({
        sheetsSetVideoId: video.id,
        comment: trimmed,
      });
    },
    onSuccess: () => {
      toast.success("Comment saved");
      void queryClient.invalidateQueries({ queryKey: ["form-check-inbox"] });
      void queryClient.invalidateQueries({
        queryKey: ["form-check-inbox-athletes"],
      });
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

function formatVideoContext(video: FormCheckInboxItem): string {
  if (video.source === "program") {
    const programLabel = video.programName ?? "Program";
    return `${programLabel} · Set ${video.setNumber} · ${formatDateTime(video.createdAt)}`;
  }
  return `${video.tabName ?? "Sheet"} · W${video.weekNumber} · Day ${video.dayNumber} · Set ${video.setNumber} · ${formatDateTime(video.createdAt)}`;
}

function InboxVideoCard({
  video,
  showAthleteLink = true,
}: {
  video: FormCheckInboxItem;
  showAthleteLink?: boolean;
}) {
  const athleteName = video.userName ?? video.userEmail;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {showAthleteLink ? (
              <Link
                to={`/users/${video.userId}`}
                className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {athleteName}
              </Link>
            ) : null}
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {video.exerciseName}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                video.source === "program"
                  ? "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
              )}
            >
              {video.source === "program" ? "Program" : "Sheet"}
            </span>
            {video.reviewed ? (
              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                Reviewed
              </span>
            ) : (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Pending
              </span>
            )}
          </div>
        </div>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          {formatVideoContext(video)}
        </p>
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
      <InboxCommentEditor video={video} />
    </div>
  );
}

function ReviewFilterBar({
  filter,
  onChange,
  pendingCount,
}: {
  filter: ReviewFilter;
  onChange: (next: ReviewFilter) => void;
  pendingCount?: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange("pending")}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
          filter === "pending"
            ? "bg-indigo-600 text-white"
            : "border border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
        )}
      >
        Needs review
        {pendingCount != null && pendingCount > 0 && (
          <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
            {pendingCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange("all")}
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
  );
}

function AthleteRow({
  athlete,
  onSelect,
}: {
  athlete: FormCheckInboxAthlete;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
        <User className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {athleteLabel(athlete)}
        </p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {athlete.userEmail}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {athlete.pendingCount > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            {athlete.pendingCount} pending
          </span>
        ) : (
          <span className="text-[11px] text-gray-500 dark:text-gray-400">
            {athlete.totalCount} video{athlete.totalCount === 1 ? "" : "s"}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
    </button>
  );
}

export function FormCheckInboxPage() {
  const [planTier, setPlanTier] = useState<PlanTier>("mega");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("pending");

  const { data: athletesData, isLoading: athletesLoading } = useQuery({
    queryKey: ["form-check-inbox-athletes", reviewFilter],
    queryFn: () =>
      formCheckInboxService.listAthletes({
        uncommentedOnly: reviewFilter === "pending",
      }),
  });

  const selectedAthlete = useMemo(() => {
    if (!selectedUserId || !athletesData) return null;
    const all = [...athletesData.mega, ...athletesData.ultra];
    return all.find((a) => a.userId === selectedUserId) ?? null;
  }, [athletesData, selectedUserId]);

  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["form-check-inbox", reviewFilter, selectedUserId],
    queryFn: () =>
      formCheckInboxService.list({
        userId: selectedUserId!,
        uncommentedOnly: reviewFilter === "pending",
        limit: 100,
      }),
    enabled: !!selectedUserId,
  });

  const megaAthletes = athletesData?.mega ?? [];
  const ultraAthletes = athletesData?.ultra ?? [];
  const tierAthletes = planTier === "mega" ? megaAthletes : ultraAthletes;

  const megaPending = megaAthletes.reduce((sum, a) => sum + a.pendingCount, 0);
  const ultraPending = ultraAthletes.reduce(
    (sum, a) => sum + a.pendingCount,
    0,
  );
  const globalPending = megaPending + ultraPending;

  const subtitle = useMemo(() => {
    if (selectedUserId && selectedAthlete) {
      return reviewFilter === "pending"
        ? `${selectedAthlete.pendingCount} video${selectedAthlete.pendingCount === 1 ? "" : "s"} waiting for review`
        : `${selectedAthlete.totalCount} form-check video${selectedAthlete.totalCount === 1 ? "" : "s"} total`;
    }
    if (globalPending === 0) {
      return "All caught up — no videos waiting for review";
    }
    return `${globalPending} video${globalPending === 1 ? "" : "s"} waiting for review`;
  }, [selectedUserId, selectedAthlete, reviewFilter, globalPending]);

  const handlePlanChange = (tier: PlanTier) => {
    setPlanTier(tier);
    setSelectedUserId(null);
  };

  const handleReviewFilterChange = (next: ReviewFilter) => {
    setReviewFilter(next);
    if (next === "pending") setSelectedUserId(null);
  };

  const videos = videosData?.items ?? [];

  return (
    <div>
      <PageHeader title="Form Check Inbox" description={subtitle} />

      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4 dark:border-gray-700">
        {(["mega", "ultra"] as const).map((tier) => {
          const pending = tier === "mega" ? megaPending : ultraPending;
          const count =
            tier === "mega" ? megaAthletes.length : ultraAthletes.length;
          return (
            <button
              key={tier}
              type="button"
              onClick={() => handlePlanChange(tier)}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-semibold uppercase tracking-wide transition-colors",
                planTier === tier
                  ? "bg-indigo-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800",
              )}
            >
              {tier}
              <span className="ml-2 text-xs font-medium opacity-80">
                {count} athlete{count === 1 ? "" : "s"}
                {pending > 0 ? ` · ${pending} pending` : ""}
              </span>
            </button>
          );
        })}
      </div>

      {selectedUserId ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setSelectedUserId(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to {planTier.toUpperCase()} athletes
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/users/${selectedUserId}`}
                className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {selectedAthlete
                  ? athleteLabel(selectedAthlete)
                  : "Athlete profile"}
              </Link>
              <ReviewFilterBar
                filter={reviewFilter}
                onChange={setReviewFilter}
                pendingCount={selectedAthlete?.pendingCount}
              />
            </div>
          </div>

          {videosLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <Video className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {reviewFilter === "pending"
                  ? "No videos waiting for review for this athlete."
                  : "No form-check videos for this athlete yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {videos.map((video) => (
                <InboxVideoCard
                  key={video.id}
                  video={video}
                  showAthleteLink={false}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <ReviewFilterBar
            filter={reviewFilter}
            onChange={handleReviewFilterChange}
            pendingCount={planTier === "mega" ? megaPending : ultraPending}
          />

          {athletesLoading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : tierAthletes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
              <User className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {reviewFilter === "pending"
                  ? `No ${planTier.toUpperCase()} athletes with videos waiting for review.`
                  : `No ${planTier.toUpperCase()} athletes with form-check videos yet.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {tierAthletes.map((athlete) => (
                <AthleteRow
                  key={athlete.userId}
                  athlete={athlete}
                  onSelect={() => setSelectedUserId(athlete.userId)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
