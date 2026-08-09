import api from "./api";

export type UploadIncidentState =
  | "failed"
  | "stuck"
  | "retrying"
  | "resolved"
  | "unknown";

export type UploadIncidentThreadType = "workout" | "sheets";

export interface UploadIncidentItem {
  id: string;
  athleteId: string | null;
  athleteName: string | null;
  athleteEmail: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  state: UploadIncidentState;
  retryable: boolean;
  failureReason: string | null;
  correlationId: string | null;
  lastCheckpointAt: string | null;
  latestActivityAt: string | null;
  videoId: string | null;
  commentId: string | null;
  messageId: string | null;
  threadType: UploadIncidentThreadType;
  groupedCount: number;
}

export interface UploadIncidentListResponse {
  total: number;
  limit: number;
  offset: number;
  items: UploadIncidentItem[];
  stateCounts: Record<UploadIncidentState, number>;
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

let resolvedEndpoint: string | null = null;
let resolvedSummaryEndpoint: string | null = null;

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
  if (normalized.includes("stuck") || normalized.includes("pending")) return "stuck";
  if (normalized.includes("retry")) return "retrying";
  if (normalized.includes("resolved") || normalized.includes("fixed")) {
    return "resolved";
  }
  return "unknown";
}

function parseThreadType(value: string | null | undefined): UploadIncidentThreadType {
  return value === "sheets" ? "sheets" : "workout";
}

function normalizeItem(raw: Record<string, unknown>, index: number): UploadIncidentItem {
  const athlete = asRecord(raw.athlete);
  const deepLink =
    asRecord(raw.deepLink) ?? asRecord(raw.deep_link) ?? asRecord(raw.link);
  const state = normalizeState(
    pickString(raw.state, raw.status, raw.uploadState, raw.upload_state),
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
    retryable: pickBoolean(raw.retryable, raw.isRetryable, raw.retry_allowed) ?? false,
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

  return {
    total: pickNumber(record?.total, rows.length) ?? rows.length,
    limit: pickNumber(record?.limit) ?? rows.length,
    offset: pickNumber(record?.offset) ?? 0,
    items,
    stateCounts: normalizeStateCounts(record, items),
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

async function fetchSummaryCounts(
  params: Record<string, unknown>,
): Promise<Record<UploadIncidentState, number> | null> {
  if (resolvedSummaryEndpoint) {
    const hit = await tryFetch(resolvedSummaryEndpoint, params);
    if (hit.ok) {
      const parsed = parseStateCounts(asRecord(hit.payload));
      if (parsed) return parsed;
    } else {
      resolvedSummaryEndpoint = null;
    }
  }

  for (const endpoint of UPLOAD_INCIDENT_SUMMARY_ENDPOINTS) {
    const result = await tryFetch(endpoint, params);
    if (!result.ok) continue;
    const parsed = parseStateCounts(asRecord(result.payload));
    if (!parsed) continue;
    resolvedSummaryEndpoint = endpoint;
    return parsed;
  }
  return null;
}

export const uploadIncidentService = {
  async list(params?: {
    state?: UploadIncidentState | "all";
    q?: string;
    retryable?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<UploadIncidentListResponse> {
    const query = {
      state: params?.state && params.state !== "all" ? params.state : undefined,
      q: params?.q,
      retryable: params?.retryable,
      limit: params?.limit ?? 100,
      offset: params?.offset ?? 0,
    };

    if (resolvedEndpoint) {
      const hit = await tryFetch(resolvedEndpoint, query);
      if (hit.ok) {
        const normalized = normalizeResponse(hit.payload);
        if (isStateCountsLikelyFallback(normalized.stateCounts, normalized.total)) {
          const summaryCounts = await fetchSummaryCounts(query);
          if (summaryCounts) {
            return {
              ...normalized,
              stateCounts: summaryCounts,
            };
          }
        }
        return normalized;
      }
      resolvedEndpoint = null;
    }

    for (const endpoint of UPLOAD_INCIDENT_ENDPOINTS) {
      const result = await tryFetch(endpoint, query);
      if (!result.ok) continue;
      resolvedEndpoint = endpoint;
      const normalized = normalizeResponse(result.payload);
      if (isStateCountsLikelyFallback(normalized.stateCounts, normalized.total)) {
        const summaryCounts = await fetchSummaryCounts(query);
        if (summaryCounts) {
          return {
            ...normalized,
            stateCounts: summaryCounts,
          };
        }
      }
      return normalized;
    }

    throw new Error("Upload incident endpoint is not available yet.");
  },
};
