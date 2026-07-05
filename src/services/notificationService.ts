import api from "./api";
import type {
  AdminNotification,
  NotificationListResponse,
  NotificationType,
} from "@/types/user";

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  limit?: number;
  offset?: number;
}

export const notificationService = {
  async getAll(
    filters?: NotificationFilters,
  ): Promise<NotificationListResponse> {
    const { data } = await api.get("/admin/notifications", {
      params: filters,
    });
    return data;
  },

  async getUnreadCount(): Promise<number> {
    const { data } = await api.get("/admin/notifications/unread-count");
    return data.unreadCount;
  },

  async markRead(id: string): Promise<AdminNotification> {
    const { data } = await api.post(`/admin/notifications/${id}/read`);
    return data;
  },

  async markAllRead(): Promise<{ markedRead: number }> {
    const { data } = await api.post("/admin/notifications/read-all");
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/notifications/${id}`);
  },
};
