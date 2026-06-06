import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import { chatService } from "@/services/chatService";
import type { ChatInboxItem } from "@/types/chat";

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

function pickLatestUnreadThread(inbox: ChatInboxItem[]): ChatInboxItem | null {
  const unread = inbox.filter((i) => i.unreadCount > 0);
  if (unread.length === 0) return null;
  return [...unread].sort(
    (a, b) =>
      new Date(b.latestMessage.createdAt).getTime() -
      new Date(a.latestMessage.createdAt).getTime(),
  )[0]!;
}

export function ChatBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prevUnreadRef = useRef<number | null>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["chat-unread-total"],
    queryFn: () => chatService.getUnreadTotal(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const { data: inbox = [] } = useQuery({
    queryKey: ["chat-inbox"],
    queryFn: () => chatService.getInbox(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const prev = prevUnreadRef.current;
    if (prev != null && unreadCount > prev) {
      void queryClient
        .fetchQuery({
          queryKey: ["chat-inbox"],
          queryFn: () => chatService.getInbox(),
        })
        .then((freshInbox) => {
          const latest = pickLatestUnreadThread(freshInbox);
          const name = latest?.userName ?? latest?.userEmail ?? "Client";
          toast(
            (t) => (
              <button
                type="button"
                className="text-left text-sm"
                onClick={() => {
                  toast.dismiss(t.id);
                  if (latest) navigate(`/chat?userId=${latest.userId}`);
                  else navigate("/chat");
                }}
              >
                <span className="font-semibold">New message</span>
                <span className="mt-0.5 block text-gray-600 dark:text-gray-300">
                  {name}
                </span>
              </button>
            ),
            { duration: 6000 },
          );
        });
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, queryClient, navigate]);

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
        title="Chat Inbox"
      >
        <MessageCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <ChatInboxPanel onClose={() => setOpen(false)} inbox={inbox} />}
    </div>
  );
}

function ChatInboxPanel({
  onClose,
  inbox,
}: {
  onClose: () => void;
  inbox: ChatInboxItem[];
}) {
  const navigate = useNavigate();

  function handleUserClick(item: ChatInboxItem) {
    navigate(`/chat?userId=${item.userId}`);
    onClose();
  }

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:w-96">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Chat Inbox
          </h3>
          {inbox.filter((i) => i.unreadCount > 0).length > 0 && (
            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              {inbox.filter((i) => i.unreadCount > 0).length} unread
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {inbox.length === 0 ? (
          <div className="py-8 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-400">No conversations yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {inbox.map((item) => (
              <button
                key={item.userId}
                onClick={() => handleUserClick(item)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  {(item.userName ?? item.userEmail)[0].toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {item.userName ?? item.userEmail}
                    </p>
                    <span className="shrink-0 text-[10px] text-gray-400">
                      {timeAgo(item.latestMessage.createdAt)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {item.latestMessage.type === "TEXT"
                      ? item.latestMessage.content
                      : item.latestMessage.type === "IMAGE"
                        ? "📷 Image"
                        : "🎵 Audio"}
                  </p>
                </div>

                {item.unreadCount > 0 && (
                  <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                    {item.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
        <button
          onClick={() => {
            navigate("/chat");
            onClose();
          }}
          className="w-full rounded-lg py-1.5 text-center text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
        >
          Open chat dashboard
        </button>
      </div>
    </div>
  );
}
