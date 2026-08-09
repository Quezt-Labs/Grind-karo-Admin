import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Clock3, ListChecks, TimerReset, Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import {
  formCheckSlaService,
  type FormCheckSlaWindow,
} from "@/services/formCheckSlaService";

const WINDOWS: Array<{ key: FormCheckSlaWindow; label: string }> = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
];

function formatMinutes(value: number | null): string {
  if (value == null) return "—";
  if (value < 60) return `${Math.round(value)}m`;
  const hours = value / 60;
  return `${hours.toFixed(1)}h`;
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

function freshnessLabel(iso: string | null): string {
  if (!iso) return "Unknown refresh time";
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Updated just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `Updated ${hours}h ago`;
}

function loadBarWidth(value: number | null): string {
  if (value == null) return "0%";
  const clamped = Math.max(0, Math.min(100, value));
  return `${clamped}%`;
}

function isBusyError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status ?? null;
    return error.code === "ECONNABORTED" || status === 408 || status === 429 || (status != null && status >= 500);
  }
  if (typeof error === "object" && error != null) {
    const maybeBusy = (error as { busy?: unknown }).busy;
    if (maybeBusy === true) return true;
    const status = (error as { status?: unknown }).status;
    if (typeof status === "number") {
      return status === 408 || status === 429 || status >= 500;
    }
  }
  return false;
}

function nextCooldown(baseMs: number, failures: number): number {
  if (failures <= 0) return baseMs;
  return Math.min(Math.round(baseMs * Math.pow(2, failures - 1)), 180_000);
}

export function FormCheckSlaPage() {
  const BASE_POLL_MS = 30_000;
  const { user } = useAuth();
  const isAssistant = user?.role === "ASSISTANT_COACH";
  const [windowKey, setWindowKey] = useState<FormCheckSlaWindow>("24h");
  const [pollMs, setPollMs] = useState(BASE_POLL_MS);
  const [busyRetrying, setBusyRetrying] = useState(false);
  const busyFailuresRef = useRef(0);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["form-check-sla", windowKey],
    queryFn: async () => {
      try {
        const metrics = await formCheckSlaService.getMetrics({
          window: windowKey,
        });
        busyFailuresRef.current = 0;
        setBusyRetrying(false);
        setPollMs(BASE_POLL_MS);
        return metrics;
      } catch (queryError) {
        if (isBusyError(queryError)) {
          busyFailuresRef.current += 1;
          setBusyRetrying(true);
          setPollMs(nextCooldown(BASE_POLL_MS, busyFailuresRef.current));
        } else {
          busyFailuresRef.current = 0;
          setBusyRetrying(false);
          setPollMs(BASE_POLL_MS);
        }
        throw queryError;
      }
    },
    staleTime: 10_000,
    retry: false,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? pollMs
        : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  const loadRows = useMemo(() => data?.assistantLoadSplit ?? [], [data?.assistantLoadSplit]);
  const busyState = isError && (busyRetrying || isBusyError(error));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Form-check SLA"
        description={
          isAssistant
            ? "Assignment-scoped SLA metrics for your athlete queue."
            : "SLA health for form-check reply operations across coaches."
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((window) => (
          <button
            key={window.key}
            type="button"
            onClick={() => {
              busyFailuresRef.current = 0;
              setBusyRetrying(false);
              setPollMs(BASE_POLL_MS);
              setWindowKey(window.key);
            }}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
              windowKey === window.key
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200",
            )}
          >
            {window.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
          {freshnessLabel(data?.refreshedAt ?? null)}
        </span>
      </div>

      {busyState ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          Server busy, retrying automatically in {Math.ceil(pollMs / 1000)}s.
        </div>
      ) : null}

      {isError && !busyState ? (
        <ErrorAlert
          message={
            error instanceof Error ? error.message : "Failed to load SLA metrics."
          }
        />
      ) : isLoading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Shimmer key={index} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
              <div className="mb-2 flex items-center gap-2 text-rose-800 dark:text-rose-200">
                <TimerReset className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Overdue</p>
              </div>
              <p className="text-2xl font-bold text-rose-900 dark:text-rose-100">
                {data?.overdue.count ?? 0}
              </p>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                {formatPercent(data?.overdue.ratePercent ?? null)} of active queue
              </p>
            </article>

            <article className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <ListChecks className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Needs reply</p>
              </div>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {data?.backlog.needsReplyCount ?? 0}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Unread {data?.backlog.unreadCount ?? 0} · Overdue {data?.backlog.overdueCount ?? 0}
              </p>
            </article>

            <article className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
              <div className="mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Clock3 className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">Response p90</p>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatMinutes(data?.percentiles.p90Minutes ?? null)}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                p50 {formatMinutes(data?.percentiles.p50Minutes ?? null)} · p95{" "}
                {formatMinutes(data?.percentiles.p95Minutes ?? null)}
              </p>
            </article>

            <article className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <div className="mb-2 flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                <Users className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wide">
                  Assistant load rows
                </p>
              </div>
              <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                {loadRows.length}
              </p>
              <p className="text-xs text-indigo-700 dark:text-indigo-300">
                Assignment-limited for assistants
              </p>
            </article>
          </section>

          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                Assistant load split
              </h2>
            </div>
            {loadRows.length === 0 ? (
              <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">
                No assistant load rows returned for this window.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {loadRows.map((row) => (
                  <div key={row.assistantCoachId ?? row.assistantCoachName} className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {row.assistantCoachName}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <span>{row.assignedAthletes} athletes</span>
                        <span>{row.needsReplyCount} needs reply</span>
                        <span>{row.overdueCount} overdue</span>
                        <span>{formatPercent(row.loadSharePercent)}</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: loadBarWidth(row.loadSharePercent) }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : busyState ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Shimmer key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
