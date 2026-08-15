import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertCircle, MessageSquareReply, RefreshCw, Send } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { useAuth } from "@/hooks/useAuth";
import { useFormCheckPendingCount } from "@/hooks/useFormCheckPendingCount";
import { FormCheckWorkSplitBanner } from "@/components/form-check/FormCheckWorkSplitBanner";
import { buildFormCheckThreadRoute } from "@/utils/formCheckRoutes";
import { formCheckQueueRefetchInterval } from "@/utils/formCheckQueue";
import {
  formCheckActionQueueService,
  type FormCheckActionQueueItem,
  type FormCheckActionQueueResponse,
  type FormCheckQueuePriority,
  type FormCheckQueueState,
  type FormCheckQueueTab,
} from "@/services/formCheckActionQueueService";
import { workoutVideoCommentService } from "@/services/workoutVideoCommentService";

const TABS: Array<{ key: FormCheckQueueTab; label: string }> = [
  { key: "needs_reply", label: "Needs reply" },
  { key: "unread", label: "Unread" },
  { key: "overdue", label: "Overdue" },
  { key: "resolved", label: "Resolved / Replied" },
];

function basePollInterval(tab: FormCheckQueueTab): number {
  return tab === "resolved" ? 45_000 : 20_000;
}

function nextPollInterval(baseMs: number, failures: number): number {
  if (failures <= 0) return baseMs;
  return Math.min(Math.round(baseMs * Math.pow(1.5, failures)), 120_000);
}

function isBusyError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    return (
      error.code === "ECONNABORTED" ||
      status === 408 ||
      status === 429 ||
      (status != null && status >= 500)
    );
  }
  if (typeof error === "object" && error != null) {
    const maybeBusy = (error as { busy?: unknown }).busy;
    if (maybeBusy === true) return true;
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status === 408 || status === 429 || status >= 500;
    }
  }
  return false;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function stateLabel(state: FormCheckQueueState): string {
  switch (state) {
    case "needs_reply":
      return "Needs reply";
    case "unread":
      return "Unread";
    case "overdue":
      return "Overdue";
    case "replied":
      return "Replied";
    case "resolved":
      return "Resolved";
    default:
      return "Open";
  }
}

function stateTone(state: FormCheckQueueState): string {
  switch (state) {
    case "needs_reply":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "unread":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "overdue":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
    case "replied":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200";
    case "resolved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }
}

function priorityTone(priority: FormCheckQueuePriority): string {
  if (priority === "P0") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  }
  if (priority === "P1") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
  if (priority === "P2") {
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
}

function priorityLabel(priority: FormCheckQueuePriority): string {
  if (priority === "P0" || priority === "P1" || priority === "P2")
    return priority;
  return "Open";
}

function uploadLinkageState(
  item: FormCheckActionQueueItem,
): "blocked" | "clear" | "pending" {
  if (item.uploadIncidentBlocking === true) return "blocked";
  if ((item.uploadIncidentCount ?? 0) > 0) return "blocked";
  if (item.uploadIncidentBlocking === false || item.uploadIncidentCount === 0) {
    return "clear";
  }
  return "pending";
}

function deepLink(item: FormCheckActionQueueItem, action?: "reply"): string {
  return buildFormCheckThreadRoute(
    {
      userId: item.athleteId,
      videoId: item.videoId,
      commentId: item.commentId,
      messageId: item.messageId,
      threadType: item.threadType,
    },
    action,
  );
}

function itemReplyBlocked(item: FormCheckActionQueueItem): boolean {
  return (
    item.replyBlocked ||
    (item.repliesRemaining != null && item.repliesRemaining <= 0)
  );
}

function replyLockText(item: FormCheckActionQueueItem): string | null {
  if (item.replyLockReason) return item.replyLockReason;
  if (itemReplyBlocked(item))
    return "Replies are currently blocked for this thread.";
  return null;
}

function sortQueue(items: FormCheckActionQueueItem[], tab: FormCheckQueueTab) {
  const copy = [...items];
  copy.sort((a, b) => {
    const aAt = new Date(a.latestActivityAt).getTime();
    const bAt = new Date(b.latestActivityAt).getTime();
    const byTime = tab === "resolved" ? bAt - aAt : aAt - bAt;
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
  return copy;
}

function tabCountTotal(counts: Record<FormCheckQueueTab, number>): number {
  return counts.needs_reply + counts.unread + counts.overdue + counts.resolved;
}

function mergeDelta(
  previous: FormCheckActionQueueResponse,
  delta: FormCheckActionQueueResponse,
): FormCheckActionQueueResponse {
  const removed = new Set(delta.removedIds);
  const map = new Map(previous.items.map((item) => [item.id, item]));
  for (const id of removed) map.delete(id);
  for (const item of delta.items) map.set(item.id, item);
  const items = Array.from(map.values());
  const shouldApplyDeltaCounts =
    delta.tabCountsSource === "payload" || tabCountTotal(delta.tabCounts) > 0;
  return {
    ...previous,
    ...delta,
    items,
    total: delta.total || items.length,
    limit: delta.limit || previous.limit,
    offset: delta.offset,
    tabCounts: shouldApplyDeltaCounts ? delta.tabCounts : previous.tabCounts,
    tabCountsSource: shouldApplyDeltaCounts
      ? delta.tabCountsSource
      : previous.tabCountsSource,
  };
}

function replyErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Failed to send reply";
  const payload = (error.response?.data ?? null) as Record<
    string,
    unknown
  > | null;
  const lockReason =
    (payload?.replyLockReason as string | undefined) ??
    (payload?.reply_lock_reason as string | undefined) ??
    (payload?.reason as string | undefined) ??
    null;
  if (lockReason && lockReason.trim().length > 0) return lockReason;
  const code =
    (payload?.code as string | undefined) ??
    (payload?.errorCode as string | undefined) ??
    (payload?.error_code as string | undefined) ??
    null;
  if (code === "REPLY_LIMIT_REACHED") {
    return "Reply limit reached for this thread.";
  }
  const message = payload?.message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  if (Array.isArray(message)) {
    const joined = message
      .filter(
        (part): part is string =>
          typeof part === "string" && part.trim().length > 0,
      )
      .join(", ");
    if (joined.length > 0) return joined;
  }
  return "Failed to send reply";
}

export function FormCheckActionQueuePage() {
  const { user } = useAuth();
  const isAssistant = user?.role === "ASSISTANT_COACH";
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState<FormCheckQueueTab>("needs_reply");
  const [search, setSearch] = useState("");
  const [quickReplyId, setQuickReplyId] = useState<string | null>(null);
  const [draftById, setDraftById] = useState<Record<string, string>>({});
  const sinceCursorRef = useRef<string | null>(null);
  const queueCursorRef = useRef<string | null>(null);
  const timeoutFailuresRef = useRef(0);
  const [pollMs, setPollMs] = useState(basePollInterval("needs_reply"));
  const [busyRetrying, setBusyRetrying] = useState(false);
  const queuePollingPaused = quickReplyId != null;

  function advanceSince(candidate: string | null | undefined) {
    if (!candidate) return;
    if (!sinceCursorRef.current) {
      sinceCursorRef.current = candidate;
      return;
    }
    if (
      new Date(candidate).getTime() > new Date(sinceCursorRef.current).getTime()
    ) {
      sinceCursorRef.current = candidate;
    }
  }

  function advanceQueueCursor(response: FormCheckActionQueueResponse) {
    if (response.hasMore === false) {
      queueCursorRef.current = null;
      return;
    }
    if (response.nextCursor && response.nextCursor.trim().length > 0) {
      queueCursorRef.current = response.nextCursor;
      return;
    }
    if (response.hasMore == null) {
      queueCursorRef.current = null;
    }
  }

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["form-check-action-queue", tab, search],
    queryFn: async () => {
      try {
        const queryKey = ["form-check-action-queue", tab, search] as const;
        const previous =
          queryClient.getQueryData<FormCheckActionQueueResponse>(queryKey);
        const hasPrevious = !!previous;
        const activeCursor = queueCursorRef.current;
        let polled: FormCheckActionQueueResponse;

        if (hasPrevious && activeCursor) {
          polled = await formCheckActionQueueService.list({
            tab,
            q: search || undefined,
            limit: 100,
            since: sinceCursorRef.current ?? undefined,
            cursor: activeCursor,
          });
        } else if (hasPrevious && sinceCursorRef.current) {
          const gate = await formCheckActionQueueService.list({
            tab,
            q: search || undefined,
            limit: 1,
            since: sinceCursorRef.current,
          });
          advanceSince(gate.since);
          advanceQueueCursor(gate);

          if (gate.hasChanges === false) {
            return {
              ...previous,
              since: gate.since ?? previous.since,
              hasChanges: false,
              hasMore: gate.hasMore ?? previous.hasMore,
              nextCursor: gate.nextCursor ?? previous.nextCursor,
              tabCounts: previous.tabCounts,
              tabCountsSource: previous.tabCountsSource,
            };
          }

          if (gate.nextCursor && gate.hasMore !== false) {
            polled = gate;
          } else {
            polled = await formCheckActionQueueService.list({
              tab,
              q: search || undefined,
              limit: 100,
              since: sinceCursorRef.current ?? undefined,
            });
          }
        } else {
          polled = await formCheckActionQueueService.list({
            tab,
            q: search || undefined,
            limit: 100,
            since: sinceCursorRef.current ?? undefined,
          });
        }

        advanceSince(polled.since);
        advanceQueueCursor(polled);

        let response: FormCheckActionQueueResponse;
        if (polled.hasChanges === false && previous) {
          response = {
            ...previous,
            since: polled.since ?? previous.since,
            hasChanges: false,
            hasMore: polled.hasMore ?? previous.hasMore,
            nextCursor: polled.nextCursor ?? previous.nextCursor,
          };
        } else if (
          polled.hasChanges === true &&
          polled.items.length === 0 &&
          previous
        ) {
          const full = await formCheckActionQueueService.list({
            tab,
            q: search || undefined,
            limit: 100,
          });
          advanceSince(full.since);
          advanceQueueCursor(full);
          response = full;
        } else if (
          previous &&
          (polled.isDelta ||
            activeCursor != null ||
            polled.nextCursor != null ||
            polled.hasMore === true)
        ) {
          response = mergeDelta(previous, polled);
        } else {
          response = polled;
        }

        timeoutFailuresRef.current = 0;
        setBusyRetrying(false);
        setPollMs(basePollInterval(tab));
        return response;
      } catch (queryError) {
        if (isBusyError(queryError)) {
          timeoutFailuresRef.current += 1;
          setBusyRetrying(true);
          setPollMs(
            nextPollInterval(basePollInterval(tab), timeoutFailuresRef.current),
          );
        } else {
          timeoutFailuresRef.current = 0;
          setBusyRetrying(false);
          setPollMs(basePollInterval(tab));
        }
        throw queryError;
      }
    },
    staleTime: 5_000,
    retry: false,
    refetchInterval: () =>
      formCheckQueueRefetchInterval({
        pollMs,
        visibilityState:
          typeof document !== "undefined" ? document.visibilityState : null,
        paused: queuePollingPaused,
      }),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const quickReplyMutation = useMutation({
    mutationFn: async (payload: {
      itemId: string;
      commentId: string;
      threadType: "workout" | "sheets";
      reply: string;
    }) =>
      workoutVideoCommentService.replyThread(
        payload.threadType,
        payload.commentId,
        {
          reply: payload.reply,
        },
      ),
    onSuccess: (_result, payload) => {
      toast.success("Reply sent");
      setQuickReplyId((current) =>
        current === payload.itemId ? null : current,
      );
      setDraftById((prev) => ({ ...prev, [payload.itemId]: "" }));
      void queryClient.invalidateQueries({
        queryKey: ["form-check-action-queue"],
      });
      if (payload.commentId) {
        void queryClient.invalidateQueries({
          queryKey: [
            "form-check-comment-thread",
            payload.threadType,
            payload.commentId,
          ],
        });
      }
    },
    onError: (error) => {
      toast.error(replyErrorMessage(error));
    },
  });

  const items = useMemo(
    () => sortQueue(data?.items ?? [], tab),
    [data?.items, tab],
  );
  const busyState = isError && (busyRetrying || isBusyError(error));

  function resetPollingState(nextTab: FormCheckQueueTab = tab) {
    timeoutFailuresRef.current = 0;
    setBusyRetrying(false);
    setPollMs(basePollInterval(nextTab));
  }

  const { data: pendingVideoCount = 0 } = useFormCheckPendingCount();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reply queue"
        description={
          isAssistant
            ? "Athlete replies and threads that need a coach follow-up on your assigned athletes."
            : "Athlete replies and conversation threads that need a coach follow-up."
        }
      />

      <FormCheckWorkSplitBanner
        variant="reply_queue"
        pendingVideoCount={pendingVideoCount}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => {
                sinceCursorRef.current = null;
                queueCursorRef.current = null;
                resetPollingState(entry.key);
                setTab(entry.key);
              }}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === entry.key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200",
              )}
            >
              {entry.label}
              <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold">
                {data?.tabCounts[entry.key] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <DebouncedSearch
            onSearch={(value) => {
              sinceCursorRef.current = null;
              queueCursorRef.current = null;
              resetPollingState();
              setSearch(value);
            }}
            placeholder="Search athlete, exercise, message..."
            className="w-full lg:w-80"
          />
          <button
            type="button"
            onClick={() => {
              resetPollingState();
              void refetch();
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Showing {items.length}
          {data?.total != null ? ` of ${data.total}` : ""} threads.
        </span>
        <span>
          {queuePollingPaused
            ? "Auto-refresh paused while quick reply is open."
            : `Polling every ${Math.ceil(pollMs / 1000)}s when tab is visible.`}
        </span>
      </div>

      {busyState ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Server busy, retrying automatically in {Math.ceil(pollMs / 1000)}s.
        </div>
      ) : null}

      {isError && !busyState ? (
        <ErrorAlert
          message={
            error instanceof Error
              ? error.message
              : "Failed to load form-check action queue."
          }
        />
      ) : isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Shimmer key={index} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : busyState && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Shimmer key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Queue is clear
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            New actionable form-check conversations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const athleteLabel =
              item.athleteName?.trim() ||
              item.athleteEmail ||
              "Unknown athlete";
            const quickReplyText = draftById[item.id] ?? "";
            const isReplyBlocked = itemReplyBlocked(item);
            const lockReason = replyLockText(item);
            return (
              <article
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-750"
              >
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      deepLink(
                        item,
                        item.state === "needs_reply" ? "reply" : undefined,
                      ),
                    )
                  }
                  className="w-full text-left"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                        {athleteLabel}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                        {item.videoReference ?? "Form-check thread"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          priorityTone(item.priority),
                        )}
                      >
                        {priorityLabel(item.priority)}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          stateTone(item.state),
                        )}
                      >
                        {stateLabel(item.state)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-gray-700 dark:text-gray-200">
                    {item.latestCommentPreview}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{timeAgo(item.latestActivityAt)}</span>
                    {item.groupedCount > 1 ? (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        {item.groupedCount} updates
                      </span>
                    ) : null}
                    {item.unreadCount > 0 ? (
                      <span className="rounded-full bg-blue-100 px-1.5 py-0.5 font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                        {item.unreadCount} unread
                      </span>
                    ) : null}
                    {item.repliesRemaining != null ? (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 font-semibold",
                          isReplyBlocked
                            ? "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                            : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
                        )}
                      >
                        {isReplyBlocked
                          ? "Replies blocked"
                          : `${item.repliesRemaining} repl${item.repliesRemaining === 1 ? "y" : "ies"} left`}
                      </span>
                    ) : null}
                    {item.stateReason ? <span>{item.stateReason}</span> : null}
                    {uploadLinkageState(item) === "blocked" ? (
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 font-semibold text-rose-800 dark:bg-rose-900/40 dark:text-rose-200">
                        Upload incident linked
                        {item.uploadIncidentCount != null &&
                        item.uploadIncidentCount > 0
                          ? ` (${item.uploadIncidentCount})`
                          : ""}
                      </span>
                    ) : uploadLinkageState(item) === "pending" ? (
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        Upload signal pending
                      </span>
                    ) : null}
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        deepLink(
                          item,
                          item.state === "needs_reply" ? "reply" : undefined,
                        ),
                      )
                    }
                    className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Open thread
                  </button>
                  {item.commentId ? (
                    <button
                      type="button"
                      disabled={isReplyBlocked}
                      onClick={() =>
                        setQuickReplyId((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
                    >
                      <MessageSquareReply className="h-3.5 w-3.5" />
                      Quick reply
                    </button>
                  ) : null}
                </div>
                {lockReason ? (
                  <p className="mt-1 text-[11px] text-rose-700 dark:text-rose-300">
                    {lockReason}
                  </p>
                ) : null}

                {quickReplyId === item.id && item.commentId ? (
                  <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-2.5 dark:border-gray-600 dark:bg-gray-900/50">
                    <textarea
                      value={quickReplyText}
                      onChange={(event) =>
                        setDraftById((prev) => ({
                          ...prev,
                          [item.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="Reply to athlete..."
                      className="w-full resize-y rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {isReplyBlocked
                          ? (lockReason ??
                            "Replies are currently blocked for this thread.")
                          : "Reply sends immediately and keeps this queue current."}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickReplyId(null)}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={
                            quickReplyMutation.isPending ||
                            !quickReplyText.trim() ||
                            isReplyBlocked
                          }
                          onClick={() =>
                            quickReplyMutation.mutate({
                              itemId: item.id,
                              commentId: item.commentId!,
                              threadType: item.threadType,
                              reply: quickReplyText.trim(),
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
