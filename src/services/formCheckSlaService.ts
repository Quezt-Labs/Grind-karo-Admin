import api from "./api";

export type FormCheckSlaWindow = "24h" | "7d" | "30d";

export interface FormCheckSlaPercentiles {
  p50Minutes: number | null;
  p90Minutes: number | null;
  p95Minutes: number | null;
  p99Minutes: number | null;
}

export interface FormCheckSlaOverdue {
  count: number;
  ratePercent: number | null;
}

export interface FormCheckSlaBacklog {
  needsReplyCount: number;
  unreadCount: number;
  overdueCount: number;
}

export interface FormCheckSlaAssistantLoad {
  assistantCoachId: string | null;
  assistantCoachName: string;
  assignedAthletes: number;
  needsReplyCount: number;
  overdueCount: number;
  loadSharePercent: number | null;
}

export interface FormCheckSlaMetrics {
  window: FormCheckSlaWindow;
  refreshedAt: string | null;
  percentiles: FormCheckSlaPercentiles;
  overdue: FormCheckSlaOverdue;
  backlog: FormCheckSlaBacklog;
  assistantLoadSplit: FormCheckSlaAssistantLoad[];
}

const SLA_ENDPOINTS = [
  "/admin/form-check/sla",
  "/admin/form-check/sla/metrics",
  "/admin/form-checks/sla",
  "/coach/form-check/sla",
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

function normalizeWindow(value: string | null | undefined): FormCheckSlaWindow {
  if (value === "24h" || value === "7d" || value === "30d") return value;
  return "7d";
}

function normalizeAssistantLoad(
  value: unknown,
): FormCheckSlaAssistantLoad[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const row = asRecord(entry);
      if (!row) return null;
      return {
        assistantCoachId: pickString(
          row.assistantCoachId,
          row.assistant_coach_id,
          row.coachId,
          row.coach_id,
          row.id,
        ),
        assistantCoachName:
          pickString(
            row.assistantCoachName,
            row.assistant_coach_name,
            row.coachName,
            row.coach_name,
            row.name,
            row.email,
          ) ?? "Unassigned / Admin",
        assignedAthletes:
          pickNumber(
            row.assignedAthletes,
            row.assigned_athletes,
            row.athleteCount,
            row.athlete_count,
          ) ?? 0,
        needsReplyCount:
          pickNumber(
            row.needsReplyCount,
            row.needs_reply_count,
            row.backlogNeedsReply,
          ) ?? 0,
        overdueCount:
          pickNumber(row.overdueCount, row.overdue_count, row.backlogOverdue) ?? 0,
        loadSharePercent:
          pickNumber(row.loadSharePercent, row.load_share_percent, row.sharePct),
      };
    })
    .filter((entry): entry is FormCheckSlaAssistantLoad => entry != null);
}

function normalizeMetrics(
  payload: unknown,
  requestedWindow: FormCheckSlaWindow,
): FormCheckSlaMetrics {
  const root = asRecord(payload);
  const percentiles = asRecord(root?.responseTimePercentiles) ?? asRecord(root?.percentiles);
  const overdue = asRecord(root?.overdue);
  const backlog = asRecord(root?.backlog) ?? asRecord(root?.needsReplyBacklog);
  const assistantLoadSource =
    root?.assistantLoadSplit ??
    root?.assistant_load_split ??
    root?.assistantLoads ??
    root?.assistant_loads ??
    [];

  return {
    window: normalizeWindow(
      pickString(root?.window, root?.timeWindow, root?.time_window) ??
        requestedWindow,
    ),
    refreshedAt: pickString(root?.refreshedAt, root?.refreshed_at, root?.updatedAt, root?.updated_at),
    percentiles: {
      p50Minutes:
        pickNumber(
          percentiles?.p50Minutes,
          percentiles?.p50_minutes,
          percentiles?.p50,
        ),
      p90Minutes:
        pickNumber(
          percentiles?.p90Minutes,
          percentiles?.p90_minutes,
          percentiles?.p90,
        ),
      p95Minutes:
        pickNumber(
          percentiles?.p95Minutes,
          percentiles?.p95_minutes,
          percentiles?.p95,
        ),
      p99Minutes:
        pickNumber(
          percentiles?.p99Minutes,
          percentiles?.p99_minutes,
          percentiles?.p99,
        ),
    },
    overdue: {
      count: pickNumber(overdue?.count, root?.overdueCount, root?.overdue_count) ?? 0,
      ratePercent: pickNumber(
        overdue?.ratePercent,
        overdue?.rate_percent,
        root?.overdueRatePercent,
        root?.overdue_rate_percent,
      ),
    },
    backlog: {
      needsReplyCount:
        pickNumber(
          backlog?.needsReplyCount,
          backlog?.needs_reply_count,
          root?.needsReplyCount,
          root?.needs_reply_count,
        ) ?? 0,
      unreadCount:
        pickNumber(
          backlog?.unreadCount,
          backlog?.unread_count,
          root?.unreadCount,
          root?.unread_count,
        ) ?? 0,
      overdueCount:
        pickNumber(
          backlog?.overdueCount,
          backlog?.overdue_count,
          root?.overdueBacklogCount,
          root?.overdue_backlog_count,
        ) ?? 0,
    },
    assistantLoadSplit: normalizeAssistantLoad(assistantLoadSource),
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

export const formCheckSlaService = {
  async getMetrics(params?: {
    window?: FormCheckSlaWindow;
  }): Promise<FormCheckSlaMetrics> {
    const selectedWindow = params?.window ?? "7d";
    const query = {
      window: selectedWindow,
    };

    if (resolvedEndpoint) {
      const hit = await tryFetch(resolvedEndpoint, query);
      if (hit.ok) return normalizeMetrics(hit.payload, selectedWindow);
      resolvedEndpoint = null;
    }

    for (const endpoint of SLA_ENDPOINTS) {
      const result = await tryFetch(endpoint, query);
      if (!result.ok) continue;
      resolvedEndpoint = endpoint;
      return normalizeMetrics(result.payload, selectedWindow);
    }

    throw new Error("Form-check SLA endpoint is not available yet.");
  },
};
