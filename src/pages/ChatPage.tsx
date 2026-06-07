import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageCircle,
  Send,
  Paperclip,
  Loader2,
  Bell,
  BellOff,
  Info,
  ChevronLeft,
  Mic,
  Square,
} from "lucide-react";
import toast from "react-hot-toast";
import { chatService } from "@/services/chatService";
import { pushService } from "@/services/pushService";
import { uploadService } from "@/services/uploadService";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { ChatAudioPlayer } from "@/components/chat/ChatAudioPlayer";
import { ChatVideoPlayer } from "@/components/chat/ChatVideoPlayer";
import { cn } from "@/utils/cn";
import { isVideoMediaUrl } from "@/utils/mediaUrl";
import { Spinner } from "@/components/ui/Spinner";
import type { ChatInboxItem, ChatMessage } from "@/types/chat";
import type { AdminUserPushStatus } from "@/types/push";

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
  const selectedUserId = searchParams.get("userId") ?? "";
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const voice = useVoiceRecorder();

  function selectUser(userId: string) {
    setSearchParams(userId ? { userId } : {});
  }

  // ---------- inbox ----------
  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ["chat-inbox"],
    queryFn: () => chatService.getInbox(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });

  const selectedInboxItem = inbox.find((i) => i.userId === selectedUserId);

  const { data: pushStatus } = useQuery({
    queryKey: ["admin-push-status", selectedUserId],
    queryFn: () => pushService.getUserStatus(selectedUserId),
    enabled: !!selectedUserId,
  });

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

  const uploadAndSendFile = useCallback(
    async (file: File) => {
      if (!selectedUserId) return;
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isAudio =
        file.type.startsWith("audio/") || /^voice-\d+\./.test(file.name);
      if (!isImage && !isVideo && !isAudio) {
        toast.error("Only images, videos, and audio files are supported.");
        return;
      }
      setUploading(true);
      try {
        const mediaUrl = await uploadService.presignUpload(file);
        sendMutation.mutate({
          userId: selectedUserId,
          type: isAudio ? "AUDIO" : "IMAGE",
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

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      await uploadAndSendFile(file);
    },
    [uploadAndSendFile],
  );

  async function handleVoiceToggle() {
    if (voice.recording) {
      const file = await voice.stop();
      if (file) await uploadAndSendFile(file);
      return;
    }
    try {
      await voice.start();
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  const showInbox = !selectedUserId;
  const showThread = !!selectedUserId;

  // ---------- render ----------
  return (
    <div className="admin-bleed-x flex h-[calc(100dvh-3.5rem-1.5rem)] min-h-[min(70dvh,640px)] flex-col overflow-hidden rounded-none border border-gray-200 bg-white sm:h-[calc(100dvh-4rem-2rem)] sm:rounded-xl lg:h-[calc(100dvh-4rem-3rem)] dark:border-gray-700 dark:bg-gray-900 md:flex-row">
      {/* ── Inbox sidebar ─────────────────────────────────────── */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-gray-200 dark:border-gray-700 md:w-72 md:border-r",
          showInbox ? "flex min-h-0 flex-1 md:flex-none" : "hidden md:flex",
        )}
      >
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            Chat
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {inbox.length} conversation{inbox.length !== 1 ? "s" : ""}
          </p>
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] leading-snug text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Clients with notifications enabled get a push when you reply (if
            they turned on coach messages in the app).
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
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          showThread ? "flex" : "hidden md:flex",
        )}
      >
        {!selectedUserId ? (
          <EmptyState />
        ) : (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-2.5 dark:border-gray-700 sm:gap-3 sm:px-5 sm:py-3">
              <button
                type="button"
                onClick={() => selectUser("")}
                className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 md:hidden"
                aria-label="Back to conversations"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                {selectedInboxItem
                  ? (selectedInboxItem.userName ??
                      selectedInboxItem.userEmail)[0].toUpperCase()
                  : "?"}
              </div>
              <div className="min-w-0 flex-1">
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
              {pushStatus && <PushStatusBadge status={pushStatus} />}
            </div>

            {/* Messages */}
            <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-1 sm:px-5 sm:py-4">
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
            <div className="shrink-0 border-t border-gray-200 px-3 py-2.5 dark:border-gray-700 sm:px-4 sm:py-3">
              {voice.recording && (
                <div
                  className="mb-2 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 dark:border-red-900/40 dark:bg-red-900/20"
                  role="status"
                  aria-live="polite"
                >
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                  </span>
                  <p className="min-w-0 flex-1 text-xs font-medium text-red-700 dark:text-red-300">
                    Recording voice note… tap stop when done
                  </p>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-gray-700 dark:text-gray-200">
                    {formatRecordTime(voice.elapsedSec)}
                  </span>
                </div>
              )}

              <div className="flex items-end gap-1.5 sm:gap-2">
                {/* Media upload */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={
                    uploading || sendMutation.isPending || !!voice.recording
                  }
                  className="mb-0.5 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  title="Send image, video, or audio file"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Paperclip className="h-5 w-5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void handleVoiceToggle()}
                  disabled={uploading || sendMutation.isPending}
                  className={cn(
                    "mb-0.5 rounded-lg p-2 disabled:opacity-50",
                    voice.recording
                      ? "bg-red-100 text-red-600 animate-pulse dark:bg-red-900/30 dark:text-red-400"
                      : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200",
                  )}
                  title={
                    voice.recording
                      ? "Stop and send voice note"
                      : "Record voice note"
                  }
                >
                  {voice.recording ? (
                    <Square className="h-5 w-5 fill-current" />
                  ) : (
                    <Mic className="h-5 w-5" />
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
        ? item.latestMessage.mediaUrl &&
          isVideoMediaUrl(item.latestMessage.mediaUrl)
          ? "🎬 Video"
          : "📷 Image"
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

function formatRecordTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MessageBubble({
  msg,
  isFromUser,
}: {
  msg: ChatMessage;
  isFromUser: boolean;
}) {
  const [lightbox, setLightbox] = useState(false);

  const timeStamp = (
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
  );

  return (
    <div
      className={cn("flex mb-1", isFromUser ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[70%] overflow-hidden rounded-2xl text-sm",
          msg.type !== "IMAGE" && "px-4 py-2.5",
          isFromUser
            ? "rounded-tl-sm bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
            : "rounded-tr-sm bg-emerald-500 text-white",
        )}
      >
        {msg.type === "TEXT" && (
          <>
            <p className="whitespace-pre-wrap break-all">{msg.content}</p>
            {timeStamp}
          </>
        )}

        {msg.type === "IMAGE" && msg.mediaUrl && (
          <>
            {isVideoMediaUrl(msg.mediaUrl) ? (
              <ChatVideoPlayer src={msg.mediaUrl} isFromUser={isFromUser} />
            ) : (
              <button
                onClick={() => setLightbox(true)}
                className="block cursor-zoom-in"
              >
                <img
                  src={msg.mediaUrl}
                  alt="Shared image"
                  className="block w-full max-w-xs object-cover transition-opacity hover:opacity-90"
                />
              </button>
            )}
            <div className="px-3 pb-2 pt-1.5">
              {msg.content && (
                <p className="mb-0.5 wrap-break-word text-xs opacity-80">
                  {msg.content}
                </p>
              )}
              {timeStamp}
            </div>

            {/* Lightbox */}
            {lightbox && !isVideoMediaUrl(msg.mediaUrl) && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={() => setLightbox(false)}
              >
                <img
                  src={msg.mediaUrl}
                  alt="Full size"
                  className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        )}

        {msg.type === "AUDIO" && msg.mediaUrl && (
          <>
            <ChatAudioPlayer src={msg.mediaUrl} isFromUser={isFromUser} />
            {msg.content && (
              <p className="mt-1 wrap-break-word text-xs opacity-80">
                {msg.content}
              </p>
            )}
            {timeStamp}
          </>
        )}
      </div>
    </div>
  );
}

function PushStatusBadge({ status }: { status: AdminUserPushStatus }) {
  if (!status.pushConfigured) {
    return (
      <span
        className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
        title="Server push not configured"
      >
        Push off (server)
      </span>
    );
  }

  const on = status.deviceCount > 0 && status.chatNotificationsEnabled;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        on
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
      )}
      title={
        on
          ? `${status.deviceCount} device(s) will get push for your replies`
          : "Client has not enabled app notifications"
      }
    >
      {on ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
      {on ? "Push on" : "Push off"}
    </span>
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
