import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
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
import { useNotificationStore } from "@/store/notificationStore";
import type { AdminNotification } from "@/types/user";

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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { unreadCount, setUnreadCount } = useNotificationStore();

  // Poll unread count every 30s
  useQuery({
    queryKey: ["notification-unread-count"],
    queryFn: async () => {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
      return count;
    },
    refetchInterval: 30_000,
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { decrement, reset } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-unread-list"],
    queryFn: () => notificationService.getAll({ unreadOnly: true, limit: 20 }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      decrement();
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-list"],
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

  function handleClickNotification(n: AdminNotification) {
    markReadMutation.mutate(n.id);

    const userId = n.payload.userId as string | undefined;
    if (n.type === "CHAT_MESSAGE" && userId) {
      navigate(`/chat?userId=${userId}`);
      onClose();
      return;
    }
    if (n.type === "FORM_CHECK_VIDEO_UPLOAD") {
      // Deep-link straight to the athlete's pending queue instead of the
      // generic inbox, so the coach lands on the exact video to review.
      navigate(
        userId
          ? `/form-checks?userId=${userId}&review=pending`
          : "/form-checks",
      );
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
      navigate(`/users/${userId}`);
      onClose();
    }
  }

  const items = data?.items ?? [];

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
            {items.map((n) => (
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
                      : n.type === "BOOK_PURCHASE_PAID"
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                        : n.type === "CHAT_MESSAGE"
                          ? "bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"
                          : n.type === "CLIENT_UPLOAD_FAILED" ||
                              n.type === "CLIENT_ERROR"
                            ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
                  )}
                >
                  {n.type === "COACHING_SUBSCRIPTION_PAID" ? (
                    <CreditCard className="h-4 w-4" />
                  ) : n.type === "BOOK_PURCHASE_PAID" ? (
                    <BookOpen className="h-4 w-4" />
                  ) : n.type === "CHAT_MESSAGE" ? (
                    <MessageCircle className="h-4 w-4" />
                  ) : n.type === "CLIENT_UPLOAD_FAILED" ? (
                    <Upload className="h-4 w-4" />
                  ) : n.type === "CLIENT_ERROR" ? (
                    <Bug className="h-4 w-4" />
                  ) : (
                    <ShoppingBag className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {n.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
                {!n.readAt && (
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
