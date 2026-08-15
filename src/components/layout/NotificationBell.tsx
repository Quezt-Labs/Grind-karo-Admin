import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { cn } from "@/utils/cn";
import { notificationService } from "@/services/notificationService";
import { type FormCheckThreadType } from "@/services/workoutVideoCommentService";
import { useNotificationStore } from "@/store/notificationStore";
import type { AdminNotification, NotificationListResponse } from "@/types/user";
import { useAuth } from "@/hooks/useAuth";
import { buildFormCheckThreadRoute } from "@/utils/formCheckRoutes";

type NotificationFilter = "all" | "form_check" | "other";

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

function categoryLabel(category: string): string {
  switch (category) {
    case "form_check":
      return "Form check";
    case "chat":
      return "Chat";
    case "payments":
      return "Payment";
    case "system":
      return "System";
    default:
      return "General";
  }
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

function parseThreadType(value: unknown): FormCheckThreadType | null {
  if (value === "workout" || value === "sheets") return value;
  return null;
}

type FormCheckNotificationMeta = {
  userId: string | null;
  athleteName: string | null;
  videoId: string | null;
  commentId: string | null;
  messageId: string | null;
  threadType: FormCheckThreadType;
  preview: string;
  groupKey: string;
};

function isFormCheckNotification(n: AdminNotification): boolean {
  return (
    n.type.includes("FORM_CHECK") ||
    inferCategory(n).toLowerCase() === "form_check"
  );
}

function formCheckMeta(n: AdminNotification): FormCheckNotificationMeta {
  const payload = asRecord(n.payload) ?? {};
  const athlete = asRecord(payload.athlete);
  const deepLink =
    asRecord(payload.deepLink) ??
    asRecord(payload.deeplink) ??
    asRecord(payload.link);
  const userId = pickString(
    payload.athleteId,
    payload.athlete_id,
    athlete?.id,
    deepLink?.athleteId,
    deepLink?.athlete_id,
    deepLink?.userId,
    deepLink?.user_id,
    payload.targetUserId,
    payload.target_user_id,
    payload.userId,
    payload.user_id,
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
  const preview =
    pickString(
      payload.preview,
      payload.messagePreview,
      payload.comment,
      n.message,
    ) ?? n.message;
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
    preview,
    groupKey,
  };
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

function iconToneClass(n: AdminNotification): string {
  if (n.type === "COACHING_SUBSCRIPTION_PAID")
    return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
  if (n.type === "BOOK_PURCHASE_PAID" || n.type === "PROGRAM_PURCHASE_PAID")
    return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
  if (n.type === "CHAT_MESSAGE")
    return "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400";
  if (n.type === "CLIENT_UPLOAD_FAILED" || n.type === "CLIENT_ERROR")
    return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400";
  if (isFormCheckNotification(n))
    return "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-300";
  return "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400";
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { unreadCount, setUnreadCount } = useNotificationStore();

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
  const { unreadCount, decrement, reset } = useNotificationStore();
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["notifications-unread-list"],
    queryFn: () =>
      notificationService.getAll(
        { unreadOnly: true, limit: 20 },
        { gracefulForbidden: true, forbiddenAsError: true },
      ),
    staleTime: 5_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 15_000
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
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
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-list"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
    },
  });

  function buildFormCheckRoute(meta: FormCheckNotificationMeta): string {
    return buildFormCheckThreadRoute({
      userId: meta.userId,
      videoId: meta.videoId,
      commentId: meta.commentId,
      messageId: meta.messageId,
      threadType: meta.threadType,
    });
  }

  function openFormCheckNotification(notification: AdminNotification) {
    const meta = formCheckMeta(notification);
    markReadMutation.mutate(notification.id);
    navigate(buildFormCheckRoute(meta));
    onClose();
  }

  function handleClickNotification(n: AdminNotification) {
    if (isFormCheckNotification(n)) {
      openFormCheckNotification(n);
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

  const formCheckGroups = useMemo(() => {
    const candidates = items
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
      .sort(
        (a, b) =>
          new Date(b.notifications[0].createdAt).getTime() -
          new Date(a.notifications[0].createdAt).getTime(),
      );
  }, [items]);

  const formCheckGroupIds = useMemo(() => {
    const ids = new Set<string>();
    formCheckGroups.forEach((group) => {
      group.notifications.forEach((item) => ids.add(item.id));
    });
    return ids;
  }, [formCheckGroups]);

  const otherItems = useMemo(
    () => items.filter((item) => !formCheckGroupIds.has(item.id)),
    [formCheckGroupIds, items],
  );

  const filterCounts = useMemo(
    () => ({
      all: formCheckGroups.length + otherItems.length,
      form_check: formCheckGroups.length,
      other: otherItems.length,
    }),
    [formCheckGroups.length, otherItems.length],
  );

  const visibleFormCheckGroups = useMemo(() => {
    if (filter === "other") return [];
    return formCheckGroups;
  }, [filter, formCheckGroups]);

  const visibleOtherItems = useMemo(() => {
    if (filter === "form_check") return [];
    return otherItems;
  }, [filter, otherItems]);

  const hasVisibleItems =
    visibleFormCheckGroups.length > 0 || visibleOtherItems.length > 0;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:w-96">
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
          {isError ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              List unavailable
            </span>
          ) : null}
        </div>
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

      {items.length > 0 && !isLoading && !isError ? (
        <div className="flex gap-1 border-b px-3 py-2 dark:border-gray-700">
          {(
            [
              { key: "all", label: "All" },
              { key: "form_check", label: "Form checks" },
              { key: "other", label: "Other" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
                filter === key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
              )}
            >
              {label}
              {filterCounts[key] > 0 ? ` (${filterCounts[key]})` : ""}
            </button>
          ))}
        </div>
      ) : null}

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
        ) : isError ? (
          <div className="p-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <p className="font-semibold">Notification list unavailable</p>
              <p className="mt-1 text-xs">
                {error instanceof Error
                  ? error.message
                  : "Server rejected the notification list request."}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px]">Unread count: {unreadCount}</span>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800 disabled:opacity-50 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : items.length === 0 && unreadCount > 0 ? (
          <div className="p-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
              <p className="font-semibold">
                Unread count is available, but list is empty
              </p>
              <p className="mt-1 text-xs">
                This may be a temporary notification sync issue. Retrying may
                restore items.
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px]">Unread count: {unreadCount}</span>
                <button
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                  className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-800 disabled:opacity-50 dark:border-amber-700 dark:bg-gray-900 dark:text-amber-200"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Bell className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              All caught up!
            </p>
          </div>
        ) : !hasVisibleItems ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No notifications in this filter.
            </p>
          </div>
        ) : (
          <div>
            {visibleFormCheckGroups.map((group) => {
              const primary = group.notifications[0];
              const primaryMeta = formCheckMeta(primary);
              const groupedCount = group.notifications.length;
              const Icon = iconForNotification(primary);
              return (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => openFormCheckNotification(primary)}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-gray-50 last:border-b-0 dark:border-gray-700 dark:hover:bg-gray-700/50"
                >
                  <div
                    className={cn(
                      "mt-0.5 shrink-0 rounded-lg p-2",
                      iconToneClass(primary),
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {primaryMeta.athleteName ?? primary.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {groupedCount > 1
                        ? `${groupedCount} updates · ${primaryMeta.preview}`
                        : primaryMeta.preview}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">
                        {timeAgo(primary.createdAt)}
                      </p>
                      <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
                        Form check
                      </span>
                    </div>
                  </div>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                </button>
              );
            })}

            {visibleOtherItems.map((n) => {
              const Icon = iconForNotification(n);
              const category = inferCategory(n);
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotification(n)}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-gray-50 last:border-b-0 dark:border-gray-700 dark:hover:bg-gray-700/50"
                >
                  <div
                    className={cn(
                      "mt-0.5 shrink-0 rounded-lg p-2",
                      iconToneClass(n),
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
                      <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                        {categoryLabel(category)}
                      </span>
                    </div>
                  </div>
                  {!n.readAt ? (
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
