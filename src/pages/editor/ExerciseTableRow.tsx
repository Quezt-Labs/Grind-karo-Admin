import { memo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Copy, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { TableCell, TableRow } from "@/components/ui/ShadTable";
import { programService } from "@/services/programService";
import type { ExerciseRow, UpdateExerciseRowPayload } from "@/types/programs";
import {
  CATEGORY_COLORS,
  CATEGORY_BORDER,
  CATEGORY_LETTER,
  formatPercent,
} from "./programConstants";
import { ExerciseSetsPanel } from "./ExerciseSetsPanel";
import { PriorWeekCell } from "./PriorWeekCell";
import {
  getPriorWeekExercise,
  type PriorWeekColumn,
} from "./programWeekHistory";
import type { WeekTree } from "./programStructureUtils";
import { useProgramPreview } from "./useProgramPreview";
import { InlineMetricCell } from "./InlineMetricCell";
import {
  parseLoadInput,
  parsePercentInput,
  parseSetsInput,
  percentBasisToInput,
} from "./inlineRowFieldParsers";
import { showPrescriptionPropagationToasts } from "./propagatePrescriptionToast";
import { usePropagateForwardStore } from "@/store/propagateForwardStore";
import {
  getCascadeLoadPatches,
  syncLoadComputationFromPercent,
  withAutoComputedLoad,
} from "@/utils/programEditorLoadSync";

interface ExerciseTableRowProps {
  programId: string;
  row: ExerciseRow;
  dayExercises: ExerciseRow[];
  index: number;
  compact?: boolean;
  cellPy?: string;
  blockWeeks?: WeekTree[];
  dayNumber?: number;
  priorWeekColumns?: PriorWeekColumn[];
  tableColSpan?: number;
  onEdit: () => void;
  onDelete: () => void;
  onRefresh: () => void;
}

export const ExerciseTableRow = memo(function ExerciseTableRow({
  programId,
  row,
  dayExercises,
  index,
  compact = false,
  cellPy = "py-4",
  blockWeeks,
  dayNumber,
  priorWeekColumns,
  tableColSpan = 9,
  onEdit,
  onDelete,
  onRefresh,
}: ExerciseTableRowProps) {
  const preview = useProgramPreview();
  const propagateForward = usePropagateForwardStore((s) => s.enabled);
  const hasSets = (row.exerciseSets?.length ?? 0) > 0;
  const [expanded, setExpanded] = useState(hasSets);

  const updateMut = useMutation({
    mutationFn: (payload: UpdateExerciseRowPayload) =>
      programService.updateExerciseRow(programId, row.id, payload),
    onSuccess: (result) => {
      showPrescriptionPropagationToasts(result.propagated);
      onRefresh();
    },
    onError: () => toast.error("Failed to update exercise row"),
  });

  const cloneMut = useMutation({
    mutationFn: () => programService.cloneExerciseRow(programId, row.id),
    onSuccess: () => {
      toast.success("Exercise cloned");
      onRefresh();
    },
    onError: () => toast.error("Failed to clone exercise"),
  });

  function patchPrescription(payload: UpdateExerciseRowPayload) {
    void (async () => {
      try {
        const syncedPayload = syncLoadComputationFromPercent(row, payload);
        let fullPayload: UpdateExerciseRowPayload = {
          ...syncedPayload,
          propagateForward,
        };
        if (preview?.enabled) {
          fullPayload = {
            ...withAutoComputedLoad(
              dayExercises,
              preview.slots,
              preview.inputs,
              row.id,
              syncedPayload,
            ),
            propagateForward,
          };
        }

        await updateMut.mutateAsync(fullPayload);

        if (preview?.enabled) {
          const cascade = getCascadeLoadPatches(
            dayExercises,
            preview.slots,
            preview.inputs,
            row.id,
            syncedPayload,
          );
          for (const [depId, patch] of cascade) {
            await programService.updateExerciseRow(programId, depId, patch);
          }
          if (cascade.size > 0) onRefresh();
        }
      } catch {
        toast.error("Failed to update exercise row");
      }
    })();
  }

  const previewRow = preview?.enabled
    ? preview.getPreviewRow(dayExercises, row.id)
    : null;

  if (previewRow?.hidden) return null;

  const previewLoad = previewRow?.load ?? null;
  const fixedLoad = row.loadKg != null && row.loadKg > 0 ? row.loadKg : null;
  const displayLoad = previewLoad ?? fixedLoad ?? row.computedLoadKg ?? null;
  const exerciseName =
    previewRow?.resolvedName ??
    (row.resolvedName || row.exerciseNameOverride || "—");
  const displaySets = previewRow?.sets ?? row.sets;
  const displayRepScheme = previewRow?.repScheme ?? row.repScheme;
  const displayTargetRpe = previewRow?.targetRpe ?? row.targetRpe;
  const displayPercentOneRm = previewRow?.percentOneRm ?? row.percentOneRm;
  const setsInput = row.sets != null ? String(row.sets) : "";
  const repSchemeInput = row.repScheme ?? "";
  const targetRpeInput = row.targetRpe ?? "";
  const percentInput = percentBasisToInput(row.percentOneRm);
  const loadInput = fixedLoad != null ? String(fixedLoad) : "";
  const isSaving = updateMut.isPending || cloneMut.isPending;
  const hasNotes =
    (previewRow?.loadNote ?? row.loadNote) || (previewRow?.notes ?? row.notes);
  const isAccessory = row.category === "ACCESSORY" || row.category === "OTHER";

  return (
    <>
      <TableRow
        className={cn(
          "group border-l-3 transition-colors",
          CATEGORY_BORDER[row.category] || CATEGORY_BORDER.OTHER,
          isAccessory
            ? "bg-white hover:bg-gray-50/80 dark:bg-gray-800 dark:hover:bg-gray-750"
            : "hover:bg-blue-50/30 dark:bg-gray-800/40 dark:hover:bg-gray-750",
          "border-t border-gray-200 dark:border-gray-700/60",
        )}
      >
        <TableCell className={cn(cellPy, "pl-2")}>
          <span
            className={cn(
              "font-mono text-xs",
              isAccessory
                ? "text-gray-400 dark:text-gray-500"
                : "text-gray-500 dark:text-gray-400",
            )}
          >
            {index + 1}
          </span>
        </TableCell>
        <TableCell className={cn(cellPy, "pl-1")}>
          <div className="flex items-center gap-1">
            {row.movementSlotId && (
              <span
                className="inline-flex shrink-0 text-[10px]"
                title="Linked to movement slot"
              >
                🔀
              </span>
            )}
            <span
              className={cn(
                "font-medium leading-tight",
                compact ? "text-xs" : "text-sm",
                isAccessory
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-900 dark:text-white",
              )}
            >
              {exerciseName}
            </span>
          </div>
          {hasNotes && !compact && (
            <p className="mt-1 text-xs leading-tight text-gray-400 dark:text-gray-500">
              {(previewRow?.loadNote ?? row.loadNote) && (
                <span className="italic">
                  {previewRow?.loadNote ?? row.loadNote}
                </span>
              )}
              {(previewRow?.loadNote ?? row.loadNote) &&
                (previewRow?.notes ?? row.notes) && <span> · </span>}
              {(previewRow?.notes ?? row.notes) && (
                <span>{previewRow?.notes ?? row.notes}</span>
              )}
            </p>
          )}
        </TableCell>
        {priorWeekColumns?.map((col, colIndex) => (
          <PriorWeekCell
            key={col.weekNumber}
            weekLabel={col.label}
            row={
              blockWeeks && dayNumber != null
                ? getPriorWeekExercise(
                    blockWeeks,
                    col.weekNumber,
                    dayNumber,
                    row.prescriptionSlotId ?? index,
                  )
                : null
            }
            currentRow={row}
            isLastInGroup={colIndex === priorWeekColumns.length - 1}
            cellPy={cellPy}
          />
        ))}
        {!compact && (
          <TableCell className="py-2.5 text-center">
            <span
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold",
                CATEGORY_COLORS[row.category] || CATEGORY_COLORS.OTHER,
              )}
              title={row.category}
            >
              {CATEGORY_LETTER[row.category] || CATEGORY_LETTER.OTHER}
            </span>
          </TableCell>
        )}
        <TableCell
          className={cn(
            cellPy,
            "px-1",
            priorWeekColumns?.length &&
              "border-l-2 border-l-primary-200 dark:border-l-primary-800",
          )}
        >
          <InlineMetricCell
            value={setsInput}
            isSaving={isSaving}
            onCommit={(raw) => {
              const parsed = parseSetsInput(raw);
              if (parsed === undefined) {
                toast.error("Sets must be a whole number");
                return;
              }
              patchPrescription({ sets: parsed });
            }}
            display={
              displaySets != null ? (
                <span
                  className={cn(
                    "font-mono text-sm",
                    isAccessory
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-gray-800 dark:text-gray-200",
                  )}
                >
                  {displaySets}
                </span>
              ) : undefined
            }
          />
        </TableCell>
        <TableCell className={cn(cellPy, "px-1")}>
          <InlineMetricCell
            value={repSchemeInput}
            isSaving={isSaving}
            onCommit={(raw) =>
              patchPrescription({ repScheme: raw.trim() || null })
            }
            display={
              displayRepScheme ? (
                <span
                  className={cn(
                    "font-mono text-sm",
                    isAccessory
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-gray-800 dark:text-gray-200",
                  )}
                >
                  {displayRepScheme}
                </span>
              ) : undefined
            }
          />
        </TableCell>
        <TableCell className={cn(cellPy, "px-1")}>
          <InlineMetricCell
            value={targetRpeInput}
            isSaving={isSaving}
            onCommit={(raw) =>
              patchPrescription({ targetRpe: raw.trim() || null })
            }
            display={
              displayTargetRpe ? (
                <span
                  className={cn(
                    "inline-block rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                    !isAccessory &&
                      "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                    isAccessory && "text-gray-500 dark:text-gray-400",
                  )}
                >
                  {displayTargetRpe}
                </span>
              ) : undefined
            }
          />
        </TableCell>
        <TableCell className={cn(cellPy, "px-1")}>
          <InlineMetricCell
            value={percentInput}
            isSaving={isSaving}
            onCommit={(raw) => {
              const parsed = parsePercentInput(raw);
              if (raw.trim() && parsed === null) {
                toast.error("Enter a valid percent (e.g. 53 or 53%)");
                return;
              }
              patchPrescription({ percentOneRm: parsed });
            }}
            display={
              displayPercentOneRm ? (
                <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
                  {formatPercent(displayPercentOneRm)}
                </span>
              ) : undefined
            }
          />
        </TableCell>
        <TableCell className={cn(cellPy, "px-1")}>
          <InlineMetricCell
            value={loadInput}
            isSaving={isSaving}
            onCommit={(raw) => {
              const parsed = parseLoadInput(raw);
              if (parsed === undefined) {
                toast.error("Load must be a number (kg)");
                return;
              }
              updateMut.mutate({ loadKg: parsed });
            }}
            display={
              displayLoad != null ? (
                <span
                  className={cn(
                    "font-mono font-bold text-emerald-700 dark:text-emerald-400",
                    compact ? "text-xs" : "text-sm",
                  )}
                >
                  {displayLoad}
                  <span className="ml-0.5 text-[10px] font-normal text-emerald-600/70 dark:text-emerald-400/70">
                    kg
                  </span>
                </span>
              ) : undefined
            }
          />
        </TableCell>
        <TableCell className={cellPy}>
          <div className="flex items-center justify-center gap-0.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className={cn(
                "rounded p-1 transition-colors",
                expanded
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600",
              )}
              title={expanded ? "Hide per-set config" : "Show per-set config"}
            >
              {expanded ? (
                <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              ) : (
                <ChevronRight className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
              )}
            </button>
            <div className="flex items-center gap-0.5 opacity-100 sm:opacity-60 sm:group-hover:opacity-100">
              <button
                onClick={() => cloneMut.mutate()}
                disabled={cloneMut.isPending}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-gray-600 dark:hover:text-primary-400 disabled:opacity-50"
                title="Clone exercise"
              >
                <Copy className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
              <button
                onClick={onEdit}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200"
                title="Edit exercise"
              >
                <Pencil className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
              <button
                onClick={onDelete}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                title="Delete exercise"
              >
                <Trash2 className={compact ? "h-3 w-3" : "h-4 w-4"} />
              </button>
            </div>
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <ExerciseSetsPanel
          programId={programId}
          exerciseRowId={row.id}
          sets={row.exerciseSets ?? []}
          onRefresh={onRefresh}
          colSpan={tableColSpan}
        />
      )}
    </>
  );
});
