import api from "./api";

export type UploadIncidentState =
  | "failed"
  | "stuck"
  | "retrying"
  | "resolved"
  | "unknown";

export type UploadIncidentSeverity = "hard_failed" | "transient" | "unknown";

export type UploadIncidentThreadType = "workout" | "sheets";

export interface UploadIncidentItem {
  id: string;
  athleteId: string | null;
  athleteName: string | null;
  athleteEmail: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  state: UploadIncidentState;
  severity: UploadIncidentSeverity;
  retryable: boolean;
  attempts: number | null;
  pipelineStage: string | null;
  failureReason: string | null;
  correlationId: string | null;
  uploadSessionId: string | null;
  firstFailedAt: string | null;
  lastRetryAt: string | null;
  nextRetryAt: string | null;
  stuckDurationSeconds: number | null;
  lastCheckpointAt: string | null;
  latestActivityAt: string | null;
  videoId: string | null;
  commentId: string | null;
  messageId: string | null;
  threadType: UploadIncidentThreadType;
  queueBlocked: boolean | null;
  queueHint: string | null;
  groupedCount: number;
}

export interface UploadIncidentListResponse {
  total: number;
  limit: number;
  offset: number;
  items: UploadIncidentItem[];
  stateCounts: Record<UploadIncidentState, number>;
  hasChanges: boolean | null;
  isDelta: boolean;
  since: string | null;
  nextCursor: string | null;
  hasMore: boolean | null;
  removedIds: string[];
}

export interface UploadIncidentBulkActionResult {
  processedCount: number;
  accepted: boolean;
}

const UPLOAD_INCIDENT_ENDPOINTS = [
  "/admin/upload-incidents",
  "/admin/upload/incidents",
  "/admin/uploads/incidents",
  "/coach/upload/incidents",
];

const UPLOAD_INCIDENT_SUMMARY_ENDPOINTS = [
  "/admin/upload-incidents/summary",
  "/admin/upload/incidents/summary",
  "/admin/uploads/incidents/summary",
  "/coach/upload/incidents/summary",
];

const BULK_RETRY_ENDPOINTS = [
  "/admin/upload-incidents/retry",
  "/admin/upload-incidents/bulk-retry",
  "/admin/upload/incidents/retry",
];

const BULK_ACK_ENDPOINTS = [
  "/admin/upload-incidents/acknowledge",
  "/admin/upload-incidents/bulk-acknowledge",
  "/admin/upload/incidents/acknowledge",
];

const BULK_ESCALATE_ENDPOINTS = [
  "/admin/upload-incidents/escalate",
  "/admin/upload-incidents/bulk-escalate",
  "/admin/upload/incidents/escalate",
];

let resolvedEndpoint: string | null = null;
let resolvedSummaryEndpoint: string | null = null;

function isBusyStatus(status: number | null): boolean {
  return status == null || status === 408 || status === 429 || status >= 500;
}

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

function normalizeState(value: string | null | undefined): UploadIncidentState {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("failed") || normalized.includes("error")) return "failed";
  if (
    normalized.includes("stuck") ||
    normalized.includes("timeout") ||
    normalized.includes("timed_out")
  ) {
    return "stuck";
  }
  if (
    normalized.includes("retry") ||
    normalized.includes("pending") ||
    normalized.includes("processing")
  ) {
    return "retrying";
  }
  if (normalized.includes("resolved") || normalized.includes("fixed")) {
    return "resolved";
  }
  return "unknown";
}

function parseThreadType(value: string | null | undefined): UploadIncidentThreadType {
  return value === "sheets" ? "sheets" : "workout";
}

function normalizeSeverity(
  rawSeverity: string | null | undefined,
  state: UploadIncidentState,
  retryable: boolean,
): UploadIncidentSeverity {
  const normalized = (rawSeverity ?? "").trim().toLowerCase();
  if (normalized.includes("hard")) return "hard_failed";
  if (normalized.includes("transient")) return "transient";
  if (state === "retrying") return "transient";
  if (state === "failed") return retryable ? "transient" : "hard_failed";
  if (state === "stuck") return retryable ? "transient" : "hard_failed";
  return "unknown";
}

function normalizeItem(raw: Record<string, unknown>, index: number): UploadIncidentItem {
  const athlete = asRecord(raw.athlete);
  const deepLink =
    asRecord(raw.deepLink) ?? asRecord(raw.deep_link) ?? asRecord(raw.link);
  const state = normalizeState(
    pickString(raw.state, raw.status, raw.uploadState, raw.upload_state),
  );
  const retryable = pickBoolean(raw.retryable, raw.isRetryable, raw.retry_allowed) ?? false;
  const severity = normalizeSeverity(
    pickString(raw.severity, raw.incidentSeverity, raw.incident_severity),
    state,
    retryable,
  );

  return {
    id:
      pickString(raw.id, raw.incidentId, raw.incident_id) ??
      `upload-incident-${index + 1}`,
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
    fileName: pickString(raw.fileName, raw.file_name, raw.filename, raw.name),
    sizeBytes: pickNumber(raw.sizeBytes, raw.size_bytes, raw.fileSize, raw.file_size),
    state,
    severity,
    retryable,
    attempts: pickNumber(
      raw.attempts,
      raw.retryAttempts,
      raw.retry_attempts,
      raw.attempt_count,
    ),
    pipelineStage: pickString(
      raw.pipelineStage,
      raw.pipeline_stage,
      raw.stage,
      raw.step,
    ),
    failureReason: pickString(
      raw.failureReason,
      raw.failure_reason,
      raw.reason,
      raw.error,
      raw.message,
    ),
    correlationId: pickString(
      raw.correlationId,
      raw.correlation_id,
      raw.traceId,
      raw.trace_id,
    ),
    uploadSessionId: pickString(
      raw.uploadSessionId,
      raw.upload_session_id,
      raw.sessionId,
      raw.session_id,
    ),
    firstFailedAt: pickString(
      raw.firstFailedAt,
      raw.first_failed_at,
      raw.firstSeenAt,
      raw.first_seen_at,
      raw.createdAt,
      raw.created_at,
    ),
    lastRetryAt: pickString(raw.lastRetryAt, raw.last_retry_at),
    nextRetryAt: pickString(raw.nextRetryAt, raw.next_retry_at),
    stuckDurationSeconds: pickNumber(
      raw.stuckDurationSeconds,
      raw.stuck_duration_seconds,
      raw.ageSeconds,
      raw.age_seconds,
    ),
    lastCheckpointAt: pickString(
      raw.lastCheckpointAt,
      raw.last_checkpoint_at,
      raw.checkpointAt,
      raw.checkpoint_at,
    ),
    latestActivityAt: pickString(
      raw.latestActivityAt,
      raw.latest_activity_at,
      raw.updatedAt,
      raw.updated_at,
      raw.createdAt,
      raw.created_at,
    ),
    videoId: pickString(raw.videoId, raw.video_id, deepLink?.videoId, deepLink?.video_id),
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
    threadType: parseThreadType(
      pickString(raw.threadType, raw.thread_type, deepLink?.threadType, deepLink?.thread_type),
    ),
    queueBlocked: pickBoolean(
      raw.queueBlocked,
      raw.queue_blocked,
      raw.blockedQueue,
      raw.blocked_queue,
      raw.blockedByUploadIncident,
      raw.blocked_by_upload_incident,
    ),
    queueHint: pickString(raw.queueHint, raw.queue_hint, raw.blockReason, raw.block_reason),
    groupedCount:
      pickNumber(raw.groupedCount, raw.grouped_count, raw.groupCount, raw.group_count) ??
      1,
  };
}

function normalizeStateCounts(
  payload: Record<string, unknown> | null,
  items: UploadIncidentItem[],
): Record<UploadIncidentState, number> {
  const raw = asRecord(payload?.stateCounts) ?? asRecord(payload?.state_counts);
  if (raw) {
    return {
      failed: pickNumber(raw.failed) ?? 0,
      stuck: pickNumber(raw.stuck) ?? 0,
      retrying: pickNumber(raw.retrying, raw.retry) ?? 0,
      resolved: pickNumber(raw.resolved) ?? 0,
      unknown: pickNumber(raw.unknown) ?? 0,
    };
  }
  const counts: Record<UploadIncidentState, number> = {
    failed: 0,
    stuck: 0,
    retrying: 0,
    resolved: 0,
    unknown: 0,
  };
  for (const item of items) {
    counts[item.state] += 1;
  }
  return counts;
}

function parseStateCounts(
  payload: Record<string, unknown> | null,
): Record<UploadIncidentState, number> | null {
  const raw =
    asRecord(payload?.stateCounts) ??
    asRecord(payload?.state_counts) ??
    payload;
  if (!raw) return null;
  return {
    failed: pickNumber(raw.failed) ?? 0,
    stuck: pickNumber(raw.stuck) ?? 0,
    retrying: pickNumber(raw.retrying, raw.retry) ?? 0,
    resolved: pickNumber(raw.resolved) ?? 0,
    unknown: pickNumber(raw.unknown) ?? 0,
  };
}

function isStateCountsLikelyFallback(
  counts: Record<UploadIncidentState, number>,
  total: number,
): boolean {
  const sum =
    counts.failed +
    counts.stuck +
    counts.retrying +
    counts.resolved +
    counts.unknown;
  return total > 0 && sum === 0;
}

function normalizeResponse(payload: unknown): UploadIncidentListResponse {
  const record = asRecord(payload);
  const rows = Array.isArray(record?.items)
    ? record.items
    : Array.isArray(payload)
      ? payload
      : [];
  const items = rows
    .map((entry, index) => {
      const row = asRecord(entry);
      if (!row) return null;
      return normalizeItem(row, index);
    })
    .filter((entry): entry is UploadIncidentItem => entry != null);

  const hasChanges =
    pickBoolean(record?.hasChanges, record?.has_changes) ?? null;
  const isDelta =
    pickBoolean(record?.isDelta, record?.is_delta, record?.delta) ?? false;
  const hasMore = pickBoolean(record?.hasMore, record?.has_more, record?.more);
  const nextCursor = pickString(
    record?.nextCursor,
    record?.next_cursor,
    record?.cursor,
  );
  const removedIds = Array.isArray(record?.removedIds)
    ? (record.removedIds as unknown[])
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .map((value) => value.trim())
    : Array.isArray(record?.removed_ids)
      ? (record.removed_ids as unknown[])
          .filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          )
          .map((value) => value.trim())
      : [];
  const since =
    pickString(
      record?.since,
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
    total: pickNumber(record?.total, rows.length) ?? rows.length,
    limit: pickNumber(record?.limit) ?? rows.length,
    offset: pickNumber(record?.offset) ?? 0,
    items,
    stateCounts: normalizeStateCounts(record, items),
    hasChanges,
    isDelta,
    since,
    nextCursor,
    hasMore,
    removedIds,
  };
}

async function tryFetch(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; payload: unknown } | { ok: false; status: number | null }> {
  try {
    const response = await api.get(endpoint, {
      params,
      validateStatus: (status) =>
        (status >= 200 && status < 300) ||
        status === 400 ||
        status === 404 ||
        status === 405 ||
        status === 408 ||
        status === 422 ||
        status === 429 ||
        status >= 500,
    });
    if (response.status >= 200 && response.status < 300) {
      return { ok: true, payload: response.data?.data ?? response.data };
    }
    return { ok: false, status: response.status };
  } catch (error) {
    const status =
      typeof error === "object" &&
      error != null &&
      "response" in error &&
      typeof (error as { response?: { status?: unknown } }).response?.status ===
        "number"
        ? ((error as { response?: { status?: number } }).response?.status ?? null)
        : null;
    return { ok: false, status };
  }
}

function stripCursor(params: Record<string, unknown>): Record<string, unknown> {
  const { cursor: _cursor, ...rest } = params;
  return rest;
}

async function tryFetchWithCursorFallback(
  endpoint: string,
  params: Record<string, unknown>,
): Promise<{ ok: true; payload: unknown } | { ok: false; status: number | null }> {
  const first = await tryFetch(endpoint, params);
  if (first.ok) return first;
  if (
    (first.status === 400 || first.status === 422) &&
    typeof params.cursor === "string" &&
    params.cursor.trim().length > 0
  ) {
    return tryFetch(endpoint, stripCursor(params));
  }
  return first;
}

async function fetchSummaryCounts(
  params: Record<string, unknown>,
): Promise<Record<UploadIncidentState, number> | null> {
  if (resolvedSummaryEndpoint) {
    const hit = await tryFetchWithCursorFallback(resolvedSummaryEndpoint, params);
    if (hit.ok) {
      const parsed = parseStateCounts(asRecord(hit.payload));
      if (parsed) return parsed;
    } else {
      resolvedSummaryEndpoint = null;
    }
  }

  for (const endpoint of UPLOAD_INCIDENT_SUMMARY_ENDPOINTS) {
    const result = await tryFetchWithCursorFallback(endpoint, params);
    if (!result.ok) continue;
    const parsed = parseStateCounts(asRecord(result.payload));
    if (!parsed) continue;
    resolvedSummaryEndpoint = endpoint;
    return parsed;
  }
  return null;
}

async function runBulkAction(
  endpoints: string[],
  incidentIds: string[],
): Promise<UploadIncidentBulkActionResult> {
  let lastStatus: number | null = null;
  let seenBusy = false;

  for (const endpoint of endpoints) {
    const response = await api.post(
      endpoint,
      {
        incidentIds,
        ids: incidentIds,
      },
      {
        validateStatus: (status) =>
          (status >= 200 && status < 300) ||
          status === 400 ||
          status === 404 ||
          status === 405 ||
          status === 408 ||
          status === 422 ||
          status === 429 ||
          status >= 500,
      },
    );
    if (response.status >= 200 && response.status < 300) {
      const payload = asRecord(response.data?.data ?? response.data);
      return {
        processedCount:
          pickNumber(
            payload?.processedCount,
            payload?.processed_count,
            payload?.acceptedCount,
            payload?.accepted_count,
          ) ?? incidentIds.length,
        accepted: true,
      };
    }
    lastStatus = response.status;
    seenBusy = seenBusy || isBusyStatus(response.status);
  }

  const error = new Error(
    seenBusy
      ? "Bulk action server busy. Please retry in a moment."
      : "Bulk action endpoint is not available yet.",
  ) as Error & { code?: string; status?: number | null; busy?: boolean };
  error.code = seenBusy ? "BULK_ACTION_BUSY" : "BULK_ACTION_UNAVAILABLE";
  error.status = lastStatus;
  error.busy = seenBusy;
  throw error;
}

export const uploadIncidentService = {
  async list(params?: {
    state?: UploadIncidentState | "all";
    q?: string;
    retryable?: boolean;
    limit?: number;
    offset?: number;
    since?: string;
    cursor?: string;
  }): Promise<UploadIncidentListResponse> {
    const query = {
      state: params?.state && params.state !== "all" ? params.state : undefined,
      q: params?.q,
      retryable: params?.retryable,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
      since: params?.since,
      cursor: params?.cursor,
    };
    const summaryQuery = {
      state: query.state,
      q: query.q,
      retryable: query.retryable,
      limit: query.limit,
      offset: query.offset,
      since: query.since,
    };
    let lastStatus: number | null = null;
    let seenBusy = false;

    if (resolvedEndpoint) {
      const hit = await tryFetchWithCursorFallback(resolvedEndpoint, query);
      if (hit.ok) {
        const normalized = normalizeResponse(hit.payload);
        if (isStateCountsLikelyFallback(normalized.stateCounts, normalized.total)) {
          const summaryCounts = await fetchSummaryCounts(summaryQuery);
          if (summaryCounts) {
            return {
              ...normalized,
              stateCounts: summaryCounts,
            };
          }
        }
        return normalized;
      }
      lastStatus = hit.status;
      seenBusy = seenBusy || isBusyStatus(hit.status);
      resolvedEndpoint = null;
    }

    for (const endpoint of UPLOAD_INCIDENT_ENDPOINTS) {
      const result = await tryFetchWithCursorFallback(endpoint, query);
      if (!result.ok) {
        lastStatus = result.status;
        seenBusy = seenBusy || isBusyStatus(result.status);
        continue;
      }
      resolvedEndpoint = endpoint;
      const normalized = normalizeResponse(result.payload);
      if (isStateCountsLikelyFallback(normalized.stateCounts, normalized.total)) {
        const summaryCounts = await fetchSummaryCounts(summaryQuery);
        if (summaryCounts) {
          return {
            ...normalized,
            stateCounts: summaryCounts,
          };
        }
      }
      return normalized;
    }

    const error = new Error(
      seenBusy
        ? "Upload incident server busy, retrying automatically."
        : "Upload incident endpoint is not available yet.",
    ) as Error & { status?: number | null; busy?: boolean };
    error.status = lastStatus;
    error.busy = seenBusy;
    throw error;
  },

  async bulkRetry(incidentIds: string[]): Promise<UploadIncidentBulkActionResult> {
    return runBulkAction(BULK_RETRY_ENDPOINTS, incidentIds);
  },

  async bulkAcknowledge(
    incidentIds: string[],
  ): Promise<UploadIncidentBulkActionResult> {
    return runBulkAction(BULK_ACK_ENDPOINTS, incidentIds);
  },

  async bulkEscalate(
    incidentIds: string[],
  ): Promise<UploadIncidentBulkActionResult> {
    return runBulkAction(BULK_ESCALATE_ENDPOINTS, incidentIds);
  },
};
