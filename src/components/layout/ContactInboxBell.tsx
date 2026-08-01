import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Inbox, MailOpen, Trash2, X } from "lucide-react";
import { contactService } from "@/services/contactService";
import type { ContactSubmission } from "@/types/contact";
import toast from "react-hot-toast";

export function ContactInboxBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ["contact-unread-bell"],
    queryFn: () => contactService.getAll({ unreadOnly: true, limit: 5 }),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const unreadCount = data?.unreadCount ?? 0;

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
        title="Contact Inbox"
      >
        <Inbox className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <ContactPanel onClose={() => setOpen(false)} />}
    </div>
  );
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

function ContactPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["contact-unread-panel"],
    queryFn: () => contactService.getAll({ unreadOnly: true, limit: 10 }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => contactService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact-unread-bell"] });
      queryClient.invalidateQueries({ queryKey: ["contact-unread-panel"] });
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => contactService.remove(id),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["contact-unread-bell"] });
      queryClient.invalidateQueries({ queryKey: ["contact-unread-panel"] });
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
    },
  });

  const items: ContactSubmission[] = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Contact Inbox
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {unreadCount}
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

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center">
            <Inbox className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-400">No unread messages</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((item) => (
              <div
                key={item.id}
                className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-750"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Inbox className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {item.name}{" "}
                    <span className="font-normal text-gray-400">
                      &lt;{item.email}&gt;
                    </span>
                  </p>
                  <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                    {item.subject}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">
                    {timeAgo(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => markReadMut.mutate(item.id)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-green-600 dark:hover:bg-gray-600 dark:hover:text-green-400"
                    title="Mark read"
                  >
                    <MailOpen className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(item.id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 dark:border-gray-700">
        <button
          onClick={() => {
            navigate("/contact");
            onClose();
          }}
          className="w-full rounded-lg py-1.5 text-center text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/20"
        >
          View all submissions
        </button>
      </div>
    </div>
  );
}
