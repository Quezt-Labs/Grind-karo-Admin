import api from "./api";
import type {
  ChatMessage,
  ChatInboxItem,
  SendMessagePayload,
} from "@/types/chat";

export const chatService = {
  async getUnreadTotal(): Promise<number> {
    const { data } = await api.get("/admin/chat/unread-total");
    return (data.data ?? data).count ?? 0;
  },

  async getInbox(): Promise<ChatInboxItem[]> {
    const { data } = await api.get("/admin/chat/inbox");
    return data.data ?? data;
  },

  async getHistory(
    userId: string,
    params?: { limit?: number; offset?: number },
  ): Promise<ChatMessage[]> {
    const { data } = await api.get(`/admin/chat/history/${userId}`, { params });
    return data.data ?? data;
  },

  async sendMessage(payload: SendMessagePayload): Promise<ChatMessage> {
    const { data } = await api.post("/admin/chat/send", payload);
    return data.data ?? data;
  },
};
