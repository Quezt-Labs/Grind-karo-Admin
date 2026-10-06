import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { Button } from "@/components/ui/Button";
import { uploadSessionsService } from "@/services/uploadSessionsService";

const STATES = [
  "",
  "QUEUED",
  "UPLOADING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "RETRY",
] as const;

export function UploadSessionsPage() {
  const [purpose, setPurpose] = useState("");
  const [state, setState] = useState("");
  const [correlationId, setCorrelationId] = useState("");

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

  const items = data ?? [];
  const failedCount = useMemo(
    () => items.filter((row) => row.state === "FAILED").length,
    [items],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Upload sessions"
        description="Server-truth multipart jobs by purpose, state, and correlation ID."
      />

      <div className="flex flex-wrap items-end gap-2">
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
          {items.length} shown · {failedCount} failed
        </p>
      </div>

      {isError && <ErrorAlert message="Could not load upload sessions." />}
      {isLoading ? (
        <Shimmer className="h-40" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
              <tr>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Correlation</th>
                <th className="px-3 py-2">Failure</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr
                  key={row.uploadSessionId}
                  className="border-t border-gray-200 dark:border-gray-800"
                >
                  <td className="whitespace-nowrap px-3 py-2">
                    {new Date(row.updatedAt).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 font-semibold">{row.state}</td>
                  <td className="px-3 py-2">{row.purpose}</td>
                  <td className="px-3 py-2">
                    <div>{row.filename}</div>
                    <div className="text-gray-500">
                      {row.userId.slice(0, 8)} · {row.uploadedPartCount} parts
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
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-gray-500">
              No sessions match these filters.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
