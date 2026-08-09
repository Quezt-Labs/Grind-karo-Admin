import api from "./api";

export type FormCheckQueueTab =
  | "needs_reply"
  | "unread"
  | "overdue"
  | "resolved";

export type FormCheckQueueState =
  | "needs_reply"
  | "unread"
  | "overdue"
  | "replied"
  | "resolved"
  | "unknown";

export type FormCheckQueuePriority = "P0" | "P1" | "P2" | "low" | "unknown";

export type FormCheckQueueThreadType = "workout" | "sheets";

export interface FormCheckActionQueueItem {
  id: string;
  athleteId: string | null;
  athleteName: string | null;
  athleteEmail: string | null;
  videoReference: string | null;
  latestCommentPreview: string;
  latestActivityAt: string;
  priority: FormCheckQueuePriority;
  state: FormCheckQueueState;
  stateReason: string | null;
  threadType: FormCheckQueueThreadType;
  videoId: string | null;
  commentId: string | null;
  messageId: string | null;
  overdueAt: string | null;
  unreadCount: number;
  groupedCount: number;
}

export interface FormCheckActionQueueResponse {
  total: number;
  limit: number;
  offset: number;
  items: FormCheckActionQueueItem[];
  tabCounts: Record<FormCheckQueueTab, number>;
  hasChanges: boolean | null;
  isDelta: boolean;
  since: string | null;
  removedIds: string[];
}

const ACTION_QUEUE_ENDPOINTS = [
  "/admin/form-check-videos/action-queue",
  "/admin/form-check/action-queue",
  "/admin/form-checks/action-queue",
  "/coach/form-check/action-queue",
];

let resolvedEndpoint: string | null = null;

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

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickBoolean(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") return value;
  }
  return null;
}

function normalizePriority(value: string | null | undefined): FormCheckQueuePriority {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized === "p0" || normalized === "critical" || normalized === "high") {
    return "P0";
  }
  if (normalized === "p1" || normalized === "normal" || normalized === "medium") {
    return "P1";
  }
  if (normalized === "p2" || normalized === "low") return "P2";
  return "unknown";
}

function normalizeState(
  value: string | null | undefined,
  needsReply: boolean,
  unreadCount: number,
  overdueAt: string | null,
): FormCheckQueueState {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("needs_reply") || normalized.includes("need_reply")) {
    return "needs_reply";
  }
  if (normalized.includes("overdue")) return "overdue";
  if (normalized.includes("replied") || normalized.includes("responded")) {
    return "replied";
  }
  if (normalized.includes("resolved") || normalized.includes("closed")) {
    return "resolved";
  }
  if (normalized.includes("unread") || normalized.includes("new")) return "unread";
  if (needsReply) return "needs_reply";
  if (overdueAt && new Date(overdueAt).getTime() <= Date.now()) return "overdue";
  if (unreadCount > 0) return "unread";
  return "unknown";
}

function parseThreadType(value: string | null | undefined): FormCheckQueueThreadType {
  return value === "sheets" ? "sheets" : "workout";
}

function normalizeItem(
  raw: Record<string, unknown>,
  index: number,
): FormCheckActionQueueItem {
  const athlete = asRecord(raw.athlete);
  const deepLink =
    asRecord(raw.deepLink) ?? asRecord(raw.deep_link) ?? asRecord(raw.link);
  const activityAt =
    pickString(
      raw.latestActivityAt,
      raw.latest_activity_at,
      raw.lastActivityAt,
      raw.last_activity_at,
      raw.updatedAt,
      raw.updated_at,
      raw.createdAt,
      raw.created_at,
    ) ?? new Date().toISOString();
  const unreadCount =
    pickNumber(raw.unreadCount, raw.unread_count, raw.unreadReplies) ?? 0;
  const needsReply =
    pickBoolean(raw.needsReply, raw.needs_reply, raw.actionRequired) ?? false;
  const overdueAt = pickString(raw.overdueAt, raw.overdue_at, raw.dueAt, raw.due_at);
  const threadType = parseThreadType(
    pickString(raw.threadType, raw.thread_type, deepLink?.threadType, deepLink?.thread_type),
  );
  const state = normalizeState(
    pickString(raw.state, raw.status, raw.actionState, raw.action_state),
    needsReply,
    unreadCount,
    overdueAt,
  );

  const exerciseName = pickString(
    raw.exerciseName,
    raw.exercise_name,
    raw.videoReference,
    raw.video_reference,
    raw.videoTitle,
    raw.video_title,
  );
  const setNumber = pickNumber(raw.setNumber, raw.set_number);
  const videoReference =
    exerciseName != null
      ? setNumber != null
        ? `${exerciseName} · Set ${setNumber}`
        : exerciseName
      : null;

  return {
    id:
      pickString(raw.id, raw.queueId, raw.queue_id, raw.itemId, raw.item_id) ??
      `form-check-queue-${index + 1}`,
    athleteId: pickString(
      raw.athleteId,
      raw.athlete_id,
      raw.userId,
      raw.user_id,
      athlete?.id,
      deepLink?.userId,
      deepLink?.user_id,
    ),
    athleteName: pickString(
      raw.athleteName,
      raw.athlete_name,
      raw.userName,
      raw.user_name,
      athlete?.name,
    ),
    athleteEmail: pickString(
      raw.athleteEmail,
      raw.athlete_email,
      raw.userEmail,
      raw.user_email,
      athlete?.email,
    ),
    videoReference,
    latestCommentPreview:
      pickString(
        raw.latestCommentPreview,
        raw.latest_comment_preview,
        raw.latestPreview,
        raw.latest_preview,
        raw.preview,
        raw.message,
      ) ?? "Open thread to view message",
    latestActivityAt: activityAt,
    priority: normalizePriority(
      pickString(raw.priority, raw.priorityLabel, raw.priority_label),
    ),
    state,
    stateReason: pickString(
      raw.stateReason,
      raw.state_reason,
      raw.replyLockReason,
      raw.reply_lock_reason,
      raw.reason,
    ),
    threadType,
    videoId: pickString(
      raw.videoId,
      raw.video_id,
      deepLink?.videoId,
      deepLink?.video_id,
    ),
    commentId: pickString(
      raw.commentId,
      raw.comment_id,
      deepLink?.commentId,
      deepLink?.comment_id,
    ),
    messageId: pickString(
      raw.messageId,
      raw.message_id,
      deepLink?.messageId,
      deepLink?.message_id,
    ),
    overdueAt,
    unreadCount,
    groupedCount:
      pickNumber(raw.groupedCount, raw.grouped_count, raw.groupCount, raw.group_count) ??
      1,
  };
}

function normalizeTabCounts(
  source: Record<string, unknown> | null,
  items: FormCheckActionQueueItem[],
): Record<FormCheckQueueTab, number> {
  const fromPayload = asRecord(source?.tabCounts) ?? asRecord(source?.tab_counts);
  if (fromPayload) {
    return {
      needs_reply: pickNumber(fromPayload.needs_reply, fromPayload.needsReply) ?? 0,
      unread: pickNumber(fromPayload.unread) ?? 0,
      overdue: pickNumber(fromPayload.overdue) ?? 0,
      resolved:
        pickNumber(
          fromPayload.resolved,
          fromPayload.replied,
          fromPayload.resolvedOrReplied,
        ) ?? 0,
    };
  }
  const counts: Record<FormCheckQueueTab, number> = {
    needs_reply: 0,
    unread: 0,
    overdue: 0,
    resolved: 0,
  };
  for (const item of items) {
    if (item.state === "needs_reply") counts.needs_reply += 1;
    else if (item.state === "unread") counts.unread += 1;
    else if (item.state === "overdue") counts.overdue += 1;
    else if (item.state === "resolved" || item.state === "replied") {
      counts.resolved += 1;
    }
  }
  return counts;
}

function normalizeResponse(payload: unknown): FormCheckActionQueueResponse {
  const record = asRecord(payload);
  const rawItems = Array.isArray(record?.items)
    ? record.items
    : Array.isArray(payload)
      ? payload
      : [];
  const items = rawItems
    .map((entry, index) => {
      const row = asRecord(entry);
      if (!row) return null;
      return normalizeItem(row, index);
    })
    .filter((entry): entry is FormCheckActionQueueItem => entry != null);

  const hasChanges =
    pickBoolean(record?.hasChanges, record?.has_changes) ?? null;
  const isDelta =
    pickBoolean(record?.isDelta, record?.is_delta, record?.delta) ?? false;
  const removedIds = Array.isArray(record?.removedIds)
    ? (record?.removedIds as unknown[])
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map((value) => value.trim())
    : Array.isArray(record?.removed_ids)
      ? (record?.removed_ids as unknown[])
          .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
          .map((value) => value.trim())
      : [];
  const since =
    pickString(
      record?.since,
      record?.cursor,
      record?.asOf,
      record?.as_of,
      record?.snapshotAt,
      record?.snapshot_at,
      record?.latestActivityAt,
      record?.latest_activity_at,
    ) ??
    items.reduce<string | null>((latest, item) => {
      if (!item.latestActivityAt) return latest;
      if (!latest) return item.latestActivityAt;
      return new Date(item.latestActivityAt).getTime() > new Date(latest).getTime()
        ? item.latestActivityAt
        : latest;
    }, null);

  return {
    total: pickNumber(record?.total, rawItems.length) ?? rawItems.length,
    limit: pickNumber(record?.limit) ?? rawItems.length,
    offset: pickNumber(record?.offset) ?? 0,
    items,
    tabCounts: normalizeTabCounts(record, items),
    hasChanges,
    isDelta,
    since,
    removedIds,
  };
}

async function tryFetch(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; payload: unknown } | { ok: false }> {
  const response = await api.get(endpoint, {
    params,
    validateStatus: (status) =>
      (status >= 200 && status < 300) || status === 404 || status === 405,
  });
  if (response.status >= 200 && response.status < 300) {
    return { ok: true, payload: response.data?.data ?? response.data };
  }
  return { ok: false };
}

export const formCheckActionQueueService = {
  async list(params?: {
    tab?: FormCheckQueueTab;
    q?: string;
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<FormCheckActionQueueResponse> {
    const query = {
      tab: params?.tab,
      q: params?.q,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
      since: params?.since,
    };

    if (resolvedEndpoint) {
      const hit = await tryFetch(resolvedEndpoint, query);
      if (hit.ok) return normalizeResponse(hit.payload);
      resolvedEndpoint = null;
    }

    for (const endpoint of ACTION_QUEUE_ENDPOINTS) {
      const result = await tryFetch(endpoint, query);
      if (!result.ok) continue;
      resolvedEndpoint = endpoint;
      return normalizeResponse(result.payload);
    }

    throw new Error("Form check action queue endpoint is not available yet.");
  },
};
