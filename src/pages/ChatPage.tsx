import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Send, Paperclip, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { chatService } from "@/services/chatService";
import { uploadService } from "@/services/uploadService";
import { cn } from "@/utils/cn";
import { Spinner } from "@/components/ui/Spinner";
import type { ChatInboxItem, ChatMessage } from "@/types/chat";

// ---------- helpers ----------

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------- component ----------

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialUserId = searchParams.get("userId") ?? "";

  const [selectedUserId, setSelectedUserId] = useState(initialUserId);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Sync URL param → selection
  useEffect(() => {
    const uid = searchParams.get("userId") ?? "";
    if (uid) setSelectedUserId(uid);
  }, [searchParams]);

  // Update URL when user selects from inbox
  function selectUser(userId: string) {
    setSelectedUserId(userId);
    setSearchParams(userId ? { userId } : {});
  }

  // ---------- inbox ----------
  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ["chat-inbox"],
    queryFn: () => chatService.getInbox(),
    refetchInterval: 30_000,
  });

  const selectedInboxItem = inbox.find((i) => i.userId === selectedUserId);

  // ---------- thread ----------
  const { data: messages = [], isLoading: threadLoading } = useQuery({
    queryKey: ["chat-thread", selectedUserId],
    queryFn: () => chatService.getHistory(selectedUserId, { limit: 100 }),
    enabled: !!selectedUserId,
    refetchInterval: 8_000,
    select: (msgs) => [...msgs].reverse(), // API returns newest-first; reverse for bottom-up
  });

  // Scroll to bottom when thread loads / new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedUserId]);

  // Invalidate inbox after reading a thread (unread counts update server-side)
  useEffect(() => {
    if (selectedUserId) {
      queryClient.invalidateQueries({ queryKey: ["chat-inbox"] });
      queryClient.invalidateQueries({ queryKey: ["chat-unread-total"] });
    }
  }, [selectedUserId, queryClient]);

  // ---------- send ----------
  const sendMutation = useMutation({
    mutationFn: chatService.sendMessage,
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({
        queryKey: ["chat-thread", selectedUserId],
      });
      queryClient.invalidateQueries({ queryKey: ["chat-inbox"] });
    },
    onError: () => toast.error("Failed to send message"),
  });

  function handleSendText() {
    const trimmed = text.trim();
    if (!trimmed || !selectedUserId) return;
    sendMutation.mutate({
      userId: selectedUserId,
      type: "TEXT",
      content: trimmed,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedUserId) return;
      e.target.value = "";

      const isImage = file.type.startsWith("image/");
      const isAudio = file.type.startsWith("audio/");
      if (!isImage && !isAudio) {
        toast.error("Only images and audio files are supported.");
        return;
      }

      setUploading(true);
      try {
        const mediaUrl = await uploadService.presignUpload(file);
        sendMutation.mutate({
          userId: selectedUserId,
          type: isImage ? "IMAGE" : "AUDIO",
          mediaUrl,
        });
      } catch {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [selectedUserId, sendMutation],
  );

  // ---------- render ----------
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* ── Inbox sidebar ─────────────────────────────────────── */}
      <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Chat
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {inbox.length} conversation{inbox.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {inboxLoading ? (
            <div className="flex justify-center pt-8">
              <Spinner />
            </div>
          ) : inbox.length === 0 ? (
            <div className="pt-12 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-400">No conversations yet</p>
            </div>
          ) : (
            inbox.map((item) => (
              <InboxRow
                key={item.userId}
                item={item}
                selected={item.userId === selectedUserId}
                onClick={() => selectUser(item.userId)}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── Conversation pane ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {!selectedUserId ? (
          <EmptyState />
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-3 dark:border-gray-700">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {selectedInboxItem
                  ? (selectedInboxItem.userName ??
                      selectedInboxItem.userEmail)[0].toUpperCase()
                  : "?"}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedInboxItem?.userName ??
                    selectedInboxItem?.userEmail ??
                    selectedUserId}
                </p>
                {selectedInboxItem?.userName && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedInboxItem.userEmail}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
              {threadLoading ? (
                <div className="flex justify-center pt-10">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No messages yet. Say hello!
                </div>
              ) : (
                <MessageList messages={messages} />
              )}
              <div ref={bottomRef} />
            </div>

            {/* Compose */}
            <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="flex items-end gap-2">
                {/* Media upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sendMutation.isPending}
                  className="mb-0.5 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  title="Send image or audio"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>

                {/* Text input */}
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
                  style={{ maxHeight: "120px" }}
                />

                {/* Send */}
                <button
                  onClick={handleSendText}
                  disabled={!text.trim() || sendMutation.isPending || uploading}
                  className="mb-0.5 rounded-xl bg-emerald-500 p-2.5 text-white transition hover:bg-emerald-600 disabled:opacity-50"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- sub-components ----------

function InboxRow({
  item,
  selected,
  onClick,
}: {
  item: ChatInboxItem;
  selected: boolean;
  onClick: () => void;
}) {
  const preview =
    item.latestMessage.type === "TEXT"
      ? item.latestMessage.content
      : item.latestMessage.type === "IMAGE"
        ? "📷 Image"
        : "🎵 Audio";

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
        selected
          ? "bg-emerald-50 dark:bg-emerald-900/20"
          : "hover:bg-gray-50 dark:hover:bg-gray-800",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        {(item.userName ?? item.userEmail)[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <p
            className={cn(
              "truncate text-sm",
              selected
                ? "font-semibold text-emerald-700 dark:text-emerald-400"
                : "font-medium text-gray-900 dark:text-white",
            )}
          >
            {item.userName ?? item.userEmail}
          </p>
          <span className="shrink-0 text-[10px] text-gray-400">
            {new Date(item.latestMessage.createdAt).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </span>
        </div>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">
          {preview}
        </p>
      </div>
      {item.unreadCount > 0 && (
        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
          {item.unreadCount}
        </span>
      )}
    </button>
  );
}

function MessageList({ messages }: { messages: ChatMessage[] }) {
  const items = messages.map((msg, i) => ({
    msg,
    msgDate: dateDivider(msg.createdAt),
    showDivider:
      i === 0 ||
      dateDivider(msg.createdAt) !== dateDivider(messages[i - 1].createdAt),
    isFromUser: msg.senderId === msg.userId,
  }));

  return (
    <>
      {items.map(({ msg, msgDate, showDivider, isFromUser }) => (
        <div key={msg.id}>
          {showDivider && (
            <div className="flex items-center gap-3 py-3">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <span className="text-[10px] font-medium text-gray-400">
                {msgDate}
              </span>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
          )}
          <MessageBubble msg={msg} isFromUser={isFromUser} />
        </div>
      ))}
    </>
  );
}

function MessageBubble({
  msg,
  isFromUser,
}: {
  msg: ChatMessage;
  isFromUser: boolean;
}) {
  return (
    <div
      className={cn("flex mb-1", isFromUser ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm",
          isFromUser
            ? "rounded-tl-sm bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
            : "rounded-tr-sm bg-emerald-500 text-white",
        )}
      >
        {msg.type === "TEXT" && (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        )}

        {msg.type === "IMAGE" && msg.mediaUrl && (
          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={msg.mediaUrl}
              alt="Shared image"
              className="max-w-48 rounded-lg object-cover"
            />
            {msg.content && (
              <p className="mt-1 text-xs opacity-80">{msg.content}</p>
            )}
          </a>
        )}

        {msg.type === "AUDIO" && msg.mediaUrl && (
          <div>
            <audio controls src={msg.mediaUrl} className="max-w-48" />
            {msg.content && (
              <p className="mt-1 text-xs opacity-80">{msg.content}</p>
            )}
          </div>
        )}

        <p
          className={cn(
            "mt-0.5 text-[10px]",
            isFromUser ? "text-gray-400" : "text-emerald-100",
          )}
        >
          {timeLabel(msg.createdAt)}
          {!isFromUser && msg.readAt && (
            <span className="ml-1 opacity-70">· Read</span>
          )}
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <MessageCircle className="h-14 w-14 text-gray-200 dark:text-gray-700" />
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        Select a conversation to start chatting
      </p>
    </div>
  );
}
