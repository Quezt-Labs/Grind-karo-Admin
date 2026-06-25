import { memo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { TableCell, TableRow } from "@/components/ui/ShadTable";
import { programService } from "@/services/programService";
import type { ExerciseRow, UpdateExerciseRowPayload } from "@/types/programs";
import {
  CATEGORY_COLORS,
  CATEGORY_BORDER,
  formatPercent,
} from "./programConstants";
import { ExerciseSetsPanel } from "./ExerciseSetsPanel";
import { useProgramPreview } from "./useProgramPreview";
import { InlineMetricCell } from "./InlineMetricCell";
import {
  parseLoadInput,
  parsePercentInput,
  parseSetsInput,
  percentBasisToInput,
} from "./inlineRowFieldParsers";

interface ExerciseTableRowProps {
  programId: string;
  row: ExerciseRow;
  dayExercises: ExerciseRow[];
  index: number;
  compact?: boolean;
  cellPy?: string;
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
  onEdit,
  onDelete,
  onRefresh,
}: ExerciseTableRowProps) {
  const preview = useProgramPreview();
  const hasSets = (row.exerciseSets?.length ?? 0) > 0;
  const [expanded, setExpanded] = useState(hasSets);

  const updateMut = useMutation({
    mutationFn: (payload: UpdateExerciseRowPayload) =>
      programService.updateExerciseRow(programId, row.id, payload),
    onSuccess: () => onRefresh(),
    onError: () => toast.error("Failed to update exercise row"),
  });

  function patchRow(payload: UpdateExerciseRowPayload) {
    updateMut.mutate(payload);
  }

  const previewRow = preview?.enabled
    ? preview.getPreviewRow(dayExercises, row.id)
    : null;

  if (previewRow?.hidden) return null;

  const previewLoad = previewRow?.load ?? null;
  const displayLoad = previewLoad ?? row.loadKg ?? row.computedLoadKg ?? null;
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
  const loadInput = row.loadKg != null ? String(row.loadKg) : "";
  const isSaving = updateMut.isPending;
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
            : "hover:bg-blue-50/30 dark:hover:bg-gray-750",
          "border-t border-[#e8eaed] dark:border-gray-700/60",
        )}
      >
        <TableCell className={cn(cellPy, "pl-2")}>
          <span
            className={cn(
              "font-mono text-xs",
              isAccessory ? "text-gray-400" : "text-gray-500",
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
        {!compact && (
          <TableCell className="py-2.5">
            <span
              className={cn(
                "inline-block rounded-md px-2 py-1 text-xs font-semibold",
                CATEGORY_COLORS[row.category] || CATEGORY_COLORS.OTHER,
              )}
            >
              {row.category}
            </span>
          </TableCell>
        )}
        <TableCell className={cn(cellPy, "px-1")}>
          <InlineMetricCell
            value={setsInput}
            isSaving={isSaving}
            onCommit={(raw) => {
              const parsed = parseSetsInput(raw);
              if (parsed === undefined) {
                toast.error("Sets must be a whole number");
                return;
              }
              patchRow({ sets: parsed });
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
            onCommit={(raw) => patchRow({ repScheme: raw.trim() || null })}
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
            onCommit={(raw) => patchRow({ targetRpe: raw.trim() || null })}
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
              patchRow({ percentOneRm: parsed });
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
              patchRow({ loadKg: parsed });
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
        />
      )}
    </>
  );
});
