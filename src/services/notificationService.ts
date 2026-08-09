import api from "./api";
import type {
  AdminNotification,
  NotificationListResponse,
  NotificationType,
} from "@/types/user";

export interface NotificationFilters {
  unreadOnly?: boolean;
  type?: NotificationType;
  category?: string;
  priority?: "low" | "normal" | "high" | "critical";
  limit?: number;
  offset?: number;
}

interface NotificationServiceOptions {
  gracefulForbidden?: boolean;
}

export const notificationService = {
  async getAll(
    filters?: NotificationFilters,
    options?: NotificationServiceOptions,
  ): Promise<NotificationListResponse> {
    const response = await api.get("/admin/notifications", {
      params: filters,
      validateStatus: (status) =>
        (status >= 200 && status < 300) ||
        (options?.gracefulForbidden === true && status === 403),
    });
    if (response.status === 403 && options?.gracefulForbidden) {
      return {
        total: 0,
        unreadCount: 0,
        limit: filters?.limit ?? 20,
        offset: filters?.offset ?? 0,
        items: [],
      };
    }
    return response.data;
  },

  async getUnreadCount(options?: NotificationServiceOptions): Promise<number> {
    const response = await api.get("/admin/notifications/unread-count", {
      validateStatus: (status) =>
        (status >= 200 && status < 300) ||
        (options?.gracefulForbidden === true && status === 403),
    });
    if (response.status === 403 && options?.gracefulForbidden) {
      return 0;
    }
    return response.data.unreadCount;
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

  async removeByType(type: NotificationType): Promise<number> {
    const { data } = await api.post("/admin/notifications/bulk-delete", {
      type,
    });
    return data.deletedCount ?? 0;
  },
};
