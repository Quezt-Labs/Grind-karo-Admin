import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FormCheckVideoPlayer } from "@/components/shared/FormCheckVideoPlayer";
import { formCheckInboxService } from "@/services/formCheckInboxService";
import { formatRelativeTime } from "@/utils/formatRelativeTime";

interface ProgramEditorAthleteVideosPanelProps {
  userId: string;
  onClose: () => void;
}

export function ProgramEditorAthleteVideosPanel({
  userId,
  onClose,
}: ProgramEditorAthleteVideosPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["editor-athlete-form-check-videos", userId],
    queryFn: () =>
      formCheckInboxService.list({
        userId,
        limit: 20,
      }),
  });

  const list = data?.items ?? [];

  return (
    <aside className="flex w-72 shrink-0 flex-col border-l border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Athlete videos
        </h3>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        )}
        {isError && (
          <p className="text-xs text-red-500">Failed to load videos.</p>
        )}
        {!isLoading && list.length === 0 && (
          <p className="text-xs text-gray-500">No recent form-check videos.</p>
        )}
        {list.map((video) => (
          <div
            key={video.id}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
          >
            <FormCheckVideoPlayer src={video.videoUrl} compact />
            <div className="space-y-0.5 p-2">
              <p className="truncate text-xs font-medium text-gray-900 dark:text-white">
                {video.exerciseName || "Form check"}
              </p>
              {video.createdAt && (
                <p className="text-[10px] text-gray-500">
                  {formatRelativeTime(video.createdAt)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
