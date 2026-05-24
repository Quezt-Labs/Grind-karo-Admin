import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Lock,
  LockOpen,
  RotateCcw,
  Users,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { movementSlotService } from "@/services/movementSlotService";
import type { AthleteSelectionRecord, MovementSlot } from "@/types/programs";

const CATEGORY_COLORS: Record<string, string> = {
  SQUAT: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  BENCH:
    "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
  DEADLIFT: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  ACCESSORY: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
  OTHER: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
};

interface AthleteSelectionsPanelProps {
  programId: string;
  slots: MovementSlot[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SelectionStatus({ record }: { record: AthleteSelectionRecord }) {
  const isLocked = !!record.selectionsLockedAt;
  const hasSelections =
    record.movementSelections &&
    Object.keys(record.movementSelections).length > 0;

  if (isLocked) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
        <Lock className="h-3 w-3" />
        Locked
      </span>
    );
  }
  if (hasSelections) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
        <CheckCircle2 className="h-3 w-3" />
        Saved
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
      <AlertCircle className="h-3 w-3" />
      No Selection
    </span>
  );
}

export function AthleteSelectionsPanel({
  programId,
  slots,
}: AthleteSelectionsPanelProps) {
  const queryClient = useQueryClient();
  const [resetTarget, setResetTarget] = useState<AthleteSelectionRecord | null>(
    null,
  );

  const {
    data: athletes = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["athlete-selections", programId],
    queryFn: () => movementSlotService.getAthleteSelections(programId),
    enabled: !!programId,
  });

  const resetMutation = useMutation({
    mutationFn: (userId: string) =>
      movementSlotService.resetAthleteSelections(programId, userId),
    onSuccess: () => {
      toast.success("Movement selections reset");
      queryClient.invalidateQueries({
        queryKey: ["athlete-selections", programId],
      });
      setResetTarget(null);
    },
    onError: () => {
      toast.error("Failed to reset selections");
    },
  });

  // Build lookup: optionId → exerciseName, for each slot
  const optionLookup = new Map<string, string>();
  for (const slot of slots) {
    for (const opt of slot.options) {
      optionLookup.set(opt.id, opt.exerciseName);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
        Failed to load athlete selections.
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center dark:border-gray-600">
        <Users className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500">
          No movement slots defined for this program
        </p>
        <p className="text-xs text-gray-400">
          This program has no movement slots configured yet
        </p>
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-10 text-center dark:border-gray-600">
        <Users className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500">No athlete profiles yet</p>
        <p className="text-xs text-gray-400">
          Athletes who purchase this program will appear here after they set up
          their profile
        </p>
      </div>
    );
  }

  const lockedCount = athletes.filter((a) => a.selectionsLockedAt).length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/50">
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <Users className="h-3.5 w-3.5" />
          <strong className="text-gray-900 dark:text-white">
            {athletes.length}
          </strong>{" "}
          athlete{athletes.length !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <Lock className="h-3.5 w-3.5 text-amber-500" />
          <strong className="text-amber-700 dark:text-amber-400">
            {lockedCount}
          </strong>{" "}
          locked
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
          <LockOpen className="h-3.5 w-3.5 text-green-500" />
          <strong className="text-green-700 dark:text-green-400">
            {athletes.length - lockedCount}
          </strong>{" "}
          unlocked
        </span>
      </div>

      {/* Athlete cards */}
      <div className="space-y-3">
        {athletes.map((athlete) => {
          const isLocked = !!athlete.selectionsLockedAt;

          return (
            <div
              key={athlete.userId}
              className={cn(
                "rounded-lg border bg-white dark:bg-gray-800",
                isLocked
                  ? "border-amber-200 dark:border-amber-800/40"
                  : "border-gray-200 dark:border-gray-700",
              )}
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {(athlete.userName ??
                      athlete.userEmail ??
                      "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {athlete.userName ?? athlete.userEmail ?? "—"}
                    </p>
                    {athlete.userName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {athlete.userEmail}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <SelectionStatus record={athlete} />
                  {isLocked && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setResetTarget(athlete)}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </Button>
                  )}
                </div>
              </div>

              {/* Selections grid */}
              <div className="px-4 py-3">
                {athlete.movementSelections &&
                Object.keys(athlete.movementSelections).length > 0 ? (
                  <div className="space-y-2">
                    {slots
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((slot) => {
                        const selectedOptionId =
                          athlete.movementSelections?.[slot.id];
                        const selectedName = selectedOptionId
                          ? optionLookup.get(selectedOptionId)
                          : null;

                        return (
                          <div
                            key={slot.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                                  CATEGORY_COLORS[slot.category] ??
                                    CATEGORY_COLORS.OTHER,
                                )}
                              >
                                {slot.category}
                              </span>
                              <span className="text-xs text-gray-600 dark:text-gray-400">
                                {slot.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {selectedName ? (
                                <span className="rounded bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                  {selectedName}
                                </span>
                              ) : (
                                <span className="text-xs italic text-gray-400">
                                  not set
                                </span>
                              )}
                              {selectedOptionId &&
                                (() => {
                                  const opt = slot.options.find(
                                    (o) => o.id === selectedOptionId,
                                  );
                                  return opt?.isDefault ? (
                                    <span className="text-[10px] text-gray-400">
                                      (default)
                                    </span>
                                  ) : null;
                                })()}
                            </div>
                          </div>
                        );
                      })}

                    {/* Plates toggle */}
                    <div className="flex items-center justify-between gap-3 border-t border-dashed border-gray-100 pt-2 dark:border-gray-700">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        1.25 kg plates
                      </span>
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-medium",
                          athlete.has125kgPlates
                            ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                            : "bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
                        )}
                      >
                        {athlete.has125kgPlates ? "Available" : "Not available"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs italic text-gray-400">
                    No selections saved yet
                  </p>
                )}

                {/* Lock info */}
                {isLocked && athlete.selectionsLockedAt && (
                  <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-500">
                    Locked since {formatDate(athlete.selectionsLockedAt)} (first
                    workout logged)
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset confirm modal */}
      <ConfirmModal
        open={!!resetTarget}
        title="Reset movement selections"
        message={`This will clear ${resetTarget?.userName ?? resetTarget?.userEmail}'s movement selections and unlock them so they can re-choose. Their workout logs are not affected.`}
        confirmLabel="Reset"
        variant="danger"
        isLoading={resetMutation.isPending}
        onConfirm={() => {
          if (resetTarget) resetMutation.mutate(resetTarget.userId);
        }}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
