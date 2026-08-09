import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  type UploadIncidentState,
} from "@/services/uploadIncidentService";

const STATE_FILTERS: Array<{ key: UploadIncidentState | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "failed", label: "Failed" },
  { key: "stuck", label: "Stuck" },
  { key: "retrying", label: "Retrying" },
  { key: "resolved", label: "Resolved" },
];

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
    const aAt = new Date(a.latestActivityAt ?? a.lastCheckpointAt ?? 0).getTime();
    const bAt = new Date(b.latestActivityAt ?? b.lastCheckpointAt ?? 0).getTime();
    if (actionRank(a.state) < 4) return aAt - bAt;
    return bAt - aAt;
  });
  return copy;
}

function formCheckContextLink(item: UploadIncidentItem): string {
  if (!item.athleteId) return "/form-checks";
  const params = new URLSearchParams({
    userId: item.athleteId,
    review: "all",
  });
  if (item.videoId) params.set("videoId", item.videoId);
  if (item.commentId) params.set("commentId", item.commentId);
  if (item.messageId) params.set("messageId", item.messageId);
  if (item.threadType) params.set("threadType", item.threadType);
  return `/form-checks?${params.toString()}`;
}

export function UploadIncidentMonitorPage() {
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();
  const [state, setState] = useState<UploadIncidentState | "all">("all");
  const [search, setSearch] = useState("");
  const [retryableOnly, setRetryableOnly] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["upload-incidents", state, retryableOnly, search],
    queryFn: () =>
      uploadIncidentService.list({
        state,
        retryable: retryableOnly ? true : undefined,
        q: search || undefined,
        limit: 100,
      }),
  });

  const items = useMemo(() => sortIncidents(data?.items ?? []), [data?.items]);

  const totalCount = data?.total ?? 0;
  const stateCounts = data?.stateCounts;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload Incident Monitor"
        description="Failed or stuck uploads requiring operator attention."
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
                onClick={() => setState(entry.key)}
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
            onClick={() => setRetryableOnly((value) => !value)}
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
            onSearch={setSearch}
            placeholder="Search athlete, file, reason, correlation..."
            className="w-full lg:w-96"
          />
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {isError ? (
        <ErrorAlert
          message={
            error instanceof Error
              ? error.message
              : "Failed to load upload incidents."
          }
        />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Shimmer key={index} className="h-32 rounded-xl" />
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
      ) : (
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
                        item.retryable
                          ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
                      )}
                    >
                      {item.retryable ? "Retryable" : "Not retryable"}
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">
                  {item.failureReason ?? "No failure reason provided yet."}
                </p>

                <div className="mt-3 grid gap-2 text-xs text-gray-600 dark:text-gray-300 md:grid-cols-2">
                  <p>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      Last checkpoint:
                    </span>{" "}
                    {timeAgo(item.lastCheckpointAt)}
                  </p>
                  <p>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                      Latest activity:
                    </span>{" "}
                    {timeAgo(item.latestActivityAt)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {item.correlationId ? (
                    <>
                      <code className="rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        {item.correlationId}
                      </code>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(item.correlationId!);
                            toast.success("Correlation ID copied");
                          } catch {
                            toast.error("Could not copy correlation ID");
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy ID
                      </button>
                    </>
                  ) : null}
                  {item.athleteId ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          isAdmin
                            ? `/users/${item.athleteId}`
                            : `/coach/athletes/${item.athleteId}`,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
                    >
                      Athlete context
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => navigate(formCheckContextLink(item))}
                    className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                  >
                    Open form-check
                  </button>
                  {item.groupedCount > 1 ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                      {item.groupedCount} grouped incidents
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
