import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, MailOpen, Trash2, Eye, X, Inbox } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Shimmer } from "@/components/ui/Shimmer";
import { DebouncedSearch } from "@/components/shared/DebouncedSearch";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { contactService } from "@/services/contactService";
import type { ContactSubmission } from "@/types/contact";

export function ContactSubmissionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedSubmission, setSelectedSubmission] =
    useState<ContactSubmission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactSubmission | null>(
    null,
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: ["contact-submissions", searchTerm, unreadOnly],
    queryFn: () =>
      contactService.getAll({
        q: searchTerm || undefined,
        unreadOnly: unreadOnly || undefined,
        limit: 100,
      }),
  });

  const markReadMut = useMutation({
    mutationFn: (id: string) => contactService.markRead(id),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      setSelectedSubmission(updated);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => contactService.remove(id),
    onSuccess: () => {
      toast.success("Submission deleted");
      queryClient.invalidateQueries({ queryKey: ["contact-submissions"] });
      setDeleteTarget(null);
      if (deleteTarget?.id === selectedSubmission?.id) {
        setSelectedSubmission(null);
      }
    },
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  function handleOpen(submission: ContactSubmission) {
    setSelectedSubmission(submission);
    if (!submission.readAt) {
      markReadMut.mutate(submission.id);
    }
  }

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contact Submissions"
        description="Manage messages from the contact form"
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
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
        </div>
        <DebouncedSearch
          onSearch={handleSearch}
          placeholder="Search name, email, subject..."
          className="w-full sm:w-72"
        />
      </div>

      {/* Content */}
      {isError ? (
        <ErrorAlert message="Failed to load contact submissions." />
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-900/20">
            <Inbox className="h-8 w-8 text-primary-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {unreadOnly ? "No unread submissions" : "No submissions yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
            {unreadOnly
              ? "All submissions have been read."
              : "Contact form submissions will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const isUnread = !item.readAt;
            return (
              <div
                key={item.id}
                className={cn(
                  "group flex cursor-pointer items-start gap-4 rounded-xl border bg-white p-4 shadow-sm transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750",
                  isUnread
                    ? "border-primary-200 dark:border-primary-800"
                    : "border-gray-200 dark:border-gray-700",
                )}
                onClick={() => handleOpen(item)}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    isUnread
                      ? "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-700",
                  )}
                >
                  {isUnread ? (
                    <Mail className="h-4 w-4" />
                  ) : (
                    <MailOpen className="h-4 w-4" />
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "truncate text-sm",
                        isUnread
                          ? "font-semibold text-gray-900 dark:text-white"
                          : "font-medium text-gray-700 dark:text-gray-300",
                      )}
                    >
                      {item.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      &lt;{item.email}&gt;
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 truncate text-sm",
                      isUnread
                        ? "font-medium text-gray-800 dark:text-gray-200"
                        : "text-gray-600 dark:text-gray-400",
                    )}
                  >
                    {item.subject}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-400">
                    {item.message}
                  </p>
                </div>

                {/* Meta + actions */}
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpen(item);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(item);
                      }}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail drawer */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="mb-4 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selectedSubmission.subject}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  From{" "}
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {selectedSubmission.name}
                  </span>{" "}
                  &lt;{selectedSubmission.email}&gt;
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {new Date(selectedSubmission.createdAt).toLocaleString()}
                  {selectedSubmission.readAt && (
                    <span className="ml-2">
                      · Read{" "}
                      {new Date(selectedSubmission.readAt).toLocaleString()}
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="shrink-0 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/50">
              <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                {selectedSubmission.message}
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleteTarget(selectedSubmission);
                }}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Submission"
        message={`Delete the submission from "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMut.isPending}
        onConfirm={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
