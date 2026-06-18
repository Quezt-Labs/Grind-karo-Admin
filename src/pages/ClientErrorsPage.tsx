import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bug,
  Eye,
  Globe,
  Monitor,
  Smartphone,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { Button } from "@/components/ui/Button";
import { clientErrorService } from "@/services/clientErrorService";
import type {
  ClientErrorCategory,
  ClientErrorReport,
  ClientErrorSource,
} from "@/types/clientError";

const CATEGORY_LABELS: Record<ClientErrorCategory, string> = {
  API: "API",
  REACT: "React",
  UNHANDLED: "Unhandled",
  PROMISE: "Promise",
};

function sourceLabel(source: ClientErrorSource): string {
  return source === "ADMIN" ? "Admin app" : "Client app";
}

export function ClientErrorsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<ClientErrorSource | "ALL">(
    "ALL",
  );
  const [selectedError, setSelectedError] = useState<ClientErrorReport | null>(
    null,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-errors", searchTerm, unreadOnly, sourceFilter],
    queryFn: () =>
      clientErrorService.getAll({
        q: searchTerm || undefined,
        unreadOnly: unreadOnly || undefined,
        source: sourceFilter === "ALL" ? undefined : sourceFilter,
        limit: 100,
      }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => clientErrorService.markRead(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["client-errors"] });
      setSelectedError(updated);
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  function handleOpen(item: ClientErrorReport) {
    setSelectedError(item);
    if (!item.readAt) {
      markReadMut.mutate(item.id);
    }
  }

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Errors"
        description="API failures, crashes, and unhandled errors from the client and admin apps"
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
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
          <span className="hidden h-4 w-px bg-gray-200 sm:inline dark:bg-gray-700" />
          {(["ALL", "CLIENT", "ADMIN"] as const).map((value) => (
            <button
              key={value}
              onClick={() => setSourceFilter(value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                sourceFilter === value
                  ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300",
              )}
            >
              {value === "ALL" ? "All apps" : sourceLabel(value)}
            </button>
          ))}
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search message, email, URL..."
          className="w-full lg:w-72"
        />
      </div>

      {isError ? (
        <ErrorAlert message="Failed to load client errors." />
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
            <Bug className="h-8 w-8 text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {unreadOnly ? "No unread errors" : "No errors reported yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            Client and admin app errors will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isUnread = !item.readAt;
            const displayName =
              item.userName?.trim() || item.userEmail || "Unknown user";
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex cursor-pointer items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750",
                  isUnread
                    ? "border-red-200 dark:border-red-900/50"
                    : "border-gray-200 dark:border-gray-700",
                )}
                onClick={() => handleOpen(item)}
              >
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isUnread
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-700",
                  )}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        isUnread
                          ? "font-semibold text-gray-900 dark:text-white"
                          : "font-medium text-gray-700 dark:text-gray-300",
                      )}
                    >
                      {displayName}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {sourceLabel(item.source)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 text-sm",
                      isUnread
                        ? "font-medium text-gray-800 dark:text-gray-200"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    {item.message}
                  </p>
                  {item.pageUrl && (
                    <p className="mt-1 truncate text-xs text-gray-400">
                      {item.pageUrl}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(item);
                    }}
                    className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700"
                    title="View details"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedError.message}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedError.userName ||
                    selectedError.userEmail ||
                    "Unknown"}{" "}
                  · {sourceLabel(selectedError.source)} ·{" "}
                  {CATEGORY_LABELS[selectedError.category]}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(selectedError.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="shrink-0 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedError.pageUrl && (
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-600">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <Globe className="h-3.5 w-3.5" />
                    Page URL
                  </div>
                  <p className="break-all text-sm text-gray-700 dark:text-gray-300">
                    {selectedError.pageUrl}
                  </p>
                </div>
              )}

              {selectedError.stack && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Stack trace
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700 dark:text-gray-300">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {Object.keys(selectedError.metadata).length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-900/40">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Metadata
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-gray-700 dark:text-gray-300">
                    {JSON.stringify(selectedError.metadata, null, 2)}
                  </pre>
                </div>
              )}

              {selectedError.userAgent && (
                <p className="text-xs text-gray-400">
                  {selectedError.userAgent}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              {selectedError.userId && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigate(`/users/${selectedError.userId}`);
                    setSelectedError(null);
                  }}
                >
                  {selectedError.source === "CLIENT" ? (
                    <Smartphone className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <Monitor className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  View user
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedError(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
