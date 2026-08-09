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
  "/admin/form-check-videos/sla-metrics",
  "/admin/form-check/sla",
  "/admin/form-check/sla/metrics",
  "/admin/form-checks/sla",
  "/coach/form-check/sla",
];

let resolvedEndpoint: string | null = null;

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

function normalizeWindow(value: string | null | undefined): FormCheckSlaWindow {
  if (value === "24h" || value === "7d" || value === "30d") return value;
  return "7d";
}

function windowToDays(window: FormCheckSlaWindow): number {
  if (window === "24h") return 1;
  if (window === "30d") return 30;
  return 7;
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
): Promise<
  | { ok: true; payload: unknown }
  | { ok: false; status: number | null }
> {
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

export const formCheckSlaService = {
  async getMetrics(params?: {
    window?: FormCheckSlaWindow;
  }): Promise<FormCheckSlaMetrics> {
    const selectedWindow = params?.window ?? "24h";
    const query = {
      source: "program",
      windowDays: windowToDays(selectedWindow),
      window: selectedWindow,
    };
    let lastStatus: number | null = null;
    let seenBusy = false;

    if (resolvedEndpoint) {
      const hit = await tryFetch(resolvedEndpoint, query);
      if (hit.ok) return normalizeMetrics(hit.payload, selectedWindow);
      lastStatus = hit.status;
      seenBusy = seenBusy || isBusyStatus(hit.status);
      resolvedEndpoint = null;
    }

    for (const endpoint of SLA_ENDPOINTS) {
      const result = await tryFetch(endpoint, query);
      if (!result.ok) {
        lastStatus = result.status;
        seenBusy = seenBusy || isBusyStatus(result.status);
        continue;
      }
      resolvedEndpoint = endpoint;
      return normalizeMetrics(result.payload, selectedWindow);
    }

    const error = new Error(
      seenBusy
        ? "SLA server busy, retrying automatically."
        : "Form-check SLA endpoint is not available yet.",
    ) as Error & { status?: number | null; busy?: boolean };
    error.status = lastStatus;
    error.busy = seenBusy;
    throw error;
  },
};
