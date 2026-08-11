import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Copy, ExternalLink, RefreshCw, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { useIsAdmin } from "@/hooks/useRole";
import {
  uploadIncidentService,
  type UploadIncidentItem,
  type UploadIncidentListResponse,
  type UploadIncidentSeverity,
  type UploadIncidentState,
} from "@/services/uploadIncidentService";
import {
  incidentAgeSeconds,
  isUploadIncidentBusyError,
  nextUploadIncidentPollInterval,
  uploadIncidentRefetchInterval,
} from "@/utils/uploadIncidentMonitor";
import { buildFormCheckThreadRoute } from "@/utils/formCheckRoutes";

const BASE_POLL_MS = 20_000;

const STATE_FILTERS: Array<{ key: UploadIncidentState | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "failed", label: "Failed" },
  { key: "stuck", label: "Stuck" },
  { key: "retrying", label: "Retrying" },
  { key: "resolved", label: "Resolved" },
];

type ViewMode = "table" | "cards";
type BulkActionKind = "retry" | "acknowledge" | "escalate";

function formatBytes(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatAbsoluteTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMinutes = minutes % 60;
  if (hours < 24) return remainMinutes > 0 ? `${hours}h ${remainMinutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}d ${remainHours}h` : `${days}d`;
}

function stateLabel(state: UploadIncidentState): string {
  switch (state) {
    case "failed":
      return "Failed";
    case "stuck":
      return "Stuck";
    case "retrying":
      return "Retrying";
    case "resolved":
      return "Resolved";
    default:
      return "Unknown";
  }
}

function stateTone(state: UploadIncidentState): string {
  switch (state) {
    case "failed":
      return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
    case "stuck":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "retrying":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "resolved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
  }
}

function severityLabel(value: UploadIncidentSeverity): string {
  if (value === "hard_failed") return "Hard failed";
  if (value === "transient") return "Transient";
  return "Unknown";
}

function severityTone(value: UploadIncidentSeverity): string {
  if (value === "hard_failed") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  }
  if (value === "transient") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
  }
  return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200";
}

function actionRank(state: UploadIncidentState): number {
  if (state === "failed") return 0;
  if (state === "stuck") return 1;
  if (state === "retrying") return 2;
  if (state === "unknown") return 3;
  return 4;
}

function sortIncidents(items: UploadIncidentItem[]) {
  const copy = [...items];
  copy.sort((a, b) => {
    const byRank = actionRank(a.state) - actionRank(b.state);
    if (byRank !== 0) return byRank;
    const aAge = incidentAgeSeconds(a) ?? -1;
    const bAge = incidentAgeSeconds(b) ?? -1;
    if (actionRank(a.state) < 4) return bAge - aAge;
    const aAt = new Date(a.latestActivityAt ?? a.lastCheckpointAt ?? 0).getTime();
    const bAt = new Date(b.latestActivityAt ?? b.lastCheckpointAt ?? 0).getTime();
    return bAt - aAt;
  });
  return copy;
}

function formCheckContextLink(item: UploadIncidentItem): string {
  return buildFormCheckThreadRoute({
    userId: item.athleteId,
    videoId: item.videoId,
    commentId: item.commentId,
    messageId: item.messageId,
    threadType: item.threadType,
  });
}

function queueImpactLabel(item: UploadIncidentItem): string {
  if (item.queueBlocked === true) return "Queue blocked";
  if (item.queueBlocked === false) return "No queue impact";
  return "Queue signal pending";
}

function queueImpactTone(item: UploadIncidentItem): string {
  if (item.queueBlocked === true) {
    return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200";
  }
  if (item.queueBlocked === false) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
}

function mergeDelta(
  previous: UploadIncidentListResponse,
  delta: UploadIncidentListResponse,
): UploadIncidentListResponse {
  const removed = new Set(delta.removedIds);
  const map = new Map(previous.items.map((item) => [item.id, item]));
  for (const id of removed) map.delete(id);
  for (const item of delta.items) map.set(item.id, item);
  const items = Array.from(map.values());
  const deltaCountsTotal =
    delta.stateCounts.failed +
    delta.stateCounts.stuck +
    delta.stateCounts.retrying +
    delta.stateCounts.resolved +
    delta.stateCounts.unknown;
  return {
    ...previous,
    ...delta,
    items,
    total: delta.total || items.length,
    stateCounts: deltaCountsTotal > 0 ? delta.stateCounts : previous.stateCounts,
  };
}

function buildTriageBundle(
  item: UploadIncidentItem,
  isAdmin: boolean,
  formCheckLink: string,
): string {
  const athleteContext = item.athleteId
    ? isAdmin
      ? `/users/${item.athleteId}`
      : `/coach/athletes/${item.athleteId}`
    : "N/A";
  return [
    `incidentId=${item.id}`,
    `state=${item.state}`,
    `severity=${item.severity}`,
    `retryable=${item.retryable}`,
    `attempts=${item.attempts ?? "N/A"}`,
    `pipelineStage=${item.pipelineStage ?? "N/A"}`,
    `correlationId=${item.correlationId ?? "N/A"}`,
    `uploadSessionId=${item.uploadSessionId ?? "N/A"}`,
    `athleteId=${item.athleteId ?? "N/A"}`,
    `athleteName=${item.athleteName ?? "N/A"}`,
    `athleteEmail=${item.athleteEmail ?? "N/A"}`,
    `fileName=${item.fileName ?? "N/A"}`,
    `sizeBytes=${item.sizeBytes ?? "N/A"}`,
    `firstFailedAt=${item.firstFailedAt ?? "N/A"}`,
    `lastCheckpointAt=${item.lastCheckpointAt ?? "N/A"}`,
    `latestActivityAt=${item.latestActivityAt ?? "N/A"}`,
    `lastRetryAt=${item.lastRetryAt ?? "N/A"}`,
    `nextRetryAt=${item.nextRetryAt ?? "N/A"}`,
    `threadType=${item.threadType}`,
    `videoId=${item.videoId ?? "N/A"}`,
    `commentId=${item.commentId ?? "N/A"}`,
    `messageId=${item.messageId ?? "N/A"}`,
    `queueImpact=${queueImpactLabel(item)}`,
    `queueHint=${item.queueHint ?? "N/A"}`,
    `athleteContext=${athleteContext}`,
    `formCheckContext=${formCheckLink}`,
  ].join("\n");
}

function isBulkUnsupported(error: unknown): boolean {
  if (typeof error === "object" && error != null) {
    return (error as { code?: unknown }).code === "BULK_ACTION_UNAVAILABLE";
  }
  return false;
}

export function UploadIncidentMonitorPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [state, setState] = useState<UploadIncidentState | "all">("all");
  const [search, setSearch] = useState("");
  const [retryableOnly, setRetryableOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [pollMs, setPollMs] = useState(BASE_POLL_MS);
  const [busyRetrying, setBusyRetrying] = useState(false);
  const busyFailuresRef = useRef(0);
  const sinceCursorRef = useRef<string | null>(null);
  const incidentCursorRef = useRef<string | null>(null);
  const incidentPollingPaused = Object.values(selectedIds).some(Boolean);

  function advanceSince(candidate: string | null | undefined) {
    if (!candidate) return;
    if (!sinceCursorRef.current) {
      sinceCursorRef.current = candidate;
      return;
    }
    if (new Date(candidate).getTime() > new Date(sinceCursorRef.current).getTime()) {
      sinceCursorRef.current = candidate;
    }
  }

  function advanceIncidentCursor(response: UploadIncidentListResponse) {
    if (response.hasMore === false) {
      incidentCursorRef.current = null;
      return;
    }
    if (response.nextCursor && response.nextCursor.trim().length > 0) {
      incidentCursorRef.current = response.nextCursor;
      return;
    }
    if (response.hasMore == null) {
      incidentCursorRef.current = null;
    }
  }

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["upload-incidents", state, retryableOnly, search],
    queryFn: async () => {
      const queryKey = ["upload-incidents", state, retryableOnly, search] as const;
      try {
        const previous = queryClient.getQueryData<UploadIncidentListResponse>(queryKey);
        const hasPrevious = !!previous;
        const activeCursor = incidentCursorRef.current;
        let polled: UploadIncidentListResponse;

        if (hasPrevious && activeCursor) {
          polled = await uploadIncidentService.list({
            state,
            retryable: retryableOnly ? true : undefined,
            q: search || undefined,
            limit: 100,
            since: sinceCursorRef.current ?? undefined,
            cursor: activeCursor,
          });
        } else if (hasPrevious && sinceCursorRef.current) {
          const gate = await uploadIncidentService.list({
            state,
            retryable: retryableOnly ? true : undefined,
            q: search || undefined,
            limit: 1,
            since: sinceCursorRef.current,
          });
          advanceSince(gate.since);
          advanceIncidentCursor(gate);
          if (gate.hasChanges === false) {
            return {
              ...previous,
              since: gate.since ?? previous.since,
              hasChanges: false,
              hasMore: gate.hasMore ?? previous.hasMore,
              nextCursor: gate.nextCursor ?? previous.nextCursor,
            };
          }
          if (gate.nextCursor && gate.hasMore !== false) {
            polled = gate;
          } else {
            polled = await uploadIncidentService.list({
              state,
              retryable: retryableOnly ? true : undefined,
              q: search || undefined,
              limit: 100,
              since: sinceCursorRef.current ?? undefined,
            });
          }
        } else {
          polled = await uploadIncidentService.list({
            state,
            retryable: retryableOnly ? true : undefined,
            q: search || undefined,
            limit: 100,
            since: sinceCursorRef.current ?? undefined,
          });
        }

        advanceSince(polled.since);
        advanceIncidentCursor(polled);

        let response: UploadIncidentListResponse;
        if (polled.hasChanges === false && previous) {
          response = {
            ...previous,
            since: polled.since ?? previous.since,
            hasChanges: false,
            hasMore: polled.hasMore ?? previous.hasMore,
            nextCursor: polled.nextCursor ?? previous.nextCursor,
          };
        } else if (
          previous &&
          (polled.isDelta ||
            activeCursor != null ||
            polled.nextCursor != null ||
            polled.hasMore === true)
        ) {
          response = mergeDelta(previous, polled);
        } else {
          response = polled;
        }

        busyFailuresRef.current = 0;
        setBusyRetrying(false);
        setPollMs(BASE_POLL_MS);
        return response;
      } catch (queryError) {
        if (isUploadIncidentBusyError(queryError)) {
          busyFailuresRef.current += 1;
          setBusyRetrying(true);
          setPollMs(
            nextUploadIncidentPollInterval(BASE_POLL_MS, busyFailuresRef.current),
          );
        } else {
          busyFailuresRef.current = 0;
          setBusyRetrying(false);
          setPollMs(BASE_POLL_MS);
        }
        throw queryError;
      }
    },
    staleTime: 5_000,
    retry: false,
    refetchInterval: () =>
      uploadIncidentRefetchInterval(
        pollMs,
        typeof document !== "undefined" ? document.visibilityState : null,
        incidentPollingPaused,
      ),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const bulkActionMutation = useMutation({
    mutationFn: async (payload: { kind: BulkActionKind; ids: string[] }) => {
      if (payload.kind === "retry") {
        return uploadIncidentService.bulkRetry(payload.ids);
      }
      if (payload.kind === "acknowledge") {
        return uploadIncidentService.bulkAcknowledge(payload.ids);
      }
      return uploadIncidentService.bulkEscalate(payload.ids);
    },
    onSuccess: (_result, payload) => {
      toast.success(
        payload.kind === "retry"
          ? "Retry requested for selected incidents."
          : payload.kind === "acknowledge"
            ? "Selected incidents acknowledged."
            : "Selected incidents escalated.",
      );
      setSelectedIds({});
      void queryClient.invalidateQueries({ queryKey: ["upload-incidents"] });
    },
    onError: (mutationError) => {
      if (isBulkUnsupported(mutationError)) {
        toast.error("Bulk action endpoint not enabled yet.");
        return;
      }
      if (mutationError instanceof Error) {
        toast.error(mutationError.message);
      } else {
        toast.error("Bulk action failed.");
      }
    },
  });

  const items = useMemo(() => sortIncidents(data?.items ?? []), [data?.items]);
  const totalCount = data?.total ?? 0;
  const stateCounts = data?.stateCounts;
  const selectedCount = useMemo(
    () => items.filter((item) => selectedIds[item.id]).length,
    [items, selectedIds],
  );
  const allSelected = items.length > 0 && selectedCount === items.length;
  const busyState = isError && (busyRetrying || isUploadIncidentBusyError(error));

  function resetPollingState() {
    busyFailuresRef.current = 0;
    setBusyRetrying(false);
    setPollMs(BASE_POLL_MS);
  }

  function clearSelectionOnFilterChange() {
    setSelectedIds({});
    sinceCursorRef.current = null;
    incidentCursorRef.current = null;
    resetPollingState();
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds({});
      return;
    }
    const next: Record<string, boolean> = {};
    items.forEach((item) => {
      next[item.id] = true;
    });
    setSelectedIds(next);
  }

  async function copyTriageBundle(item: UploadIncidentItem) {
    const formCheckLink = formCheckContextLink(item);
    const bundle = buildTriageBundle(item, isAdmin, formCheckLink);
    try {
      await navigator.clipboard.writeText(bundle);
      toast.success("Triage bundle copied");
    } catch {
      toast.error("Could not copy triage bundle");
    }
  }

  function triggerBulkAction(kind: BulkActionKind) {
    const ids = items.filter((item) => selectedIds[item.id]).map((item) => item.id);
    if (ids.length === 0) return;
    bulkActionMutation.mutate({ kind, ids });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Incident Monitor"
        description="Actionable upload reliability queue with operator triage tools."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {STATE_FILTERS.map((entry) => {
            const count =
              entry.key === "all"
                ? totalCount
                : stateCounts?.[entry.key as UploadIncidentState] ?? 0;
            return (
              <button
                key={entry.key}
                type="button"
                onClick={() => {
                  clearSelectionOnFilterChange();
                  setState(entry.key);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  state === entry.key
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200",
                )}
              >
                {entry.label}
                <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-bold">
                  {count}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              clearSelectionOnFilterChange();
              setRetryableOnly((value) => !value);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              retryableOnly
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200",
            )}
          >
            Retryable only
          </button>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
          <DebouncedSearch
            onSearch={(value) => {
              clearSelectionOnFilterChange();
              setSearch(value);
            }}
            placeholder="Search athlete, file, reason, correlation..."
            className="w-full lg:w-96"
          />
          <button
            type="button"
            onClick={() => {
              resetPollingState();
              void refetch();
            }}
            disabled={isFetching}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold",
              viewMode === "table"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
            )}
          >
            Table view
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-semibold",
              viewMode === "cards"
                ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
            )}
          >
            Card view
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {incidentPollingPaused
            ? "Auto-refresh paused while selecting incidents."
            : `Polling every ${Math.ceil(pollMs / 1000)}s when tab is visible.`}
        </p>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400">
        Showing {items.length}
        {data?.total != null ? ` of ${data.total}` : ""} incidents.
      </div>

      {selectedCount > 0 ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
              {selectedCount} selected
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => triggerBulkAction("retry")}
                disabled={bulkActionMutation.isPending}
                className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                Retry selected
              </button>
              <button
                type="button"
                onClick={() => triggerBulkAction("acknowledge")}
                disabled={bulkActionMutation.isPending}
                className="rounded-md border border-indigo-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-800 disabled:opacity-50 dark:border-indigo-700 dark:bg-gray-900 dark:text-indigo-200"
              >
                Acknowledge selected
              </button>
              <button
                type="button"
                onClick={() => triggerBulkAction("escalate")}
                disabled={bulkActionMutation.isPending}
                className="rounded-md border border-rose-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 disabled:opacity-50 dark:border-rose-700 dark:bg-gray-900 dark:text-rose-200"
              >
                Escalate selected
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-indigo-700 dark:text-indigo-200">
            Bulk actions are rollout-safe. If backend endpoints are not enabled yet, you will see a
            clear non-blocking message.
          </p>
        </div>
      ) : null}

      {busyState ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Server busy, retrying automatically in {Math.ceil(pollMs / 1000)}s.
        </div>
      ) : null}

      {isError && !busyState ? (
        <ErrorAlert
          message={
            error instanceof Error
              ? error.message
              : "Failed to load upload incidents."
          }
        />
      ) : isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Shimmer key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <UploadCloud className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            No incidents in this filter
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Upload incidents will appear here with state, diagnostics, and context links.
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="space-y-3">
          {items.map((item) => {
            const athleteLabel = item.athleteName?.trim() || item.athleteEmail || "Unknown athlete";
            return (
              <article
                key={item.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {athleteLabel}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                      {item.fileName ?? "Unknown file"} · {formatBytes(item.sizeBytes)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        stateTone(item.state),
                      )}
                    >
                      {stateLabel(item.state)}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        severityTone(item.severity),
                      )}
                    >
                      {severityLabel(item.severity)}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  {item.failureReason ?? "No failure reason provided yet."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span>Age {formatDuration(incidentAgeSeconds(item))}</span>
                  <span>Attempts {item.attempts ?? "—"}</span>
                  <span>{queueImpactLabel(item)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyTriageBundle(item)}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy triage bundle
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(formCheckContextLink(item))}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Open thread
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="min-w-[1200px] divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  <input
                    type="checkbox"
                    aria-label="Select all incidents"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  State
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Age
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Attempts
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  First seen
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Last activity
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Retryable
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Correlation ID
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Athlete / Context
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Queue impact
                </th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const athleteLabel = item.athleteName?.trim() || item.athleteEmail || "Unknown athlete";
                const checked = !!selectedIds[item.id];
                return (
                  <tr key={item.id} className={checked ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}>
                    <td className="px-3 py-2 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select incident ${item.id}`}
                        checked={checked}
                        onChange={() =>
                          setSelectedIds((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-1">
                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            stateTone(item.state),
                          )}
                        >
                          {stateLabel(item.state)}
                        </span>
                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            severityTone(item.severity),
                          )}
                        >
                          {severityLabel(item.severity)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700 dark:text-gray-200">
                      {formatDuration(incidentAgeSeconds(item))}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700 dark:text-gray-200">
                      {item.attempts ?? "—"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700 dark:text-gray-200">
                      {formatAbsoluteTime(item.firstFailedAt)}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-xs text-gray-700 dark:text-gray-200">
                        <p>{formatAbsoluteTime(item.latestActivityAt)}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          Checkpoint {timeAgo(item.lastCheckpointAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700 dark:text-gray-200">
                      {item.retryable ? "Yes" : "No"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {item.correlationId ? (
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                          {item.correlationId}
                        </code>
                      ) : (
                        <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="min-w-[220px] text-xs text-gray-700 dark:text-gray-200">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {athleteLabel}
                        </p>
                        <p className="mt-0.5">
                          {item.fileName ?? "Unknown file"} · {formatBytes(item.sizeBytes)}
                        </p>
                        <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                          {item.pipelineStage ?? "Stage unknown"}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          queueImpactTone(item),
                        )}
                      >
                        {queueImpactLabel(item)}
                      </span>
                      {item.queueHint ? (
                        <p className="mt-1 max-w-44 text-[11px] text-gray-500 dark:text-gray-400">
                          {item.queueHint}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col items-start gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyTriageBundle(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy triage bundle
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(formCheckContextLink(item))}
                          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                        >
                          Open thread
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
