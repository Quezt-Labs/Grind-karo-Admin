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
  forbiddenAsError?: boolean;
}

function buildNotificationListError(status: number): Error & { status: number; code: string } {
  const message =
    status === 403
      ? "You can see unread count, but notification list access is currently restricted."
      : status === 400 || status === 422
        ? "Notification list request was rejected by the server."
        : status === 404
          ? "Notification list endpoint is unavailable."
          : "Failed to load notifications.";
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = status;
  error.code = status === 403 ? "FORBIDDEN" : "LIST_REQUEST_FAILED";
  return error;
}

export const notificationService = {
  async getAll(
    filters?: NotificationFilters,
    options?: NotificationServiceOptions,
  ): Promise<NotificationListResponse> {
    const run = async (params: Record<string, unknown>) =>
      api.get("/admin/notifications", {
        params,
        validateStatus: (status) =>
          (status >= 200 && status < 300) ||
          status === 400 ||
          status === 403 ||
          status === 404 ||
          status === 422,
      });

    const response = await run((filters ?? {}) as Record<string, unknown>);
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }

    // Backward-compatibility for rollout variants that expect `unread` instead of `unreadOnly`.
    if (
      (response.status === 400 || response.status === 422) &&
      typeof filters?.unreadOnly === "boolean"
    ) {
      const fallbackFilters: Record<string, unknown> = {
        ...(filters as Record<string, unknown>),
        unread: filters.unreadOnly,
      };
      delete fallbackFilters.unreadOnly;
      const retry = await run(fallbackFilters);
      if (retry.status >= 200 && retry.status < 300) {
        return retry.data;
      }
      if (retry.status === 403 && options?.gracefulForbidden && !options?.forbiddenAsError) {
        return {
          total: 0,
          unreadCount: 0,
          limit: filters?.limit ?? 20,
          offset: filters?.offset ?? 0,
          items: [],
        };
      }
      throw buildNotificationListError(retry.status);
    }

    if (response.status === 403 && options?.gracefulForbidden && !options?.forbiddenAsError) {
      return {
        total: 0,
        unreadCount: 0,
        limit: filters?.limit ?? 20,
        offset: filters?.offset ?? 0,
        items: [],
      };
    }

    throw buildNotificationListError(response.status);
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
    const endpoint = `/admin/notifications/${id}/read`;
    const run = (method: "patch" | "post") =>
      api.request({
        method,
        url: endpoint,
        validateStatus: (status) =>
          (status >= 200 && status < 300) ||
          status === 404 ||
          status === 405,
      });

    const response = await run("patch");
    if (response.status >= 200 && response.status < 300) {
      return response.data.data ?? response.data;
    }
    const fallback = await run("post");
    if (fallback.status >= 200 && fallback.status < 300) {
      return fallback.data.data ?? fallback.data;
    }
    throw new Error("Failed to mark notification as read.");
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
