import {
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type MutableRefObject,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { FormCheckAthleteNotesBlocks } from "@/components/shared/FormCheckAthleteNotesBlocks";
import { FormCheckWeekBadge } from "@/components/form-check/FormCheckWeekFilterBar";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { FormCheckPresetCommentChips } from "@/components/shared/FormCheckPresetCommentChips";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { useFormCheckMutations } from "@/hooks/useFormCheckMutations";
import { useIsAdmin } from "@/hooks/useRole";
import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import {
  workoutVideoCommentService,
  type FormCheckThreadType,
} from "@/services/workoutVideoCommentService";
import { pendingTargetsForVideos } from "@/utils/formCheckCommentTargets";
import {
  isFormCheckPending,
  isFormCheckReviewed,
} from "@/utils/formCheckReview";
import { cn } from "@/utils/cn";

function formatUploadedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLoggedRpe(rpe: number | null | undefined): string | null {
  if (rpe == null || Number.isNaN(rpe)) return null;
  return `@${Number(rpe).toFixed(1).replace(/\.0$/, "")}`;
}

function formatLoadKg(kg: number | null | undefined): string | null {
  if (kg == null || Number.isNaN(kg)) return null;
  const n = Number(kg);
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace(/\.0$/, "")} kg`;
}

function formatPrescribedIntensity(video: FormCheckInboxItem): string | null {
  const load = formatLoadKg(video.prescribedLoadKg);
  if (load) return load;
  if (video.percentOneRm != null && video.percentOneRm > 0) {
    return `${(video.percentOneRm / 100).toFixed(1)}%`;
  }
  return null;
}

function PrescribedMetric({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-200/80">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-sm font-semibold tabular-nums text-white">
        {value ?? "—"}
      </p>
    </div>
  );
}

function setLoadLabel(video: FormCheckInboxItem): string | null {
  return formatLoadKg(video.actualLoad) ?? formatPrescribedIntensity(video);
}

function AllSetsLoadStrip({ videos }: { videos: FormCheckInboxItem[] }) {
  if (videos.length <= 1) return null;

  const rows = videos.map((video) => ({
    id: video.id,
    setNumber: video.setNumber,
    load: setLoadLabel(video),
    rpe: formatLoggedRpe(video.actualRpe) ?? video.targetRpe?.trim() ?? null,
    reps:
      video.actualReps != null
        ? `${video.actualReps}`
        : video.repScheme?.trim() || null,
  }));

  if (rows.every((row) => !row.load && !row.rpe && !row.reps)) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-b border-gray-200 bg-gray-50/80 px-4 py-2 dark:border-gray-700 dark:bg-gray-900/40">
      {rows.map((row) => (
        <span
          key={row.id}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-gray-800 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:ring-gray-600"
        >
          <span className="text-gray-500 dark:text-gray-400">
            Set {row.setNumber}
          </span>
          {row.load ? (
            <span className="font-mono tabular-nums">{row.load}</span>
          ) : null}
          {row.reps ? <span className="text-gray-500">{row.reps}</span> : null}
          {row.rpe ? (
            <span className="text-gray-500 dark:text-gray-400">{row.rpe}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

function PrescribedValues({ video }: { video: FormCheckInboxItem }) {
  const sets =
    video.prescriptionSets != null
      ? video.prescriptionSets === 1
        ? `Set ${video.setNumber}`
        : String(video.prescriptionSets)
      : null;
  const reps = video.repScheme?.trim() || null;
  const load = formatPrescribedIntensity(video);
  const rpe = video.targetRpe?.trim() || null;

  const hasRx = sets != null || reps != null || load != null || rpe != null;

  if (!hasRx) return null;

  return (
    <div className="border-b border-white/10 bg-gray-950 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
        Prescribed
      </p>
      <p className="mt-1 text-base font-bold leading-tight text-white">
        {video.exerciseName}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PrescribedMetric label="Sets" value={sets} />
        <PrescribedMetric label="Reps" value={reps} />
        <PrescribedMetric label="Load" value={load} />
        <PrescribedMetric label="RPE" value={rpe} />
      </div>
    </div>
  );
}

function PrescriptionGlance({ video }: { video: FormCheckInboxItem }) {
  const sets =
    video.prescriptionSets != null
      ? video.prescriptionSets === 1
        ? `Set ${video.setNumber}`
        : `${video.prescriptionSets} sets`
      : null;
  const reps = video.repScheme?.trim() || null;
  const load = formatPrescribedIntensity(video);
  const rpe = video.targetRpe?.trim() ? `RPE ${video.targetRpe.trim()}` : null;
  const parts = [sets, reps, load, rpe].filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/80 px-3 py-2 dark:border-indigo-900/50 dark:bg-indigo-950/30">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
        Prescribed
        {video.setNumber != null ? ` · Set ${video.setNumber}` : ""}
      </p>
      <p className="mt-0.5 text-sm font-medium text-indigo-950 dark:text-indigo-100">
        {parts.join(" · ")}
      </p>
    </div>
  );
}

function AthleteLoggedValues({ video }: { video: FormCheckInboxItem }) {
  const parts: string[] = [];
  if (video.actualSets != null) parts.push(`${video.actualSets} sets`);
  if (video.actualReps != null) parts.push(`${video.actualReps} reps`);
  const load = formatLoadKg(video.actualLoad);
  if (load) parts.push(load);
  const rpe = formatLoggedRpe(video.actualRpe);
  if (rpe) parts.push(rpe);

  if (parts.length === 0) return null;

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-900/50 dark:bg-emerald-950/30">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        Athlete logged
        {video.setNumber != null ? ` · Set ${video.setNumber}` : ""}
      </p>
      <p className="mt-0.5 text-sm font-medium text-emerald-950 dark:text-emerald-100">
        {parts.join(" · ")}
      </p>
    </div>
  );
}

function ExerciseContextChips({ video }: { video: FormCheckInboxItem }) {
  const chips: string[] = [];

  if (video.programName) chips.push(video.programName);
  if (video.exerciseCategory) chips.push(video.exerciseCategory);

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

function formatReviewDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ThreadRole = "athlete" | "coach" | "assistant_coach" | "admin" | "system";

function normalizeThreadRole(value: string | null | undefined): ThreadRole {
  const role = (value ?? "").trim().toLowerCase();
  if (role.includes("athlete") || role === "user") return "athlete";
  if (role.includes("assistant")) return "assistant_coach";
  if (role.includes("admin")) return "admin";
  if (role.includes("coach")) return "coach";
  return "system";
}

function roleLabel(role: ThreadRole): string {
  switch (role) {
    case "athlete":
      return "Athlete";
    case "assistant_coach":
      return "Assistant Coach";
    case "coach":
      return "Coach";
    case "admin":
      return "Admin";
    default:
      return "System";
  }
}

function roleChipClass(role: ThreadRole): string {
  switch (role) {
    case "athlete":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "assistant_coach":
      return "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200";
    case "coach":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
    case "admin":
      return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }
}

function SavedCoachFeedback({
  comment,
  updatedAt,
  fromPriorUpload = false,
  athleteReply,
  athleteRepliedAt,
}: {
  comment: string;
  updatedAt?: string | null;
  fromPriorUpload?: boolean;
  athleteReply?: string | null;
  athleteRepliedAt?: string | null;
}) {
  const reviewDate = formatReviewDate(updatedAt);
  const reply = athleteReply?.trim() ?? "";
  const replyDate = formatReviewDate(athleteRepliedAt);
  return (
    <div
      className={cn(
        "mb-3 rounded-lg border px-3 py-2.5",
        fromPriorUpload
          ? "border-amber-200 bg-amber-50/90 dark:border-amber-800/50 dark:bg-amber-950/30"
          : "border-indigo-200 bg-indigo-50/90 dark:border-indigo-800/50 dark:bg-indigo-950/30",
      )}
    >
      <div
        className={cn(
          "mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide",
          fromPriorUpload
            ? "text-amber-800 dark:text-amber-300"
            : "text-indigo-700 dark:text-indigo-300",
        )}
      >
        <CheckCircle2 className="h-3 w-3" />
        {fromPriorUpload ? "Earlier feedback" : "Saved coach feedback"}
        {reviewDate ? (
          <span className="font-normal normal-case text-gray-500 dark:text-gray-400">
            · {reviewDate}
          </span>
        ) : null}
      </div>
      <LinkifiedText
        text={comment}
        className="text-sm leading-relaxed text-gray-900 dark:text-gray-100"
      />
      {fromPriorUpload ? (
        <p className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-400">
          From a previous upload of this set — latest video still needs review.
        </p>
      ) : null}
      {reply ? (
        <div className="mt-2.5 rounded-md border border-gray-200 bg-white/80 px-2.5 py-2 dark:border-gray-600 dark:bg-gray-900/50">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            Athlete reply
            {replyDate ? (
              <span className="font-normal normal-case text-gray-500 dark:text-gray-400">
                {" "}
                · {replyDate}
              </span>
            ) : null}
          </p>
          <LinkifiedText
            text={reply}
            className="text-sm leading-relaxed text-gray-900 dark:text-gray-100"
          />
        </div>
      ) : null}
    </div>
  );
}

function SetCommentPanelWithBulk({
  video,
  allVideos,
  exerciseName,
  draftByVideoId,
  userId,
  onGoToNextExercise,
  hasNextPendingExercise,
  focusCommentId,
  focusMessageId,
  focusThreadType,
  focusAction,
}: {
  video: FormCheckInboxItem;
  allVideos: FormCheckInboxItem[];
  exerciseName: string;
  draftByVideoId: MutableRefObject<Map<string, string>>;
  userId: string;
  onGoToNextExercise?: () => void;
  hasNextPendingExercise?: boolean;
  focusCommentId?: string | null;
  focusMessageId?: string | null;
  focusThreadType?: FormCheckThreadType | null;
  focusAction?: string | null;
}) {
  const { saveCommentMutation, bulkApplyMutation } =
    useFormCheckMutations(userId);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const threadMessageRefs = useRef(new Map<string, HTMLDivElement>());

  const savedComment = video.coachComment?.trim() ?? "";
  const showSavedFeedback = savedComment.length > 0;
  const feedbackFromPriorUpload =
    showSavedFeedback && isFormCheckPending(video);
  const feedbackLocked = showSavedFeedback && isFormCheckReviewed(video);
  const effectiveThreadType: FormCheckThreadType = focusThreadType ?? "workout";
  const isFocusedThread =
    !!focusCommentId &&
    !!video.coachCommentId &&
    video.coachCommentId === focusCommentId;
  const [isEditing, setIsEditing] = useState(() => {
    const draft = draftByVideoId.current.get(video.id);
    const locked =
      Boolean(video.coachComment?.trim()) && isFormCheckReviewed(video);
    if (locked) return draft != null;
    return true;
  });
  const [comment, setComment] = useState(() => {
    const draft = draftByVideoId.current.get(video.id);
    if (draft != null) return draft;
    if (feedbackLocked || feedbackFromPriorUpload) return "";
    return video.coachComment ?? "";
  });
  const [replyingToAthlete, setReplyingToAthlete] = useState(false);
  const athleteReplyText = video.athleteReply?.trim() ?? "";
  const { data: threadState } = useQuery({
    queryKey: [
      "form-check-comment-thread",
      effectiveThreadType,
      video.coachCommentId,
    ],
    queryFn: () =>
      effectiveThreadType === "sheets"
        ? workoutVideoCommentService.getSheetsThread(video.coachCommentId!)
        : workoutVideoCommentService.getWorkoutThread(video.coachCommentId!),
    enabled: !!video.coachCommentId,
    staleTime: 30_000,
  });
  const threadMessages = useMemo(
    () => threadState?.messages ?? [],
    [threadState?.messages],
  );
  const latestThreadMessage =
    threadMessages.length > 0
      ? threadMessages[threadMessages.length - 1]
      : null;
  const latestMessageRole = normalizeThreadRole(latestThreadMessage?.role);
  const needsReplyFromThread =
    latestThreadMessage != null && latestMessageRole === "athlete";
  const effectiveReplyLimit =
    threadState?.replyLimit ?? video.coachReplyLimit ?? null;
  const effectiveRepliesUsed =
    threadState?.repliesUsed ?? video.coachReplyUsed ?? null;
  const effectiveRepliesRemaining =
    threadState?.repliesRemaining ??
    video.coachRepliesRemaining ??
    (effectiveReplyLimit != null && effectiveRepliesUsed != null
      ? Math.max(0, effectiveReplyLimit - effectiveRepliesUsed)
      : null);
  const effectiveReplyBlocked =
    (threadState?.canAthleteReply != null
      ? !threadState.canAthleteReply
      : undefined) ??
    video.coachReplyBlocked ??
    false;
  const effectiveReplyLockReason =
    threadState?.replyLockReason ?? video.coachReplyBlockReason ?? null;
  const replyLimitKnown =
    effectiveReplyLimit != null ||
    effectiveRepliesRemaining != null ||
    effectiveReplyBlocked;
  const repliesRemaining = effectiveRepliesRemaining;
  const replyBlocked =
    effectiveReplyBlocked === true ||
    (repliesRemaining != null && repliesRemaining <= 0);
  const hasAthleteContext =
    Boolean(video.setNotes?.trim() || video.athleteNotes?.trim()) ||
    video.actualSets != null ||
    video.actualReps != null ||
    video.actualLoad != null ||
    video.actualRpe != null;
  const [threadCollapsed, setThreadCollapsed] = useState(false);
  const showThreadPanel = !threadCollapsed;

  const updateComment = (next: string) => {
    setComment(next);
    if (next.trim()) draftByVideoId.current.set(video.id, next);
    else draftByVideoId.current.delete(video.id);
  };

  const startEditing = () => {
    setComment(savedComment);
    setIsEditing(true);
  };

  const startReply = () => {
    if (!athleteReplyText || replyBlocked) return;
    setReplyingToAthlete(true);
    setIsEditing(true);
    const intro = `Replying to athlete:`;
    const quoted = `> ${athleteReplyText.replace(/\n/g, "\n> ")}`;
    const base = savedComment ? `${savedComment}\n\n` : "";
    updateComment(`${base}${intro}\n${quoted}\n\n`);
  };

  useEffect(() => {
    if (!isFocusedThread) return;
    if (focusAction !== "reply") return;
    requestAnimationFrame(() => {
      composerRef.current?.focus();
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [isFocusedThread, focusAction]);

  useEffect(() => {
    if (!isFocusedThread || !focusMessageId) return;
    const el = threadMessageRefs.current.get(focusMessageId);
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [isFocusedThread, focusMessageId, threadMessages]);

  const cancelEditing = () => {
    if (!feedbackLocked) return;
    draftByVideoId.current.delete(video.id);
    setComment("");
    setIsEditing(false);
  };

  const pendingTargets = useMemo(
    () => pendingTargetsForVideos(allVideos),
    [allVideos],
  );
  const pendingSiblings = pendingTargets.length;

  const handleSaveSuccess = () => {
    draftByVideoId.current.delete(video.id);
    setReplyingToAthlete(false);
    if (feedbackLocked) {
      setComment("");
      setIsEditing(false);
    }
    const exercisePendingLeft = allVideos.filter(
      (v) => isFormCheckPending(v) && v.id !== video.id,
    ).length;
    if (
      exercisePendingLeft === 0 &&
      hasNextPendingExercise &&
      onGoToNextExercise
    ) {
      onGoToNextExercise();
    }
  };

  const saving = saveCommentMutation.isPending || bulkApplyMutation.isPending;

  return (
    <div className="flex h-full flex-col p-3 lg:p-4">
      {hasAthleteContext || hasPrescription(video) ? (
        <div className="mb-3 space-y-2">
          {hasPrescription(video) ? <PrescriptionGlance video={video} /> : null}
          {(video.actualSets != null ||
            video.actualReps != null ||
            video.actualLoad != null ||
            video.actualRpe != null) && <AthleteLoggedValues video={video} />}
          {(video.setNotes?.trim() || video.athleteNotes?.trim()) && (
            <FormCheckAthleteNotesBlocks
              setNotes={video.setNotes}
              setNumber={video.setNumber}
              athleteNotes={video.athleteNotes}
            />
          )}
        </div>
      ) : null}

      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        <MessageSquare className="h-3 w-3" />
        Coach comment
      </div>
      <FormCheckPresetCommentChips
        className="mb-2"
        disabled={saving || (feedbackLocked && !isEditing)}
        onSelect={updateComment}
      />

      {showSavedFeedback && (!isEditing || feedbackFromPriorUpload) ? (
        <SavedCoachFeedback
          comment={savedComment}
          updatedAt={video.coachCommentUpdatedAt}
          fromPriorUpload={feedbackFromPriorUpload}
          athleteReply={video.athleteReply}
          athleteRepliedAt={video.athleteRepliedAt}
        />
      ) : null}

      {feedbackLocked && !isEditing && !athleteReplyText ? (
        <button
          type="button"
          onClick={startEditing}
          className="mt-1 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
        >
          Edit feedback
        </button>
      ) : (
        <>
          {threadMessages.length > 0 || athleteReplyText ? (
            <div className="mb-2">
              <button
                type="button"
                onClick={() => setThreadCollapsed((prev) => !prev)}
                className="mb-2 flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900/50 dark:text-gray-200"
              >
                <span className="flex items-center gap-2">
                  Thread
                  {needsReplyFromThread ? (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                      Needs reply
                    </span>
                  ) : null}
                  {threadMessages.length > 0 ? (
                    <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">
                      {threadMessages.length} message
                      {threadMessages.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                    showThreadPanel && "rotate-180",
                  )}
                />
              </button>

              {showThreadPanel ? (
                <div className="space-y-2">
                  {threadMessages.length > 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-600 dark:bg-gray-900/50">
                      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                        {threadMessages.map((message, index) => {
                          const role = normalizeThreadRole(message.role);
                          const isNewest = index === threadMessages.length - 1;
                          const isTargeted =
                            !!focusMessageId && message.id === focusMessageId;
                          return (
                            <div
                              key={message.id}
                              ref={(el) => {
                                if (el)
                                  threadMessageRefs.current.set(message.id, el);
                                else
                                  threadMessageRefs.current.delete(message.id);
                              }}
                              className={cn(
                                "rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 dark:border-gray-700 dark:bg-gray-800/60",
                                isNewest &&
                                  "border-indigo-300 bg-indigo-50/70 dark:border-indigo-700 dark:bg-indigo-900/20",
                                isTargeted &&
                                  "ring-1 ring-amber-400 dark:ring-amber-500",
                              )}
                            >
                              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                                <span
                                  className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                    roleChipClass(role),
                                  )}
                                >
                                  {roleLabel(role)}
                                </span>
                                {message.createdAt ? (
                                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {formatReviewDate(message.createdAt)}
                                  </span>
                                ) : null}
                              </div>
                              <LinkifiedText
                                text={message.message}
                                className="text-xs leading-relaxed text-gray-800 dark:text-gray-100"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {athleteReplyText ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-2.5 dark:border-gray-600 dark:bg-gray-900/40">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                        Athlete reply
                      </p>
                      <LinkifiedText
                        text={athleteReplyText}
                        className="mt-1 text-xs leading-relaxed text-gray-800 dark:text-gray-100"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {replyLimitKnown ? (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              replyBlocked
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                            )}
                          >
                            {replyBlocked
                              ? "Replies blocked"
                              : repliesRemaining == null
                                ? "Replies allowed"
                                : `${repliesRemaining} repl${repliesRemaining === 1 ? "y" : "ies"} left`}
                          </span>
                        ) : null}
                        {effectiveReplyLockReason ? (
                          <span className="text-[10px] text-rose-700 dark:text-rose-300">
                            {effectiveReplyLockReason}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={saving || replyBlocked}
                          onClick={startReply}
                          className="rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
                        >
                          Reply in this thread
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <textarea
            ref={composerRef}
            value={comment}
            onChange={(e) => updateComment(e.target.value)}
            rows={4}
            placeholder={
              feedbackFromPriorUpload
                ? `New feedback for ${exerciseName}, set ${video.setNumber}…`
                : `Feedback for ${exerciseName}, set ${video.setNumber}…`
            }
            className="min-h-[88px] w-full flex-1 resize-y rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />

          <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
            Uploaded {formatUploadedAt(video.createdAt)}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!comment.trim() || saving || !video.exerciseLogId}
              onClick={() => {
                if (!video.exerciseLogId) return;
                saveCommentMutation.mutate(
                  {
                    exerciseLogId: video.exerciseLogId,
                    setNumber: video.setNumber,
                    comment,
                    replyToCommentId:
                      replyingToAthlete && video.coachCommentId
                        ? video.coachCommentId
                        : null,
                    replyThreadType: effectiveThreadType,
                    setLabel: replyingToAthlete
                      ? `Set ${video.setNumber} reply sent`
                      : `Set ${video.setNumber}`,
                  },
                  { onSuccess: handleSaveSuccess },
                );
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {saveCommentMutation.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              )}
              {replyingToAthlete ? "Send reply" : "Save this set"}
            </button>
            {pendingSiblings > 1 ? (
              <button
                type="button"
                disabled={!comment.trim() || saving}
                onClick={() =>
                  bulkApplyMutation.mutate(
                    { targets: pendingTargets, comment: comment.trim() },
                    {
                      onSuccess: () => {
                        draftByVideoId.current.clear();
                        if (hasNextPendingExercise && onGoToNextExercise) {
                          onGoToNextExercise();
                        }
                      },
                    },
                  )
                }
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
              >
                {bulkApplyMutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Apply to all {pendingSiblings} pending sets
              </button>
            ) : null}
            {feedbackLocked ? (
              <button
                type="button"
                onClick={cancelEditing}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              >
                Cancel
              </button>
            ) : null}
            {hasNextPendingExercise && onGoToNextExercise ? (
              <button
                type="button"
                onClick={onGoToNextExercise}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
              >
                Next exercise
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </>
      )}

      {feedbackLocked && !isEditing ? (
        <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
          Uploaded {formatUploadedAt(video.createdAt)}
        </p>
      ) : null}
    </div>
  );
}

function hasPrescription(video: FormCheckInboxItem): boolean {
  return (
    video.prescriptionSets != null ||
    Boolean(video.repScheme?.trim()) ||
    formatPrescribedIntensity(video) != null ||
    Boolean(video.targetRpe?.trim())
  );
}

export const FormCheckInboxExerciseCard = forwardRef<
  HTMLElement,
  {
    id?: string;
    videos: FormCheckInboxItem[];
    showAthleteLink?: boolean;
    isNavActive?: boolean;
    onGoToNextExercise?: () => void;
    hasNextPendingExercise?: boolean;
    /** Prefer this set video when deep-linking from notifications. */
    focusVideoId?: string | null;
    /** Focus a specific thread/comment when deep-linking from notifications. */
    focusCommentId?: string | null;
    /** Focus a specific message in the thread timeline. */
    focusMessageId?: string | null;
    /** Thread source for replies. */
    focusThreadType?: FormCheckThreadType | null;
    /** Optional action hint from notifications (e.g. reply). */
    focusAction?: string | null;
  }
>(function FormCheckInboxExerciseCard(
  {
    id,
    videos,
    showAthleteLink = true,
    isNavActive = false,
    onGoToNextExercise,
    hasNextPendingExercise = false,
    focusVideoId = null,
    focusCommentId = null,
    focusMessageId = null,
    focusThreadType = null,
    focusAction = null,
  },
  forwardedRef,
) {
  const isAdmin = useIsAdmin();
  const cardRef = useRef<HTMLElement>(null);
  const draftByVideoId = useRef(new Map<string, string>());
  const head = videos[0];
  const multiSet = videos.length > 1;
  const reviewedCount = videos.filter((v) => isFormCheckReviewed(v)).length;
  const pendingCount = videos.filter((v) => isFormCheckPending(v)).length;

  const defaultIndex = useMemo(() => {
    if (focusVideoId) {
      const focused = videos.findIndex((v) => v.id === focusVideoId);
      if (focused >= 0) return focused;
    }
    if (focusCommentId) {
      const focusedByComment = videos.findIndex(
        (v) => v.coachCommentId === focusCommentId,
      );
      if (focusedByComment >= 0) return focusedByComment;
    }
    const pending = videos.findIndex((v) => isFormCheckPending(v));
    return pending >= 0 ? pending : 0;
  }, [videos, focusVideoId, focusCommentId]);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(
    () => focusVideoId,
  );

  // Adopt a new deep-link focus when the URL videoId changes.
  const [prevFocusVideoId, setPrevFocusVideoId] = useState(focusVideoId);
  if (focusVideoId !== prevFocusVideoId) {
    setPrevFocusVideoId(focusVideoId);
    if (focusVideoId) setActiveVideoId(focusVideoId);
  }

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
    if (!multiSet || !isNavActive) return;
    const el = cardRef.current;
    if (!el) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLInputElement
      ) {
        return;
      }
      if (
        !el.contains(document.activeElement) &&
        document.activeElement !== el
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

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [multiSet, isNavActive, activeIndex, videos]);

  const active = videos[activeIndex] ?? head;
  const athleteName = head.userName ?? head.userEmail;
  const athleteVideosHref = isAdmin
    ? `/users/${head.userId}?tab=activity&section=videos`
    : `/coach/athletes/${head.userId}?tab=videos`;
  const workoutSessionHref = active.workoutLogId
    ? isAdmin
      ? `/users/${head.userId}?tab=activity&section=logs&logId=${encodeURIComponent(active.workoutLogId)}`
      : `/coach/athletes/${head.userId}?tab=logs&logId=${encodeURIComponent(active.workoutLogId)}`
    : null;

  const setArticleRef = (el: HTMLElement | null) => {
    cardRef.current = el;
    if (typeof forwardedRef === "function") forwardedRef(el);
    else if (forwardedRef) forwardedRef.current = el;
  };

  return (
    <article
      ref={setArticleRef}
      id={id}
      tabIndex={isNavActive ? 0 : -1}
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-sm scroll-mt-52 dark:bg-gray-800",
        isNavActive && "ring-2 ring-indigo-400/60",
        pendingCount > 0
          ? "border-amber-200/80 dark:border-amber-800/50"
          : "border-gray-200 dark:border-gray-700",
      )}
    >
      <header className="border-b border-gray-200 bg-gradient-to-r from-gray-50/90 to-white px-4 py-3 dark:border-gray-700 dark:from-gray-900/50 dark:to-gray-800">
        <div className="flex w-full items-start justify-between gap-3 text-left">
          <div className="min-w-0 flex-1">
            {showAthleteLink ? (
              <Link
                to={athleteVideosHref}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {athleteName}
              </Link>
            ) : null}
            <div className="mt-1.5">
              <FormCheckWeekBadge
                weekNumber={active.weekNumber}
                dayNumber={active.dayNumber}
                dayLabel={active.dayLabel}
              />
            </div>
            <h3 className="mt-1.5 text-lg font-bold leading-tight text-gray-900 dark:text-white">
              {head.exerciseName}
            </h3>
            <ExerciseContextChips video={active} />
            {workoutSessionHref ? (
              <Link
                to={workoutSessionHref}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600 underline-offset-2 hover:underline dark:text-gray-300"
              >
                Open workout session
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
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
              ) : isFormCheckReviewed(active) ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Reviewed
                </span>
              ) : (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  Pending
                </span>
              )}
            </div>
          </div>
        </div>

        {multiSet ? (
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${(reviewedCount / videos.length) * 100}%` }}
            />
          </div>
        ) : null}
      </header>

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
              const load = setLoadLabel(video);
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
                  {load ? (
                    <span
                      className={cn(
                        "font-mono text-[10px] tabular-nums",
                        isActive
                          ? "text-indigo-100"
                          : "text-gray-500 dark:text-gray-400",
                      )}
                    >
                      {load}
                    </span>
                  ) : null}
                  {isFormCheckReviewed(video) ? (
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

      <AllSetsLoadStrip videos={videos} />

      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="bg-black lg:col-span-3">
          {hasPrescription(active) ? <PrescribedValues video={active} /> : null}
          <FormCheckVideoPlayer
            key={active.id}
            src={active.videoUrl}
            downloadFileName={`${head.exerciseName}-set-${active.setNumber}`}
          />
        </div>
        <div className="border-t border-gray-200 lg:col-span-2 lg:border-l lg:border-t-0 dark:border-gray-700">
          <SetCommentPanelWithBulk
            key={`${active.id}:${isFormCheckReviewed(active) ? "r" : "p"}:${active.coachComment ?? ""}`}
            video={active}
            allVideos={videos}
            exerciseName={head.exerciseName}
            draftByVideoId={draftByVideoId}
            userId={head.userId}
            onGoToNextExercise={onGoToNextExercise}
            hasNextPendingExercise={hasNextPendingExercise}
            focusCommentId={focusCommentId}
            focusMessageId={focusMessageId}
            focusThreadType={focusThreadType}
            focusAction={focusAction}
          />
        </div>
      </div>
    </article>
  );
});
