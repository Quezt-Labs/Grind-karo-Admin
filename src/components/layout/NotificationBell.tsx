import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { AdminNotification, NotificationListResponse } from "@/types/user";
import { useAuth } from "@/hooks/useAuth";
import {
  NOTIFICATION_INBOX_QUERY_KEY,
  useNotificationInbox,
} from "@/hooks/useNotificationInbox";
import { buildFormCheckThreadRoute } from "@/utils/formCheckRoutes";
import {
  formCheckMeta,
  isFormCheckNotification,
  type FormCheckNotificationMeta,
} from "@/utils/notificationInboxDisplay";

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

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { badgeCount } = useNotificationInbox();

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
        {badgeCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {badgeCount > 99 ? "99+" : badgeCount}
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
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { items, formCheckGroups, otherItems, isLoading } =
    useNotificationInbox();

  const markReadMutation = useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => notificationService.markRead(id))),
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({
        queryKey: NOTIFICATION_INBOX_QUERY_KEY,
      });
      const previous = queryClient.getQueryData<NotificationListResponse>(
        NOTIFICATION_INBOX_QUERY_KEY,
      );
      const idSet = new Set(ids);
      if (previous) {
        const nextItems = previous.items.filter((n) => !idSet.has(n.id));
        queryClient.setQueryData(NOTIFICATION_INBOX_QUERY_KEY, {
          ...previous,
          items: nextItems,
          total: Math.max(0, previous.total - ids.length),
        });
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          NOTIFICATION_INBOX_QUERY_KEY,
          context.previous,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATION_INBOX_QUERY_KEY,
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData(NOTIFICATION_INBOX_QUERY_KEY, {
        total: 0,
        unreadCount: 0,
        limit: 100,
        offset: 0,
        items: [],
      });
      void queryClient.invalidateQueries({
        queryKey: NOTIFICATION_INBOX_QUERY_KEY,
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

  function openFormCheckNotification(
    notification: AdminNotification,
    groupedNotifications: AdminNotification[],
  ) {
    const meta = formCheckMeta(notification);
    const ids = groupedNotifications.map((entry) => entry.id);
    markReadMutation.mutate(ids);
    navigate(buildFormCheckRoute(meta));
    onClose();
  }

  function handleClickNotification(n: AdminNotification) {
    if (isFormCheckNotification(n)) {
      openFormCheckNotification(n, [n]);
      return;
    }
    markReadMutation.mutate([n.id]);

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

  type NotificationPanelRow =
    | {
        kind: "form_check";
        key: string;
        group: (typeof formCheckGroups)[number];
        sortAt: number;
      }
    | {
        kind: "other";
        key: string;
        notification: AdminNotification;
        sortAt: number;
      };

  const visibleRows = useMemo(() => {
    const rows: NotificationPanelRow[] = [];
    for (const group of visibleFormCheckGroups) {
      rows.push({
        kind: "form_check",
        key: group.key,
        group,
        sortAt: new Date(group.notifications[0]?.createdAt ?? 0).getTime(),
      });
    }
    for (const notification of visibleOtherItems) {
      rows.push({
        kind: "other",
        key: notification.id,
        notification,
        sortAt: new Date(notification.createdAt).getTime(),
      });
    }
    rows.sort((a, b) => b.sortAt - a.sortAt);
    return rows;
  }, [visibleFormCheckGroups, visibleOtherItems]);

  const hasVisibleItems = visibleRows.length > 0;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 sm:w-96">
      <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
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

      {items.length > 0 && !isLoading ? (
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
            {visibleRows.map((row) => {
              if (row.kind === "form_check") {
                const group = row.group;
                const primary = group.notifications[0];
                const primaryMeta = formCheckMeta(primary);
                const groupedCount = group.notifications.length;
                const Icon = iconForNotification(primary);
                return (
                  <button
                    key={row.key}
                    type="button"
                    onClick={() =>
                      openFormCheckNotification(primary, group.notifications)
                    }
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
              }

              const n = row.notification;
              const Icon = iconForNotification(n);
              const category = inferCategory(n);
              return (
                <button
                  key={row.key}
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
