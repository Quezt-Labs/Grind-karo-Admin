import { useQuery } from "@tanstack/react-query";
import { chatService } from "@/services/chatService";

export const chatKeys = {
  unreadTotal: () => ["chat-unread-total"] as const,
  inbox: () => ["chat-inbox"] as const,
  thread: (userId: string) => ["chat-thread", userId] as const,
};

const UNREAD_POLL_MS = 30_000;
const INBOX_POLL_MS = 15_000;

/**
 * Canonical chat unread-total badge query.
 *
 * Previously ChatBell and Sidebar each declared this query with different
 * refetchIntervals (15s vs 30s). React Query resolves competing observers to
 * the smallest interval, so the sidebar's 30s setting was silently ignored.
 * Both now share one definition.
 */
export function useChatUnreadTotal() {
  return useQuery({
    queryKey: chatKeys.unreadTotal(),
    queryFn: () => chatService.getUnreadTotal(),
    refetchInterval: UNREAD_POLL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    staleTime: UNREAD_POLL_MS / 2,
  });
}

/**
 * Chat inbox list. Polling is opt-in so mounting this for a collapsed popover
 * does not create a permanent background request.
 */
export function useChatInbox({ poll = false }: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: chatKeys.inbox(),
    queryFn: () => chatService.getInbox(),
    refetchInterval: poll ? INBOX_POLL_MS : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: poll,
    staleTime: INBOX_POLL_MS / 2,
  });
}
