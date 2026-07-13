import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { History, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { programService } from "@/services/programService";
import type { ProgramRevisionSummary } from "@/types/programs";
import { cn } from "@/utils/cn";

interface ProgramHistoryPanelProps {
  programId: string;
}

function triggerBadgeClass(trigger: string) {
  switch (trigger) {
    case "manual":
      return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300";
    case "pre_restore":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    default:
      return "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ProgramHistoryPanel({ programId }: ProgramHistoryPanelProps) {
  const qc = useQueryClient();
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const [restoreTarget, setRestoreTarget] =
    useState<ProgramRevisionSummary | null>(null);

  const {
    data: revisions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["program-revisions", programId],
    queryFn: () => programService.listRevisions(programId),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      programService.createRevision(programId, {
        label: checkpointLabel.trim() || undefined,
      }),
    onSuccess: () => {
      setCheckpointLabel("");
      toast.success("Checkpoint saved");
      void qc.invalidateQueries({ queryKey: ["program-revisions", programId] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to save checkpoint",
      );
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (revisionId: string) =>
      programService.restoreRevision(programId, revisionId),
    onSuccess: () => {
      setRestoreTarget(null);
      toast.success("Program restored from revision");
      void qc.invalidateQueries({ queryKey: ["program-tree", programId] });
      void qc.invalidateQueries({ queryKey: ["program-revisions", programId] });
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Failed to restore revision",
      );
    },
  });

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 bg-gray-50/80 px-3 py-3 dark:border-gray-700 dark:bg-gray-800/60 sm:px-4">
        <div className="flex items-start gap-2">
          <History className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Content version history
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Auto-snapshots after edits, plus manual checkpoints. Restore
              replaces the live structure (resources are upserted by slug).
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="text"
            value={checkpointLabel}
            onChange={(e) => setCheckpointLabel(e.target.value)}
            placeholder="Checkpoint label (optional)"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
          <Button
            size="sm"
            className="shrink-0 sm:w-auto"
            isLoading={createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            <Save className="h-3.5 w-3.5" />
            Save checkpoint
          </Button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : isError ? (
          <ErrorAlert
            message={
              error instanceof Error
                ? error.message
                : "Failed to load revisions"
            }
          />
        ) : revisions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No revisions yet. Edit the program or save a checkpoint to start
            history.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      r{rev.revisionNumber}
                      {rev.label ? (
                        <span className="font-normal text-gray-600 dark:text-gray-300">
                          {" "}
                          — {rev.label}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                        triggerBadgeClass(rev.trigger),
                      )}
                    >
                      {rev.trigger.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {formatWhen(rev.createdAt)}
                    {" · "}
                    {rev.blockCount} blocks · {rev.weekCount} weeks ·{" "}
                    {rev.exerciseCount} exercises
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0 self-start sm:self-center"
                  disabled={restoreMutation.isPending}
                  onClick={() => setRestoreTarget(rev)}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {restoreTarget && (
        <ConfirmModal
          open={!!restoreTarget}
          title="Restore revision?"
          message={`Restore to r${restoreTarget.revisionNumber}${
            restoreTarget.label ? ` (“${restoreTarget.label}”)` : ""
          }? The current structure will be saved as a pre-restore checkpoint first. Live block/week/day/exercise IDs will change.`}
          confirmLabel="Restore"
          variant="danger"
          isLoading={restoreMutation.isPending}
          onConfirm={() => restoreMutation.mutate(restoreTarget.id)}
          onCancel={() => {
            if (!restoreMutation.isPending) setRestoreTarget(null);
          }}
        />
      )}
    </div>
  );
}
