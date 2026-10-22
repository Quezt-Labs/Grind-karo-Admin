import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { Button } from "@/components/ui/Button";
import {
  uploadSessionsService,
  type AdminUploadSessionItem,
} from "@/services/uploadSessionsService";
import {
  filterSessionsByAthleteQuery,
  groupUploadSessionsByUser,
  UPLOAD_SESSION_STATES,
  type UserUploadSummary,
} from "@/utils/uploadSessionsByUser";

const STATES = ["", ...UPLOAD_SESSION_STATES] as const;

function StatePill({
  state,
  count,
  tone = "neutral",
}: {
  state: string;
  count: number;
  tone?: "neutral" | "bad" | "good";
}) {
  if (count <= 0) return null;
  const className =
    tone === "bad"
      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
      : tone === "good"
        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}
    >
      {state} · {count}
    </span>
  );
}

function SessionsTable({ rows }: { rows: AdminUploadSessionItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          <tr>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Athlete</th>
            <th className="px-3 py-2">State</th>
            <th className="px-3 py-2">Purpose</th>
            <th className="px-3 py-2">File</th>
            <th className="px-3 py-2">Correlation</th>
            <th className="px-3 py-2">Failure</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.uploadSessionId}
              className="border-t border-gray-200 dark:border-gray-800"
            >
              <td className="whitespace-nowrap px-3 py-2">
                {new Date(row.updatedAt).toLocaleString("en-IN")}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {row.userName?.trim() || "—"}
                </div>
                <div className="text-gray-500">
                  {row.userEmail ?? row.userId.slice(0, 8)}
                </div>
              </td>
              <td className="px-3 py-2 font-semibold">{row.state}</td>
              <td className="px-3 py-2">{row.purpose}</td>
              <td className="px-3 py-2">
                <div>{row.filename}</div>
                <div className="text-gray-500">
                  {row.uploadedPartCount} parts
                </div>
              </td>
              <td className="px-3 py-2 font-mono">{row.correlationId}</td>
              <td className="px-3 py-2 text-red-600">
                {row.failureCode ?? "—"}
                {row.failureMessage ? ` · ${row.failureMessage}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-3 py-8 text-center text-sm text-gray-500">
          No sessions match these filters.
        </p>
      ) : null}
    </div>
  );
}

function AthleteGroupCard({ group }: { group: UserUploadSummary }) {
  const failed = group.byState.FAILED ?? 0;
  return (
    <details
      className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
      open={failed > 0}
    >
      <summary className="cursor-pointer list-none px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {group.label}
            </p>
            <p className="text-xs text-gray-500">
              {group.email ?? group.userId} · {group.sessions.length} session
              {group.sessions.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {UPLOAD_SESSION_STATES.map((state) => (
              <StatePill
                key={state}
                state={state}
                count={group.byState[state] ?? 0}
                tone={
                  state === "FAILED"
                    ? "bad"
                    : state === "COMPLETED"
                      ? "good"
                      : "neutral"
                }
              />
            ))}
          </div>
        </div>
        {failed > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Fail codes:
            </span>
            {Object.entries(group.failuresByCode)
              .sort((a, b) => b[1] - a[1])
              .map(([code, count]) => (
                <span
                  key={code}
                  className="rounded-md bg-red-50 px-1.5 py-0.5 font-mono text-[10px] text-red-700 dark:bg-red-950/50 dark:text-red-200"
                >
                  {code} ({count})
                </span>
              ))}
          </div>
        ) : null}
      </summary>
      <div className="border-t border-gray-200 px-2 pb-2 dark:border-gray-800">
        <SessionsTable rows={group.sessions} />
      </div>
    </details>
  );
}

export function UploadSessionsPage() {
  const [purpose, setPurpose] = useState("");
  const [state, setState] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [athleteQuery, setAthleteQuery] = useState("");
  const [viewMode, setViewMode] = useState<"byAthlete" | "flat">("byAthlete");

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["upload-sessions", purpose, state, correlationId],
    queryFn: () =>
      uploadSessionsService.list({
        purpose: purpose || undefined,
        state: state || undefined,
        correlationId: correlationId.trim() || undefined,
        limit: 100,
      }),
  });

  const items = useMemo(
    () => filterSessionsByAthleteQuery(data ?? [], athleteQuery),
    [data, athleteQuery],
  );

  const failedCount = useMemo(
    () => items.filter((row) => row.state === "FAILED").length,
    [items],
  );

  const athleteGroups = useMemo(
    () => groupUploadSessionsByUser(items),
    [items],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Upload sessions"
        description="Per-athlete status breakdown and failure codes (latest 100 rows from server filters)."
      />

      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs">
          View
          <select
            className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={viewMode}
            onChange={(event) =>
              setViewMode(event.target.value as "byAthlete" | "flat")
            }
          >
            <option value="byAthlete">By athlete</option>
            <option value="flat">All sessions (table)</option>
          </select>
        </label>
        <label className="text-xs">
          Purpose
          <select
            className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          >
            <option value="">All</option>
            <option value="form_check">form_check</option>
            <option value="media">media</option>
          </select>
        </label>
        <label className="text-xs">
          State
          <select
            className="mt-1 block rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            {STATES.map((value) => (
              <option key={value || "all"} value={value}>
                {value || "All"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Athlete (name / email)
          <input
            className="mt-1 block w-48 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={athleteQuery}
            onChange={(event) => setAthleteQuery(event.target.value)}
            placeholder="Search"
          />
        </label>
        <label className="text-xs">
          Correlation ID
          <input
            className="mt-1 block w-64 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
            value={correlationId}
            onChange={(event) => setCorrelationId(event.target.value)}
            placeholder="uuid"
          />
        </label>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          Refresh
        </Button>
        <p className="text-xs text-gray-500">
          {items.length} shown · {athleteGroups.length} athletes · {failedCount}{" "}
          failed
        </p>
      </div>

      {isError && <ErrorAlert message="Could not load upload sessions." />}
      {isLoading ? (
        <Shimmer className="h-40" />
      ) : viewMode === "byAthlete" ? (
        <div className="space-y-3">
          {athleteGroups.map((group) => (
            <AthleteGroupCard key={group.userId} group={group} />
          ))}
          {athleteGroups.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700">
              No sessions match these filters.
            </p>
          ) : null}
        </div>
      ) : (
        <SessionsTable rows={items} />
      )}
    </div>
  );
}
