import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { CheckCheck, Upload, User } from "lucide-react";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { Button } from "@/components/ui/Button";
import { notificationService } from "@/services/notificationService";
import type { AdminNotification } from "@/types/user";

function formatBytes(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function payloadString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function payloadNumber(
  payload: Record<string, unknown>,
  key: string,
): number | null {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function matchesSearch(item: AdminNotification, term: string): boolean {
  if (!term.trim()) return true;
  const q = term.trim().toLowerCase();
  const p = item.payload;
  const haystack = [
    item.message,
    payloadString(p, "userEmail"),
    payloadString(p, "userName"),
    payloadString(p, "exerciseName"),
    payloadString(p, "message"),
    payloadString(p, "fileName"),
    payloadString(p, "step"),
    payloadString(p, "pageUrl"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function UploadFailuresPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["upload-failures", unreadOnly],
    queryFn: () =>
      notificationService.getAll({
        type: "CLIENT_UPLOAD_FAILED",
        unreadOnly: unreadOnly || undefined,
        limit: 100,
      }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-failures"] });
      queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-list"],
      });
    },
  });

  const markAllMut = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upload-failures"] });
      queryClient.invalidateQueries({
        queryKey: ["notification-unread-count"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-list"],
      });
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setSelectedId(null);
  }, []);

  const items = useMemo(
    () => (data?.items ?? []).filter((item) => matchesSearch(item, searchTerm)),
    [data?.items, searchTerm],
  );

  const selected = items.find((item) => item.id === selectedId) ?? null;
  const unreadCount = data?.unreadCount ?? 0;
  const total = data?.total ?? 0;

  function openItem(item: AdminNotification) {
    setSelectedId(item.id);
    if (!item.readAt) markReadMut.mutate(item.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload failures"
        description="Form-check and other client app uploads that failed — reported automatically from the athlete app"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUnreadOnly(false)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              !unreadOnly
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
            )}
          >
            All ({total})
          </button>
          <button
            type="button"
            onClick={() => setUnreadOnly(true)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              unreadOnly
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
            )}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DebouncedSearch
            onSearch={handleSearch}
            placeholder="Search athlete, exercise, error…"
            className="w-full sm:w-72"
          />
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAllMut.mutate()}
              disabled={markAllMut.isPending}
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <ErrorAlert message="Could not load upload failure reports." />
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Shimmer key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <Upload className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                No upload failures
              </p>
              <p className="mt-1 max-w-sm text-xs text-gray-500 dark:text-gray-400">
                When an athlete&apos;s video upload fails, it appears here with
                file size, step, and error message.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((item) => {
                const p = item.payload;
                const email =
                  payloadString(p, "userEmail") ??
                  payloadString(p, "userName") ??
                  "Unknown athlete";
                const exercise = payloadString(p, "exerciseName");
                const setNumber = payloadNumber(p, "setNumber");
                const step = payloadString(p, "step") ?? "unknown";
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openItem(item)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40",
                        selectedId === item.id &&
                          "bg-primary-50/70 dark:bg-primary-900/20",
                      )}
                    >
                      <div className="mt-0.5 rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-900/20 dark:text-red-400">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                            {email}
                          </p>
                          {!item.readAt && (
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">
                          {payloadString(p, "message") ?? item.message}
                        </p>
                        <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                          {exercise
                            ? `${exercise}${setNumber != null ? ` · set ${setNumber}` : ""} · `
                            : ""}
                          {step} · {timeAgo(item.createdAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          {!selected ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select a row to see full details.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Error
                </p>
                <p className="mt-1 text-sm leading-relaxed text-gray-900 dark:text-white">
                  {payloadString(selected.payload, "message") ??
                    selected.message}
                </p>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Detail
                  label="Athlete"
                  value={payloadString(selected.payload, "userEmail")}
                />
                <Detail
                  label="Step"
                  value={payloadString(selected.payload, "step")}
                />
                <Detail
                  label="Exercise"
                  value={payloadString(selected.payload, "exerciseName")}
                />
                <Detail
                  label="Set"
                  value={
                    payloadNumber(selected.payload, "setNumber") != null
                      ? String(payloadNumber(selected.payload, "setNumber"))
                      : null
                  }
                />
                <Detail
                  label="File"
                  value={payloadString(selected.payload, "fileName")}
                />
                <Detail
                  label="Size"
                  value={formatBytes(
                    payloadNumber(selected.payload, "fileSize") ?? undefined,
                  )}
                />
                <Detail
                  label="Type"
                  value={payloadString(selected.payload, "contentType")}
                />
                <Detail
                  label="Surface"
                  value={payloadString(selected.payload, "surface")}
                />
                <Detail
                  label="Program"
                  value={payloadString(selected.payload, "programId")}
                />
                <Detail
                  label="When"
                  value={new Date(selected.createdAt).toLocaleString()}
                />
              </dl>

              {payloadString(selected.payload, "pageUrl") && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page:{" "}
                  <code className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-900">
                    {payloadString(selected.payload, "pageUrl")}
                  </code>
                </p>
              )}

              {payloadString(selected.payload, "userId") && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/users/${payloadString(selected.payload, "userId")}`,
                    )
                  }
                >
                  <User className="h-4 w-4" />
                  Open athlete profile
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-0.5 break-all text-gray-900 dark:text-white">
        {value ?? "—"}
      </dd>
    </div>
  );
}
