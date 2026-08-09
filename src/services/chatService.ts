import api from "./api";
import type {
  ChatMessage,
  ChatInboxItem,
  SendMessagePayload,
} from "@/types/chat";

type RawChatMessage = ChatMessage & Record<string, unknown>;

function normalizeChatMessage(raw: RawChatMessage): ChatMessage {
  return {
    ...raw,
    mediaPlaybackUrl:
      (raw.mediaPlaybackUrl as string | null | undefined) ??
      (raw.media_playback_url as string | null | undefined) ??
      null,
  };
}

export const chatService = {
  async getUnreadTotal(): Promise<number> {
    const { data } = await api.get("/admin/chat/unread-total");
    return (data.data ?? data).count ?? 0;
  },

  async getInbox(): Promise<ChatInboxItem[]> {
    const { data } = await api.get("/admin/chat/inbox");
    const rows = (data.data ?? data) as (ChatInboxItem & {
      latestMessage: RawChatMessage;
    })[];
    return rows.map((row) => ({
      ...row,
      latestMessage: normalizeChatMessage(row.latestMessage),
    }));
  },

  async getHistory(
    userId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ChatMessage[]> {
    const { data } = await api.get(`/admin/chat/history/${userId}`, { params });
    const result = data.data ?? data;
    // Normalise: handle both plain array and paginated { items: [] } shapes
    const items = (Array.isArray(result) ? result : (result.items ?? [])) as RawChatMessage[];
    return items.map(normalizeChatMessage);
  },

  async sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
    const { data } = await api.post("/admin/chat/send", payload);
    return normalizeChatMessage((data.data ?? data) as RawChatMessage);
  },
};
