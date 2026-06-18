import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { userService } from "@/services/userService";
import type { UserProgressEntry } from "@/types/user";

const PROGRESS_PAGE_SIZE = 12;
const PHOTO_LABELS = ["Front", "Side", "Back"] as const;

const PROGRESS_MEDIA_REMOVED =
  "Media removed after 30 days — weight and notes are kept.";

function progressEntryImages(entry: UserProgressEntry): string[] {
  if (entry.imageUrls?.length) return entry.imageUrls;
  if (entry.imageUrl) return [entry.imageUrl];
  return [];
}

function progressEntryHasMedia(entry: UserProgressEntry): boolean {
  return progressEntryImages(entry).length > 0 || !!entry.videoUrl;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface UserProgressPanelProps {
  userId: string;
  compactHeader?: boolean;
}

export function UserProgressPanel({
  userId,
  compactHeader = false,
}: UserProgressPanelProps) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-progress", userId, offset],
    queryFn: () =>
      userService.getProgress(userId, {
        limit: PROGRESS_PAGE_SIZE,
        offset,
      }),
  });

  const items = data?.items ?? [];

  return (
    <div>
      {!compactHeader ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ImageIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Progress check-ins
          </h2>
          {data && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
              {data.total}
            </span>
          )}
          <span className="w-full text-xs text-gray-500 dark:text-gray-400 sm:ml-auto sm:w-auto">
            Photos/videos auto-deleted after 30 days
          </span>
        </div>
      ) : (
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Photos/videos auto-deleted after 30 days
          {data ? ` · ${data.total} entries` : ""}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center dark:border-gray-600 dark:bg-gray-800">
          <ImageIcon className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No weekly check-ins yet (3 photos + video).
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((entry) => {
              const images = progressEntryImages(entry);
              const hasMedia = progressEntryHasMedia(entry);
              return (
                <div
                  key={entry.id}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatDateTime(entry.createdAt)}
                    </p>
                    {entry.weight && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {entry.weight} kg
                      </span>
                    )}
                  </div>
                  {hasMedia ? (
                    <>
                      <div className="grid grid-cols-3 gap-0.5 bg-gray-100 dark:bg-gray-900">
                        {images.map((url, i) => (
                          <a
                            key={`${entry.id}-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-3/4 overflow-hidden bg-gray-200 dark:bg-gray-800"
                          >
                            <img
                              src={url}
                              alt={`${PHOTO_LABELS[i] ?? "Photo"} ${formatDate(entry.createdAt)}`}
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            />
                            <span className="absolute left-1 top-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                              {PHOTO_LABELS[i] ?? i + 1}
                            </span>
                          </a>
                        ))}
                      </div>
                      {entry.videoUrl && (
                        <FormCheckVideoPlayer
                          src={entry.videoUrl}
                          videoClassName="max-h-72 aspect-auto"
                        />
                      )}
                    </>
                  ) : (
                    <div className="border-b border-gray-100 bg-gray-50 px-4 py-3 text-xs italic text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                      {PROGRESS_MEDIA_REMOVED}
                    </div>
                  )}
                  {entry.notes && (
                    <p className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                      {entry.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {(data?.total ?? 0) > PROGRESS_PAGE_SIZE && (
            <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>
                Showing {offset + 1}–
                {Math.min(offset + PROGRESS_PAGE_SIZE, data?.total ?? 0)} of{" "}
                {data?.total ?? 0}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setOffset((o) => Math.max(0, o - PROGRESS_PAGE_SIZE))
                  }
                  disabled={offset === 0}
                  className="rounded-lg border p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setOffset((o) => o + PROGRESS_PAGE_SIZE)}
                  disabled={offset + PROGRESS_PAGE_SIZE >= (data?.total ?? 0)}
                  className="rounded-lg border p-1.5 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-700"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
