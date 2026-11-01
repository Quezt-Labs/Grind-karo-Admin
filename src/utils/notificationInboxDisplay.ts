import type { FormCheckThreadType } from "@/services/workoutVideoCommentService";
import type { AdminNotification } from "@/types/user";

export const NOTIFICATION_INBOX_EXCLUDED_TYPES = new Set<string>([
  "CLIENT_ERROR",
  "CLIENT_UPLOAD_FAILED",
]);

export const NOTIFICATION_INBOX_LIST_LIMIT = 100;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function parseThreadType(value: unknown): FormCheckThreadType | null {
  if (value === "workout" || value === "program") return "workout";
  if (value === "sheets" || value === "sheet") return "sheets";
  return null;
}

export type FormCheckNotificationMeta = {
  userId: string | null;
  athleteName: string | null;
  videoId: string | null;
  commentId: string | null;
  messageId: string | null;
  threadType: FormCheckThreadType | null;
  preview: string;
  groupKey: string;
};

export function isFormCheckNotification(n: AdminNotification): boolean {
  return (
    n.type.includes("FORM_CHECK") ||
    (n.category?.toLowerCase() ?? "") === "form_check"
  );
}

export function formCheckMeta(n: AdminNotification): FormCheckNotificationMeta {
  const payload = asRecord(n.payload) ?? {};
  const athlete = asRecord(payload.athlete);
  const deepLink =
    asRecord(payload.deepLink) ??
    asRecord(payload.deeplink) ??
    asRecord(payload.link);
  const userId = pickString(
    payload.athleteId,
    payload.athlete_id,
    athlete?.id,
    deepLink?.athleteId,
    deepLink?.athlete_id,
    deepLink?.userId,
    deepLink?.user_id,
    payload.targetUserId,
    payload.target_user_id,
    payload.userId,
    payload.user_id,
  );
  const videoId = pickString(
    payload.videoId,
    payload.video_id,
    payload.workoutSetVideoId,
    payload.sheetSetVideoId,
    deepLink?.videoId,
    deepLink?.video_id,
  );
  const commentId = pickString(
    payload.commentId,
    payload.comment_id,
    deepLink?.commentId,
    deepLink?.comment_id,
  );
  const messageId = pickString(
    payload.messageId,
    payload.message_id,
    deepLink?.messageId,
    deepLink?.message_id,
  );
  const threadType =
    parseThreadType(payload.threadType) ??
    parseThreadType(payload.thread_type) ??
    parseThreadType(deepLink?.threadType) ??
    parseThreadType(deepLink?.thread_type) ??
    parseThreadType(payload.source) ??
    parseThreadType(deepLink?.source) ??
    null;
  const athleteName = pickString(
    payload.athleteName,
    payload.athlete_name,
    payload.userName,
    payload.user_name,
    payload.name,
  );
  const preview =
    pickString(
      payload.preview,
      payload.messagePreview,
      payload.comment,
      n.message,
    ) ?? n.message;
  const groupKey =
    pickString(
      payload.groupKey,
      payload.group_key,
      commentId,
      videoId && userId ? `${userId}:${videoId}:${threadType}` : null,
      userId ? `${userId}:${threadType}` : null,
    ) ?? n.id;
  return {
    userId,
    athleteName,
    videoId,
    commentId,
    messageId,
    threadType,
    preview,
    groupKey,
  };
}

export function filterInboxNotifications(
  items: AdminNotification[],
): AdminNotification[] {
  return items.filter((n) => !NOTIFICATION_INBOX_EXCLUDED_TYPES.has(n.type));
}

export type FormCheckInboxGroup = {
  key: string;
  meta: FormCheckNotificationMeta;
  notifications: AdminNotification[];
};

export type NotificationInboxModel = {
  items: AdminNotification[];
  formCheckGroups: FormCheckInboxGroup[];
  otherItems: AdminNotification[];
  /** Rows shown in the bell (grouped form checks + other), not raw DB unread rows. */
  badgeCount: number;
};

export function buildNotificationInboxModel(
  rawItems: AdminNotification[],
): NotificationInboxModel {
  const items = filterInboxNotifications(rawItems);
  const candidates = items
    .filter((item) => isFormCheckNotification(item))
    .map((notification) => ({
      notification,
      meta: formCheckMeta(notification),
    }));
  const groups = new Map<
    string,
    { meta: FormCheckNotificationMeta; notifications: AdminNotification[] }
  >();
  candidates.forEach(({ notification, meta }) => {
    const existing = groups.get(meta.groupKey);
    if (existing) {
      existing.notifications.push(notification);
      return;
    }
    groups.set(meta.groupKey, { meta, notifications: [notification] });
  });
  const formCheckGroups = Array.from(groups.entries())
    .map(([key, value]) => ({
      key,
      meta: value.meta,
      notifications: value.notifications.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    }))
    .sort(
      (a, b) =>
        new Date(b.notifications[0].createdAt).getTime() -
        new Date(a.notifications[0].createdAt).getTime(),
    );

  const formCheckGroupIds = new Set<string>();
  formCheckGroups.forEach((group) => {
    group.notifications.forEach((item) => formCheckGroupIds.add(item.id));
  });

  const otherItems = items
    .filter((item) => !formCheckGroupIds.has(item.id))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  return {
    items,
    formCheckGroups,
    otherItems,
    badgeCount: formCheckGroups.length + otherItems.length,
  };
}
