import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { movementSlotService } from "@/services/movementSlotService";
import type {
  MovementOption,
  MovementOptionOverride,
  ExerciseRow,
  OverrideUpsertPayload,
  LoadComputation,
} from "@/types/programs";

const LOAD_COMP_OPTIONS = [
  "RPE_CHART",
  "PERCENT_1RM",
  "PERCENT_OF_ROW",
  "NONE",
] as const;

const INHERIT_LOAD_COMP = "__inherit__";

interface OverrideEditorProps {
  option: MovementOption;
  linkedRows: ExerciseRow[];
  onClose: () => void;
  onSuccess: () => void;
}

type RowOverride = {
  programExerciseId: string;
  sets: string;
  repScheme: string;
  targetRpe: string;
  percentOneRm: string;
  loadComputation: string;
  loadRefFactor: string;
  loadRefExerciseId: string;
  loadNote: string;
  notes: string;
};

function buildInitialOverrides(
  linkedRows: ExerciseRow[],
  existing: MovementOptionOverride[],
): RowOverride[] {
  const byId = new Map(existing.map((o) => [o.programExerciseId, o]));
  return linkedRows.map((r) => {
    const ov = byId.get(r.id);
    return {
      programExerciseId: r.id,
      sets: ov?.sets != null ? String(ov.sets) : "",
      repScheme: ov?.repScheme ?? "",
      targetRpe: ov?.targetRpe ?? "",
      percentOneRm:
        ov?.percentOneRm != null ? String(ov.percentOneRm / 100) : "",
      loadComputation: ov?.loadComputation ?? "",
      loadRefFactor: ov?.loadRefFactor != null ? String(ov.loadRefFactor) : "",
      loadRefExerciseId: ov?.loadRefExerciseId ?? "",
      loadNote: ov?.loadNote ?? "",
      notes: ov?.notes ?? "",
    };
  });
}

export function OverrideEditor({
  option,
  linkedRows,
  onClose,
  onSuccess,
}: OverrideEditorProps) {
  const [overrides, setOverrides] = useState<RowOverride[]>(() =>
    buildInitialOverrides(linkedRows, option.overrides),
  );

  const rowLookup = useMemo(
    () => new Map(linkedRows.map((r) => [r.id, r])),
    [linkedRows],
  );

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: OverrideUpsertPayload[] = overrides
        .filter((o) => {
          // only send rows that have at least one non-empty field
          return (
            o.sets !== "" ||
            o.repScheme !== "" ||
            o.targetRpe !== "" ||
            o.percentOneRm !== "" ||
            o.loadComputation !== "" ||
            o.loadNote !== "" ||
            o.notes !== ""
          );
        })
        .map((o) => ({
          programExerciseId: o.programExerciseId,
          sets: o.sets !== "" ? parseInt(o.sets) : null,
          repScheme: o.repScheme || null,
          targetRpe: o.targetRpe || null,
          percentOneRm: o.percentOneRm
            ? Math.round(parseFloat(o.percentOneRm) * 100)
            : null,
          loadComputation: (o.loadComputation ||
            null) as LoadComputation | null,
          loadRefFactor: o.loadRefFactor ? parseFloat(o.loadRefFactor) : null,
          loadRefExerciseId: o.loadRefExerciseId || null,
          loadNote: o.loadNote || null,
          notes: o.notes || null,
        }));
      return movementSlotService.upsertOverrides(option.id, payload);
    },
    onSuccess: () => {
      toast.success("Overrides saved");
      onSuccess();
    },
    onError: () => {
      toast.error("Failed to save overrides");
    },
  });

  function updateField(idx: number, field: keyof RowOverride, value: string) {
    setOverrides((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-5xl flex-col rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Overrides for: {option.exerciseName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leave blank to inherit base row values. Set sets to 0 to hide the
              row.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {linkedRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              No exercise rows are linked to this slot yet.
            </p>
          ) : (
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="text-left hover:bg-transparent dark:hover:bg-transparent">
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    Row
                  </TableHead>
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    Sets
                  </TableHead>
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    Reps
                  </TableHead>
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    RPE
                  </TableHead>
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    %1RM
                  </TableHead>
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    Load Strategy
                  </TableHead>
                  <TableHead className="h-auto pb-2 pr-2 font-semibold text-gray-500 dark:text-gray-400">
                    Notes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overrides.map((o, idx) => {
                  const baseRow = rowLookup.get(o.programExerciseId);
                  const name =
                    baseRow?.resolvedName ||
                    baseRow?.exerciseNameOverride ||
                    o.programExerciseId.slice(0, 8);
                  const isHidden = o.sets === "0";

                  return (
                    <TableRow
                      key={o.programExerciseId}
                      className={
                        isHidden
                          ? "bg-red-50/50 dark:bg-red-900/10"
                          : "odd:bg-gray-50/50 dark:odd:bg-gray-750/50"
                      }
                    >
                      <TableCell className="py-1.5 pr-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {name}
                        </span>
                        {isHidden && (
                          <span className="ml-1 text-[10px] text-red-500">
                            (hidden)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 pr-2">
                        <input
                          type="number"
                          min={0}
                          className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          placeholder={String(baseRow?.sets ?? "—")}
                          value={o.sets}
                          onChange={(e) =>
                            updateField(idx, "sets", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="py-1.5 pr-2">
                        <input
                          className="w-16 rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          placeholder={baseRow?.repScheme ?? "—"}
                          value={o.repScheme}
                          onChange={(e) =>
                            updateField(idx, "repScheme", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="py-1.5 pr-2">
                        <input
                          className="w-14 rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          placeholder={baseRow?.targetRpe ?? "—"}
                          value={o.targetRpe}
                          onChange={(e) =>
                            updateField(idx, "targetRpe", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="py-1.5 pr-2">
                        <input
                          type="number"
                          step={0.5}
                          className="w-16 rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          placeholder={
                            baseRow?.percentOneRm
                              ? String(baseRow.percentOneRm / 100)
                              : "—"
                          }
                          value={o.percentOneRm}
                          onChange={(e) =>
                            updateField(idx, "percentOneRm", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell className="py-1.5 pr-2">
                        <Select
                          value={o.loadComputation || INHERIT_LOAD_COMP}
                          onValueChange={(value) =>
                            updateField(
                              idx,
                              "loadComputation",
                              value === INHERIT_LOAD_COMP ? "" : value,
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue placeholder="— inherit —" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={INHERIT_LOAD_COMP}>
                              — inherit —
                            </SelectItem>
                            {LOAD_COMP_OPTIONS.map((lc) => (
                              <SelectItem key={lc} value={lc}>
                                {lc}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1.5">
                        <input
                          className="w-24 rounded-md border border-gray-300 px-1.5 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                          placeholder="notes"
                          value={o.notes}
                          onChange={(e) =>
                            updateField(idx, "notes", e.target.value)
                          }
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMut.mutate()}
            isLoading={saveMut.isPending}
            disabled={linkedRows.length === 0}
          >
            <Save className="mr-1.5 h-4 w-4" />
            Save All
          </Button>
        </div>
      </div>
    </div>
  );
}
