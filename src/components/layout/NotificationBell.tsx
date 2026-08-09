import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Bell,
  CreditCard,
  ShoppingBag,
  CheckCheck,
  X,
  BookOpen,
  MessageCircle,
  Upload,
  Bug,
  Send,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { notificationService } from "@/services/notificationService";
import {
  workoutVideoCommentService,
  type FormCheckThreadType,
} from "@/services/workoutVideoCommentService";
import { useNotificationStore } from "@/store/notificationStore";
import type { AdminNotification, NotificationListResponse } from "@/types/user";
import { useAuth } from "@/hooks/useAuth";

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

function inferCategory(n: AdminNotification): string {
  if (n.category && n.category.trim().length > 0) return n.category;
  if (n.type.includes("CHAT")) return "chat";
  if (n.type.includes("FORM_CHECK")) return "form_check";
  if (n.type.includes("PAYMENT") || n.type.includes("SUBSCRIPTION"))
    return "payments";
  if (n.type.includes("UPLOAD") || n.type.includes("ERROR")) return "system";
  return "general";
}

function priorityWeight(value: string | null | undefined): number {
  switch ((value ?? "normal").toLowerCase()) {
    case "p0":
    case "critical":
    case "urgent":
      return 4;
    case "p1":
    case "high":
      return 3;
    case "p2":
    case "medium":
    case "normal":
      return 2;
    case "low":
      return 1;
    default:
      return 2;
  }
}

function replyErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return "Unable to send reply";
  const payload = (error.response?.data ?? null) as
    | Record<string, unknown>
    | null;
  const lockReason = pickString(
    payload?.replyLockReason,
    payload?.reply_lock_reason,
    payload?.reason,
  );
  if (lockReason) return lockReason;
  const code = pickString(payload?.code, payload?.errorCode, payload?.error_code);
  if (code === "REPLY_LIMIT_REACHED") {
    const remaining = pickNumber(
      payload?.repliesRemaining,
      payload?.replies_remaining,
    );
    if (remaining != null) {
      return remaining <= 0
        ? "Reply limit reached for this thread."
        : `${remaining} repl${remaining === 1 ? "y" : "ies"} remaining.`;
    }
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
  return "Unable to send reply";
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickBoolean(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return null;
}

function parseThreadType(value: unknown): FormCheckThreadType | null {
  if (value === "workout" || value === "sheets") return value;
  return null;
}

type FormCheckActionState = "unread" | "needs_reply" | "replied" | "resolved";

type FormCheckNotificationMeta = {
  userId: string | null;
  athleteName: string | null;
  videoId: string | null;
  commentId: string | null;
  messageId: string | null;
  threadType: FormCheckThreadType;
  activityType: "new_comment" | "new_reply" | "thread_update";
  activityLabel: string;
  videoReference: string | null;
  preview: string;
  state: FormCheckActionState;
  stateReason: string | null;
  repliesRemaining: number | null;
  replyBlocked: boolean;
  groupKey: string;
};

function isFormCheckNotification(n: AdminNotification): boolean {
  return (
    n.type.includes("FORM_CHECK") || inferCategory(n).toLowerCase() === "form_check"
  );
}

function normalizeActionState(
  rawValue: string | null | undefined,
  fallbackNeedsReply: boolean,
): FormCheckActionState {
  const value = (rawValue ?? "").toLowerCase();
  if (value.includes("resolved") || value.includes("closed")) return "resolved";
  if (
    value.includes("replied") ||
    value.includes("responded") ||
    value.includes("handled")
  ) {
    return "replied";
  }
  if (value.includes("need") || value.includes("reply")) return "needs_reply";
  return fallbackNeedsReply ? "needs_reply" : "unread";
}

function formCheckMeta(n: AdminNotification): FormCheckNotificationMeta {
  const payload = asRecord(n.payload) ?? {};
  const deepLink =
    asRecord(payload.deepLink) ??
    asRecord(payload.deeplink) ??
    asRecord(payload.link);
  const userId = pickString(
    payload.userId,
    payload.user_id,
    payload.athleteId,
    payload.athlete_id,
    deepLink?.userId,
    deepLink?.user_id,
  );
  const videoId = pickString(
    payload.videoId,
    payload.video_id,
    payload.workoutSetVideoId,
    payload.sheetSetVideoId,
    deepLink?.videoId,
    deepLink?.video_id,
  );
  const commentId = pickString(
    payload.commentId,
    payload.comment_id,
    deepLink?.commentId,
    deepLink?.comment_id,
  );
  const messageId = pickString(
    payload.messageId,
    payload.message_id,
    deepLink?.messageId,
    deepLink?.message_id,
  );
  const threadType =
    parseThreadType(payload.threadType) ??
    parseThreadType(payload.thread_type) ??
    parseThreadType(deepLink?.threadType) ??
    parseThreadType(deepLink?.thread_type) ??
    "workout";
  const athleteName = pickString(
    payload.athleteName,
    payload.athlete_name,
    payload.userName,
    payload.user_name,
    payload.name,
  );
  const exerciseName = pickString(
    payload.exerciseName,
    payload.exercise_name,
    payload.videoTitle,
    payload.video_title,
    payload.formCheckLabel,
    payload.form_check_label,
  );
  const setNumber = pickNumber(payload.setNumber, payload.set_number);
  const videoReference = exerciseName
    ? setNumber != null
      ? `${exerciseName} · Set ${setNumber}`
      : exerciseName
    : videoId
      ? `Video ${videoId.slice(0, 8)}`
      : null;
  const activityTypeRaw = pickString(
    payload.activityType,
    payload.activity_type,
    payload.eventType,
    payload.event_type,
  );
  const activityType =
    n.type === "FORM_CHECK_ATHLETE_REPLY" ||
    activityTypeRaw?.toLowerCase().includes("reply")
      ? "new_reply"
      : n.type === "FORM_CHECK_VIDEO_UPLOAD" ||
          activityTypeRaw?.toLowerCase().includes("comment")
        ? "new_comment"
        : "thread_update";
  const activityLabel =
    activityType === "new_reply"
      ? "New reply"
      : activityType === "new_comment"
        ? "New comment"
        : "Thread update";
  const needsReply =
    pickBoolean(payload.needsReply, payload.needs_reply) ??
    (activityType === "new_reply" ? true : null);
  const state = normalizeActionState(
    pickString(payload.state, payload.status, payload.conversationState),
    needsReply ?? false,
  );
  const repliesRemaining = pickNumber(
    payload.repliesRemaining,
    payload.replies_remaining,
  );
  const canReply = pickBoolean(payload.canReply, payload.can_reply);
  const replyBlocked =
    canReply === false || (repliesRemaining != null && repliesRemaining <= 0);
  const stateReason = pickString(
    payload.replyLockReason,
    payload.reply_lock_reason,
    payload.reason,
  );
  const preview =
    pickString(payload.preview, payload.messagePreview, payload.comment, n.message) ??
    n.message;
  const groupKey =
    pickString(
      payload.groupKey,
      payload.group_key,
      commentId,
      videoId && userId ? `${userId}:${videoId}:${threadType}` : null,
      userId ? `${userId}:${threadType}` : null,
    ) ?? n.id;
  return {
    userId,
    athleteName,
    videoId,
    commentId,
    messageId,
    threadType,
    activityType,
    activityLabel,
    videoReference,
    preview,
    state,
    stateReason,
    repliesRemaining,
    replyBlocked,
    groupKey,
  };
}

function stateToneClass(state: FormCheckActionState): string {
  switch (state) {
    case "needs_reply":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "replied":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "resolved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }
}

function stateLabel(state: FormCheckActionState): string {
  switch (state) {
    case "needs_reply":
      return "Needs reply";
    case "replied":
      return "Replied";
    case "resolved":
      return "Resolved";
    default:
      return "Unread";
  }
}

function priorityToneClass(priority: string | null | undefined): string {
  const weight = priorityWeight(priority);
  if (weight >= 4) {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  }
  if (weight === 3) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
  }
  if (weight === 1) {
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  }
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
}

function iconForNotification(n: AdminNotification) {
  if (n.type === "COACHING_SUBSCRIPTION_PAID") return CreditCard;
  if (n.type === "BOOK_PURCHASE_PAID" || n.type === "PROGRAM_PURCHASE_PAID")
    return BookOpen;
  if (n.type === "CHAT_MESSAGE") return MessageCircle;
  if (n.type === "CLIENT_UPLOAD_FAILED") return Upload;
  if (n.type === "CLIENT_ERROR") return Bug;
  if (isFormCheckNotification(n)) return AlertCircle;
  return ShoppingBag;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { unreadCount, setUnreadCount } = useNotificationStore();

  // Poll unread count every 30s
  useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: async () => {
      const count = await notificationService.getUnreadCount({
        gracefulForbidden: true,
      });
      setUnreadCount(count);
      return count;
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Notifications"
      >
        <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  );
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { decrement, reset } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-unread-list"],
    queryFn: () =>
      notificationService.getAll(
        { unreadOnly: true, limit: 20 },
        { gracefulForbidden: true },
      ),
    staleTime: 5_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 15_000
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
  const [quickReplyOpenId, setQuickReplyOpenId] = useState<string | null>(null);
  const [quickReplyDrafts, setQuickReplyDrafts] = useState<
    Record<string, string>
  >({});

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    // The panel only lists unread notifications, so a read item simply leaves
    // the list. Drop it locally instead of refetching all 20 rows.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({
        queryKey: ["notifications-unread-list"],
      });
      const previous = queryClient.getQueryData<NotificationListResponse>([
        "notifications-unread-list",
      ]);
      if (previous) {
        queryClient.setQueryData<NotificationListResponse>(
          ["notifications-unread-list"],
          {
            ...previous,
            items: previous.items.filter((n) => n.id !== id),
            total: Math.max(0, previous.total - 1),
            unreadCount: Math.max(0, previous.unreadCount - 1),
          },
        );
      }
      decrement();
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ["notifications-unread-list"],
          context.previous,
        );
      }
      void queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      reset();
      setQuickReplyOpenId(null);
      setQuickReplyDrafts({});
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
    },
  });

  const quickReplyMutation = useMutation({
    mutationFn: async (variables: {
      notificationId: string;
      commentId: string;
      threadType: FormCheckThreadType;
      reply: string;
    }) =>
      workoutVideoCommentService.replyThread(
        variables.threadType,
        variables.commentId,
        {
          reply: variables.reply.trim(),
        },
      ),
    onSuccess: (_data, variables) => {
      toast.success("Reply sent");
      markReadMutation.mutate(variables.notificationId);
      setQuickReplyOpenId((current) =>
        current === variables.notificationId ? null : current,
      );
      setQuickReplyDrafts((prev) => ({
        ...prev,
        [variables.notificationId]: "",
      }));
      queryClient.invalidateQueries({
        queryKey: [
          "form-check-comment-thread",
          variables.threadType,
          variables.commentId,
        ],
      });
    },
    onError: (error) => {
      toast.error(replyErrorMessage(error));
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread-list"],
      });
    },
  });

  function buildFormCheckRoute(
    meta: FormCheckNotificationMeta,
    action?: string,
  ): string {
    if (!meta.userId) return "/form-checks";
    const params = new URLSearchParams({
      userId: meta.userId,
      review: "all",
    });
    if (meta.videoId) params.set("videoId", meta.videoId);
    if (meta.commentId) params.set("commentId", meta.commentId);
    if (meta.messageId) params.set("messageId", meta.messageId);
    if (meta.threadType) params.set("threadType", meta.threadType);
    if (action) params.set("action", action);
    return `/form-checks?${params.toString()}`;
  }

  function openFormCheckNotification(
    notification: AdminNotification,
    action?: string,
  ) {
    const meta = formCheckMeta(notification);
    markReadMutation.mutate(notification.id);
    navigate(buildFormCheckRoute(meta, action));
    onClose();
  }

  function handleClickNotification(n: AdminNotification) {
    if (isFormCheckNotification(n)) {
      const meta = formCheckMeta(n);
      const action = meta.state === "needs_reply" ? "reply" : undefined;
      openFormCheckNotification(n, action);
      return;
    }
    markReadMutation.mutate(n.id);

    const payload = asRecord(n.payload) ?? {};
    const userId = pickString(payload.userId, payload.user_id);
    if (n.type === "CHAT_MESSAGE" && userId) {
      navigate(`/chat?userId=${userId}`);
      onClose();
      return;
    }
    if (n.type === "CLIENT_UPLOAD_FAILED") {
      navigate("/upload-failures");
      onClose();
      return;
    }
    if (n.type === "CLIENT_ERROR") {
      navigate("/client-errors");
      onClose();
      return;
    }
    if (userId) {
      navigate(
        isAdmin ? `/users/${userId}` : `/coach/athletes/${userId}?tab=plan`,
      );
      onClose();
    }
  }

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const byPriority = priorityWeight(b.priority) - priorityWeight(a.priority);
        if (byPriority !== 0) return byPriority;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [items],
  );

  const formCheckGroups = useMemo(() => {
    const candidates = sortedItems
      .filter((item) => isFormCheckNotification(item))
      .map((notification) => ({
        notification,
        meta: formCheckMeta(notification),
      }));
    const groups = new Map<
      string,
      { meta: FormCheckNotificationMeta; notifications: AdminNotification[] }
    >();
    candidates.forEach(({ notification, meta }) => {
      const existing = groups.get(meta.groupKey);
      if (existing) {
        existing.notifications.push(notification);
        return;
      }
      groups.set(meta.groupKey, { meta, notifications: [notification] });
    });
    return Array.from(groups.entries())
      .map(([key, value]) => ({
        key,
        meta: value.meta,
        notifications: value.notifications.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      }))
      .sort((a, b) => {
        const primaryA = a.notifications[0];
        const primaryB = b.notifications[0];
        const byPriority =
          priorityWeight(primaryB.priority) - priorityWeight(primaryA.priority);
        if (byPriority !== 0) return byPriority;
        return (
          new Date(primaryB.createdAt).getTime() -
          new Date(primaryA.createdAt).getTime()
        );
      });
  }, [sortedItems]);

  const actionableFormCheckGroups = useMemo(
    () =>
      formCheckGroups.filter(({ meta, notifications }) => {
        const primary = notifications[0];
        return (
          meta.state === "needs_reply" ||
          priorityWeight(primary.priority) >= 3 ||
          primary.type === "FORM_CHECK_ATHLETE_REPLY"
        );
      }),
    [formCheckGroups],
  );
  const secondaryFormCheckGroups = useMemo(() => {
    const actionableKeys = new Set(
      actionableFormCheckGroups.map((group) => group.key),
    );
    return formCheckGroups.filter((group) => !actionableKeys.has(group.key));
  }, [actionableFormCheckGroups, formCheckGroups]);

  const formCheckGroupIds = useMemo(() => {
    const ids = new Set<string>();
    formCheckGroups.forEach((group) => {
      group.notifications.forEach((item) => ids.add(item.id));
    });
    return ids;
  }, [formCheckGroups]);

  const groupedItems = useMemo(() => {
    const sorted = sortedItems.filter((item) => !formCheckGroupIds.has(item.id));
    const map = new Map<string, AdminNotification[]>();
    sorted.forEach((item) => {
      const key = inferCategory(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [formCheckGroupIds, sortedItems]);

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Notifications
        </h3>
        <div className="flex items-center gap-1">
          {items.length > 0 && (
            <button
              onClick={() => markAllMutation.mutate()}
              disabled={markAllMutation.isPending}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
              title="Mark all read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All caught up!
            </p>
          </div>
        ) : (
          <div>
            {actionableFormCheckGroups.length > 0 ? (
              <div className="border-b dark:border-gray-700">
                <div className="sticky top-0 z-10 flex items-center justify-between bg-rose-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                  <span>Action required · Form check</span>
                  <span>{actionableFormCheckGroups.length}</span>
                </div>
                <div className="space-y-2 px-3 py-2">
                  {actionableFormCheckGroups.map((group) => {
                    const primary = group.notifications[0];
                    const meta = group.meta;
                    const quickReplyDraft = quickReplyDrafts[primary.id] ?? "";
                    const groupedCount = group.notifications.length;
                    const isP0 = priorityWeight(primary.priority) >= 4;
                    const canQuickReply =
                      !!meta.commentId &&
                      !meta.replyBlocked &&
                      !quickReplyMutation.isPending &&
                      (isP0 || meta.state === "needs_reply");
                    return (
                      <div
                        key={group.key}
                        className="rounded-lg border border-rose-200 bg-white p-2.5 dark:border-rose-800/40 dark:bg-gray-900/70"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                              {meta.athleteName ?? primary.title}
                            </p>
                            <p className="truncate text-[11px] text-gray-600 dark:text-gray-300">
                              {meta.videoReference ?? "Form-check thread"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              priorityToneClass(primary.priority),
                            )}
                          >
                            {primary.priority ?? "normal"}
                          </span>
                        </div>
                        <p className="mb-1 text-xs font-medium text-gray-800 dark:text-gray-100">
                          {groupedCount > 1
                            ? `${groupedCount} updates · ${meta.activityLabel.toLowerCase()}`
                            : meta.activityLabel}
                        </p>
                        <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                          {meta.preview}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              stateToneClass(meta.state),
                            )}
                          >
                            {stateLabel(meta.state)}
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {timeAgo(primary.createdAt)}
                          </span>
                          {meta.repliesRemaining != null ? (
                            <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                              {meta.repliesRemaining} repl
                              {meta.repliesRemaining === 1 ? "y" : "ies"} left
                            </span>
                          ) : null}
                          {meta.stateReason ? (
                            <span className="text-[10px] text-rose-700 dark:text-rose-300">
                              {meta.stateReason}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openFormCheckNotification(
                                primary,
                                meta.state === "needs_reply" || isP0
                                  ? "reply"
                                  : undefined,
                              )
                            }
                            className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                          >
                            Open thread
                          </button>
                          {meta.commentId && (isP0 || meta.state === "needs_reply") ? (
                            <button
                              type="button"
                              disabled={!canQuickReply}
                              onClick={() =>
                                setQuickReplyOpenId((current) =>
                                  current === primary.id ? null : primary.id,
                                )
                              }
                              className="rounded-md border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-600 dark:bg-gray-900 dark:text-indigo-300"
                            >
                              Quick reply
                            </button>
                          ) : null}
                        </div>
                        {quickReplyOpenId === primary.id && meta.commentId ? (
                          <div className="mt-2 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800/70">
                            <textarea
                              value={quickReplyDraft}
                              onChange={(event) =>
                                setQuickReplyDrafts((prev) => ({
                                  ...prev,
                                  [primary.id]: event.target.value,
                                }))
                              }
                              rows={3}
                              placeholder="Reply to athlete…"
                              className="w-full resize-y rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setQuickReplyOpenId(null)}
                                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={
                                  quickReplyMutation.isPending ||
                                  !quickReplyDraft.trim() ||
                                  meta.replyBlocked
                                }
                                onClick={() =>
                                  quickReplyMutation.mutate({
                                    notificationId: primary.id,
                                    commentId: meta.commentId!,
                                    threadType: meta.threadType,
                                    reply: quickReplyDraft,
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
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {secondaryFormCheckGroups.length > 0 ? (
              <div className="border-b dark:border-gray-700">
                <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  <span>Form check updates</span>
                  <span>{secondaryFormCheckGroups.length}</span>
                </div>
                {secondaryFormCheckGroups.map((group) => {
                  const primary = group.notifications[0];
                  const meta = group.meta;
                  return (
                    <button
                      key={group.key}
                      onClick={() => openFormCheckNotification(primary)}
                      className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-gray-50 last:border-b-0 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <div className="mt-0.5 shrink-0 rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {meta.athleteName ?? primary.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                          {meta.videoReference ?? meta.preview}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {timeAgo(primary.createdAt)}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              stateToneClass(meta.state),
                            )}
                          >
                            {stateLabel(meta.state)}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}

            {groupedItems.map(([category, categoryItems]) => (
              <div key={category} className="border-b last:border-b-0 dark:border-gray-700">
                <div className="sticky top-0 z-10 flex items-center justify-between bg-gray-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  <span>{formatLabel(category)}</span>
                  <span>{categoryItems.length}</span>
                </div>
                {categoryItems.map((n) => {
                  const Icon = iconForNotification(n);
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClickNotification(n)}
                      className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-gray-50 last:border-b-0 dark:border-gray-700 dark:hover:bg-gray-700/50"
                    >
                      <div
                        className={cn(
                          "mt-0.5 shrink-0 rounded-lg p-2",
                          n.type === "COACHING_SUBSCRIPTION_PAID"
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                            : n.type === "BOOK_PURCHASE_PAID" ||
                                n.type === "PROGRAM_PURCHASE_PAID"
                              ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                              : n.type === "CHAT_MESSAGE"
                                ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                                : n.type === "CLIENT_UPLOAD_FAILED" ||
                                    n.type === "CLIENT_ERROR"
                                  ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {n.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                          {n.message}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <p className="text-[11px] text-gray-400 dark:text-gray-500">
                            {timeAgo(n.createdAt)}
                          </p>
                          {n.priority ? (
                            <span
                              className={cn(
                                "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                priorityToneClass(n.priority),
                              )}
                            >
                              {n.priority}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {!n.readAt ? (
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
