import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import type { NotificationListResponse } from "@/types/user";
import {
  buildNotificationInboxModel,
  NOTIFICATION_INBOX_LIST_LIMIT,
} from "@/utils/notificationInboxDisplay";

export const NOTIFICATION_INBOX_QUERY_KEY = [
  "notifications-unread-list",
] as const;

export async function fetchNotificationInbox(): Promise<NotificationListResponse> {
  try {
    return await notificationService.getAll(
      { unreadOnly: true, limit: NOTIFICATION_INBOX_LIST_LIMIT },
      { gracefulForbidden: true, forbiddenAsError: false },
    );
  } catch {
    return {
      total: 0,
      unreadCount: 0,
      limit: NOTIFICATION_INBOX_LIST_LIMIT,
      offset: 0,
      items: [],
    };
  }
}

export function useNotificationInbox(options?: { enabled?: boolean }) {
  const query = useQuery({
    queryKey: NOTIFICATION_INBOX_QUERY_KEY,
    queryFn: fetchNotificationInbox,
    enabled: options?.enabled ?? true,
    retry: 1,
    staleTime: 5_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 30_000
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const inbox = buildNotificationInboxModel(query.data?.items ?? []);

  return { ...query, ...inbox };
}
