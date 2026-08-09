import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AlertCircle, MessageSquareReply, Send } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { useAuth } from "@/hooks/useAuth";
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
  if (priority === "P0" || priority === "P1" || priority === "P2") return priority;
  return "Open";
}

function deepLink(item: FormCheckActionQueueItem, action?: "reply"): string {
  if (!item.athleteId) return "/form-checks";
  const params = new URLSearchParams({
    userId: item.athleteId,
    review: "all",
  });
  if (item.videoId) params.set("videoId", item.videoId);
  if (item.commentId) params.set("commentId", item.commentId);
  if (item.messageId) params.set("messageId", item.messageId);
  if (item.threadType) params.set("threadType", item.threadType);
  if (action) params.set("action", action);
  return `/form-checks?${params.toString()}`;
}

function sortQueue(items: FormCheckActionQueueItem[], tab: FormCheckQueueTab) {
  const copy = [...items];
  copy.sort((a, b) => {
    const aAt = new Date(a.latestActivityAt).getTime();
    const bAt = new Date(b.latestActivityAt).getTime();
    if (tab === "resolved") return bAt - aAt;
    return aAt - bAt;
  });
  return copy;
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
  return {
    ...previous,
    ...delta,
    items,
    total: delta.total || items.length,
    limit: delta.limit || previous.limit,
    offset: delta.offset,
  };
}

function replyErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Failed to send reply";
  const payload = (error.response?.data ?? null) as
    | Record<string, unknown>
    | null;
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
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
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

  function advanceSince(candidate: string | null | undefined) {
    if (!candidate) return;
    if (!sinceCursorRef.current) {
      sinceCursorRef.current = candidate;
      return;
    }
    if (new Date(candidate).getTime() > new Date(sinceCursorRef.current).getTime()) {
      sinceCursorRef.current = candidate;
    }
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["form-check-action-queue", tab, search],
    queryFn: async () => {
      const queryKey = ["form-check-action-queue", tab, search] as const;
      const previous = queryClient.getQueryData<FormCheckActionQueueResponse>(queryKey);
      const polled = await formCheckActionQueueService.list({
        tab,
        q: search || undefined,
        limit: 100,
        since: sinceCursorRef.current ?? undefined,
      });
      advanceSince(polled.since);

      if (polled.hasChanges === false && previous) {
        return {
          ...previous,
          since: polled.since ?? previous.since,
          hasChanges: false,
        };
      }
      if (polled.hasChanges === true && polled.items.length === 0 && previous) {
        const full = await formCheckActionQueueService.list({
          tab,
          q: search || undefined,
          limit: 100,
        });
        advanceSince(full.since);
        return full;
      }
      if (polled.isDelta && previous) {
        return mergeDelta(previous, polled);
      }
      return polled;
    },
    staleTime: 5_000,
    refetchInterval: () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return false;
      }
      return tab === "resolved" ? 45_000 : 15_000;
    },
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
      workoutVideoCommentService.replyThread(payload.threadType, payload.commentId, {
        reply: payload.reply,
      }),
    onSuccess: (_result, payload) => {
      toast.success("Reply sent");
      setQuickReplyId((current) => (current === payload.itemId ? null : current));
      setDraftById((prev) => ({ ...prev, [payload.itemId]: "" }));
      void queryClient.invalidateQueries({ queryKey: ["form-check-action-queue"] });
      if (payload.commentId) {
        void queryClient.invalidateQueries({
          queryKey: ["form-check-comment-thread", payload.threadType, payload.commentId],
        });
      }
    },
    onError: (error) => {
      toast.error(replyErrorMessage(error));
    },
  });

  const items = useMemo(() => sortQueue(data?.items ?? [], tab), [data?.items, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Form Check Action Queue"
        description={
          isAssistant
            ? "Assigned-athlete action queue with oldest actionable threads first."
            : "Coach/admin action queue with oldest actionable threads first."
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => {
                sinceCursorRef.current = null;
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
        <DebouncedSearch
          onSearch={(value) => {
            sinceCursorRef.current = null;
            setSearch(value);
          }}
          placeholder="Search athlete, exercise, message..."
          className="w-full lg:w-80"
        />
      </div>

      {isError ? (
        <ErrorAlert
          message={
            error instanceof Error
              ? error.message
              : "Failed to load form-check action queue."
          }
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Shimmer key={index} className="h-28 rounded-xl" />
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
            const athleteLabel = item.athleteName?.trim() || item.athleteEmail || "Unknown athlete";
            const quickReplyText = draftById[item.id] ?? "";
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
                    {item.stateReason ? <span>{item.stateReason}</span> : null}
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
                      onClick={() =>
                        setQuickReplyId((current) => (current === item.id ? null : item.id))
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
                    >
                      <MessageSquareReply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                  ) : null}
                </div>

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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickReplyId(null)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={quickReplyMutation.isPending || !quickReplyText.trim()}
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
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
