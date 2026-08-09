import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useVirtualList } from "@/hooks/useVirtualList";
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
  Search,
  X,
  Reply,
  ExternalLink,
  Video,
} from "lucide-react";
import toast from "react-hot-toast";
import { chatService } from "@/services/chatService";
import { pushService } from "@/services/pushService";
import { uploadService } from "@/services/uploadService";
import { userService } from "@/services/userService";
import { athleteAssignmentService } from "@/services/athleteAssignmentService";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { ChatAudioPlayer } from "@/components/chat/ChatAudioPlayer";
import { ChatVideoPlayer } from "@/components/chat/ChatVideoPlayer";
import { LinkifiedText } from "@/components/shared/LinkifiedText";
import { cn } from "@/utils/cn";
import { isChatVideoMessage } from "@/utils/mediaUrl";
import { Spinner } from "@/components/ui/Spinner";
import type { ChatInboxItem, ChatMessage } from "@/types/chat";
import type { AdminUserPushStatus } from "@/types/push";

type InboxFilter = "all" | "unread";

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
  const { user: authUser } = useAuth();
  const isAdmin = authUser?.role === "ADMIN";
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedUserId = searchParams.get("userId") ?? "";
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{
    userId: string;
    message: ChatMessage;
  } | null>(null);
  const activeReply =
    replyTo?.userId === selectedUserId ? replyTo.message : null;
  const [userSearch, setUserSearch] = useState("");
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("all");
  const debouncedUserSearch = useDebounce(userSearch.trim(), 300);
  const [uploading, setUploading] = useState(false);
  const [windowFocused, setWindowFocused] = useState(
    () => typeof document !== "undefined" && document.hasFocus(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const voice = useVoiceRecorder();

  useEffect(() => {
    const onFocus = () => setWindowFocused(true);
    const onBlur = () => setWindowFocused(false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  function selectUser(userId: string) {
    setSearchParams(userId ? { userId } : {});
  }

  // ---------- inbox ----------
  const { data: inbox = [], isLoading: inboxLoading } = useQuery({
    queryKey: ["chat-inbox"],
    queryFn: () => chatService.getInbox(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const filteredInbox = useMemo(() => {
    const base =
      inboxFilter === "unread"
        ? inbox.filter((i) => i.unreadCount > 0)
        : [...inbox];
    return base.sort((a, b) => {
      if (b.unreadCount > 0 !== a.unreadCount > 0) {
        return b.unreadCount > 0 ? 1 : -1;
      }
      return (
        new Date(b.latestMessage.createdAt).getTime() -
        new Date(a.latestMessage.createdAt).getTime()
      );
    });
  }, [inbox, inboxFilter]);

  const unreadConversationCount = useMemo(
    () => inbox.filter((i) => i.unreadCount > 0).length,
    [inbox],
  );

  const selectedInboxItem = inbox.find((i) => i.userId === selectedUserId);

  const { data: selectedUser } = useQuery({
    queryKey: ["admin-user", selectedUserId],
    queryFn: () => userService.getById(selectedUserId),
    enabled: !!selectedUserId && !selectedInboxItem && isAdmin,
  });

  const { data: selectedCoachAthlete } = useQuery({
    queryKey: ["coach-athlete-summary", selectedUserId],
    queryFn: () =>
      athleteAssignmentService.getCoachAthleteSummary(selectedUserId),
    enabled:
      !!selectedUserId &&
      !selectedInboxItem &&
      authUser?.role === "ASSISTANT_COACH",
  });

  const selectedDisplayName =
    selectedInboxItem?.userName ??
    selectedInboxItem?.userEmail ??
    selectedUser?.name ??
    selectedUser?.email ??
    selectedCoachAthlete?.athlete.name ??
    selectedCoachAthlete?.athlete.email ??
    selectedUserId;
  const selectedDisplayEmail =
    selectedInboxItem?.userEmail ??
    selectedUser?.email ??
    selectedCoachAthlete?.athlete.email ??
    null;
  const selectedInitial = (selectedInboxItem?.userName ??
    selectedInboxItem?.userEmail ??
    selectedUser?.name ??
    selectedUser?.email ??
    selectedCoachAthlete?.athlete.name ??
    selectedCoachAthlete?.athlete.email ??
    "?")[0].toUpperCase();

  const { data: adminUserSearch } = useQuery({
    queryKey: ["chat-user-search", debouncedUserSearch],
    queryFn: () =>
      userService.getAll({
        q: debouncedUserSearch,
        role: "USER",
        limit: 8,
      }),
    enabled: isAdmin && debouncedUserSearch.length >= 2,
  });

  const { data: assignedAthletes } = useQuery({
    queryKey: ["coach-assigned-athletes"],
    queryFn: () => athleteAssignmentService.listAssignedAthletes(),
    enabled: authUser?.role === "ASSISTANT_COACH",
  });

  const coachSearchResults = useMemo(() => {
    if (
      authUser?.role !== "ASSISTANT_COACH" ||
      debouncedUserSearch.length < 2
    ) {
      return [];
    }
    const q = debouncedUserSearch.toLowerCase();
    return (assignedAthletes?.items ?? [])
      .filter(
        (a) =>
          a.athleteEmail.toLowerCase().includes(q) ||
          (a.athleteName?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, 8);
  }, [assignedAthletes, authUser?.role, debouncedUserSearch]);

  const userSearchResults = isAdmin
    ? (adminUserSearch?.items ?? [])
    : coachSearchResults.map((a) => ({
        id: a.athleteId,
        name: a.athleteName,
        email: a.athleteEmail,
      }));

  const showUserSearchResults = debouncedUserSearch.length >= 2;

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
    refetchInterval: windowFocused ? 8_000 : 45_000,
    refetchIntervalInBackground: false,
    select: (msgs) => [...msgs].reverse(), // API returns newest-first; reverse for bottom-up
  });

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
      setReplyTo(null);
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
      ...(activeReply ? { parentMessageId: activeReply.id } : {}),
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
          ...(activeReply ? { parentMessageId: activeReply.id } : {}),
        });
      } catch {
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [selectedUserId, sendMutation, activeReply],
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

  // ── Message items with date dividers ───────────────────────
  const items = useMemo(
    () =>
      messages.map((msg, i) => ({
        msg,
        msgDate: dateDivider(msg.createdAt),
        showDivider:
          i === 0 ||
          dateDivider(msg.createdAt) !== dateDivider(messages[i - 1].createdAt),
        isFromUser: msg.senderId === msg.userId,
      })),
    [messages],
  );

  const showInbox = !selectedUserId;
  const showThread = !!selectedUserId;

  // ── Inbox virtualizer ──────────────────────────────────────
  const inboxScrollRef = useRef<HTMLDivElement>(null);
  const inboxVirtualizer = useVirtualList({
    count: filteredInbox.length,
    getScrollElement: () => inboxScrollRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // ── Thread virtualizer ─────────────────────────────────────
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const threadVirtualizer = useVirtualList({
    count: messages.length,
    getScrollElement: () => threadScrollRef.current,
    estimateSize: () => 64,
    overscan: 8,
  });

  // Scroll thread to bottom on new messages / thread switch
  useEffect(() => {
    if (!threadScrollRef.current || messages.length === 0) return;
    requestAnimationFrame(() => {
      if (threadScrollRef.current) {
        threadScrollRef.current.scrollTop =
          threadScrollRef.current.scrollHeight;
      }
    });
  }, [messages.length, selectedUserId]);

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
            {unreadConversationCount > 0
              ? ` · ${unreadConversationCount} unread`
              : ""}
          </p>
          <div className="mt-2 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-gray-600 dark:bg-gray-800/80">
            {(
              [
                { id: "all" as const, label: "All" },
                {
                  id: "unread" as const,
                  label:
                    unreadConversationCount > 0
                      ? `Unread (${unreadConversationCount})`
                      : "Unread",
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setInboxFilter(opt.id)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  inboxFilter === opt.id
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] leading-snug text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Clients with notifications enabled get a push when you reply (if
            they turned on coach messages in the app).
          </p>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search user by name or email..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-8 text-xs text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-gray-400" />
              </button>
            )}
          </div>
          {showUserSearchResults && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
              {userSearchResults.length === 0 ? (
                <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                  No users found
                </p>
              ) : (
                userSearchResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      selectUser(u.id);
                      setUserSearch("");
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700",
                      u.id === selectedUserId &&
                        "bg-emerald-50 dark:bg-emerald-900/20",
                    )}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {(u.name ?? u.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900 dark:text-white">
                        {u.name ?? u.email}
                      </p>
                      {u.name && (
                        <p className="truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {u.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" ref={inboxScrollRef}>
          {inboxLoading ? (
            <div className="flex justify-center pt-8">
              <Spinner />
            </div>
          ) : filteredInbox.length === 0 ? (
            <div className="pt-12 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="mt-2 text-sm text-gray-400">
                {inboxFilter === "unread"
                  ? "No unread conversations"
                  : "No conversations yet"}
              </p>
              {inboxFilter === "unread" && inbox.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setInboxFilter("all")}
                  className="mt-2 text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Show all
                </button>
              ) : null}
            </div>
          ) : (
            <div
              style={{
                height: inboxVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {inboxVirtualizer.getVirtualItems().map((vi) => (
                <div
                  key={vi.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <InboxRow
                    item={filteredInbox[vi.index]}
                    selected={filteredInbox[vi.index].userId === selectedUserId}
                    onClick={() => selectUser(filteredInbox[vi.index].userId)}
                  />
                </div>
              ))}
            </div>
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
                {selectedInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedDisplayName}
                </p>
                {selectedDisplayEmail &&
                  selectedDisplayName !== selectedDisplayEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedDisplayEmail}
                    </p>
                  )}
                <div className="mt-1 flex flex-wrap gap-2">
                  <Link
                    to={`/users/${selectedUserId}?tab=activity`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    Profile
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Link
                    to={`/form-checks?userId=${encodeURIComponent(selectedUserId)}&review=pending`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline dark:text-indigo-400"
                  >
                    <Video className="h-3 w-3" />
                    Form checks
                  </Link>
                </div>
              </div>
              {pushStatus && <PushStatusBadge status={pushStatus} />}
            </div>

            {/* Messages */}
            <div
              ref={threadScrollRef}
              className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4"
            >
              {threadLoading ? (
                <div className="flex justify-center pt-10">
                  <Spinner />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No messages yet. Say hello!
                </div>
              ) : (
                <div
                  style={{
                    height: threadVirtualizer.getTotalSize(),
                    position: "relative",
                  }}
                >
                  {threadVirtualizer.getVirtualItems().map((vi) => {
                    const item = items[vi.index];
                    return (
                      <div
                        key={vi.key}
                        data-index={vi.index}
                        ref={threadVirtualizer.measureElement}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          transform: `translateY(${vi.start}px)`,
                        }}
                      >
                        {item.showDivider && (
                          <div className="flex items-center gap-3 py-3">
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                            <span className="text-[10px] font-medium text-gray-400">
                              {item.msgDate}
                            </span>
                            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                          </div>
                        )}
                        <MessageBubble
                          msg={item.msg}
                          isFromUser={item.isFromUser}
                          onReply={() =>
                            setReplyTo({
                              userId: selectedUserId,
                              message: item.msg,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compose */}
            <div className="shrink-0 border-t border-gray-200 px-3 py-2.5 dark:border-gray-700 sm:px-4 sm:py-3">
              {activeReply ? (
                <div className="mb-2 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 dark:border-emerald-800/40 dark:bg-emerald-900/20">
                  <Reply className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Replying to…
                    </p>
                    <p className="truncate text-xs text-gray-700 dark:text-gray-200">
                      {replyPreviewLabel(activeReply)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="rounded p-0.5 text-gray-400 hover:bg-emerald-100 hover:text-gray-600 dark:hover:bg-emerald-900/40"
                    aria-label="Cancel reply"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
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
  const hasUnread = item.unreadCount > 0;
  const preview =
    item.latestMessage.type === "TEXT"
      ? item.latestMessage.content
      : item.latestMessage.type === "IMAGE"
        ? isChatVideoMessage(item.latestMessage)
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
          : hasUnread
            ? "bg-emerald-50/40 hover:bg-emerald-50/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30"
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
                : hasUnread
                  ? "font-bold text-gray-900 dark:text-white"
                  : "font-medium text-gray-900 dark:text-white",
            )}
          >
            {item.userName ?? item.userEmail}
          </p>
          <span
            className={cn(
              "shrink-0 text-[10px]",
              hasUnread
                ? "font-semibold text-emerald-600 dark:text-emerald-400"
                : "text-gray-400",
            )}
          >
            {new Date(item.latestMessage.createdAt).toLocaleTimeString(
              "en-IN",
              {
                hour: "2-digit",
                minute: "2-digit",
              },
            )}
          </span>
        </div>
        <p
          className={cn(
            "truncate text-xs",
            hasUnread
              ? "font-medium text-gray-700 dark:text-gray-200"
              : "text-gray-500 dark:text-gray-400",
          )}
        >
          {preview}
        </p>
      </div>
      {hasUnread && (
        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-emerald-500/30">
          {item.unreadCount > 99 ? "99+" : item.unreadCount}
        </span>
      )}
    </button>
  );
}

function formatRecordTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function replyPreviewLabel(msg: ChatMessage): string {
  if (msg.content?.trim()) return msg.content.trim();
  if (msg.type === "IMAGE") {
    return isChatVideoMessage(msg) ? "Video" : "Image";
  }
  if (msg.type === "AUDIO") return "Voice note";
  return "Message";
}

function parentQuotePreview(msg: ChatMessage): string | null {
  if (!msg.parent) return null;
  const preview = msg.parent.contentPreview?.trim();
  if (preview) return preview;
  return "Original message";
}

function MessageBubble({
  msg,
  isFromUser,
  onReply,
}: {
  msg: ChatMessage;
  isFromUser: boolean;
  onReply: () => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const parentPreview = parentQuotePreview(msg);

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
      className={cn(
        "group mb-1 flex items-end gap-1",
        isFromUser ? "justify-start" : "justify-end",
      )}
    >
      {!isFromUser ? (
        <button
          type="button"
          onClick={onReply}
          className="mb-1 rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Reply"
          aria-label="Reply"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <div
        className={cn(
          "max-w-[70%] overflow-hidden rounded-2xl text-sm",
          msg.type !== "IMAGE" && "px-4 py-2.5",
          isFromUser
            ? "rounded-tl-sm bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white"
            : "rounded-tr-sm bg-emerald-500 text-white",
        )}
      >
        {parentPreview ? (
          <div
            className={cn(
              "mb-1.5 rounded-lg border-l-2 px-2 py-1 text-[11px] leading-snug",
              isFromUser
                ? "border-emerald-500/60 bg-white/60 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300"
                : "border-white/50 bg-black/10 text-emerald-50",
            )}
          >
            <p className="line-clamp-2">{parentPreview}</p>
          </div>
        ) : null}

        {msg.type === "TEXT" && (
          <>
            <LinkifiedText
              text={msg.content ?? ""}
              className="break-all"
              linkClassName={
                isFromUser
                  ? undefined
                  : "break-all font-medium text-white underline underline-offset-2 hover:opacity-90"
              }
            />
            {timeStamp}
          </>
        )}

        {msg.type === "IMAGE" && msg.mediaUrl && (
          <>
            {isChatVideoMessage(msg) ? (
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
                <LinkifiedText
                  text={msg.content}
                  className="mb-0.5 wrap-break-word text-xs opacity-80"
                  linkClassName={
                    isFromUser
                      ? undefined
                      : "break-all font-medium text-white underline underline-offset-2 hover:opacity-90"
                  }
                />
              )}
              {timeStamp}
            </div>

            {/* Lightbox */}
            {lightbox && !isChatVideoMessage(msg) && (
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
            <ChatAudioPlayer
              src={msg.mediaPlaybackUrl ?? msg.mediaUrl}
              originalUrl={msg.mediaUrl}
              isFromUser={isFromUser}
            />
            {msg.content && (
              <p className="mt-1 wrap-break-word text-xs opacity-80">
                {msg.content}
              </p>
            )}
            {timeStamp}
          </>
        )}
      </div>
      {isFromUser ? (
        <button
          type="button"
          onClick={onReply}
          className="mb-1 rounded-lg p-1.5 text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          title="Reply"
          aria-label="Reply"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      ) : null}
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
