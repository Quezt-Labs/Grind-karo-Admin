import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { TableCell, TableRow } from "@/components/ui/ShadTable";
import { programService } from "@/services/programService";
import type {
  ExerciseSet,
  CreateExerciseSetPayload,
  UpdateExerciseSetPayload,
} from "@/types/programs";
import { InlineMetricCell } from "./InlineMetricCell";
import { parseLoadInput, parsePercentInput } from "./inlineRowFieldParsers";

interface ExerciseSetsProps {
  programId: string;
  exerciseRowId: string;
  sets: ExerciseSet[];
  onRefresh: () => void;
  colSpan?: number;
}

interface SetRowState {
  percentOneRm: string;
  reps: string;
  repScheme: string;
  targetRpe: string;
  absoluteWeightKg: string;
  notes: string;
}

function parseNum(v: string): number | null {
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

function parseIntVal(v: string): number | null {
  const n = Number.parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function emptyRow(): SetRowState {
  return {
    percentOneRm: "",
    reps: "",
    repScheme: "",
    targetRpe: "",
    absoluteWeightKg: "",
    notes: "",
  };
}

function rowToPayload(
  setNumber: number,
  state: SetRowState,
): CreateExerciseSetPayload {
  return {
    setNumber,
    percentOneRm: state.percentOneRm ? parseNum(state.percentOneRm) : null,
    reps: state.reps ? parseIntVal(state.reps) : null,
    repScheme: state.repScheme || null,
    targetRpe: state.targetRpe ? parseNum(state.targetRpe) : null,
    absoluteWeightKg: state.absoluteWeightKg
      ? parseNum(state.absoluteWeightKg)
      : null,
    notes: state.notes || null,
  };
}

const INPUT_CLS =
  "w-full rounded border border-gray-200 bg-white px-1.5 py-1 text-center font-mono text-xs focus:border-primary-400 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100";

const COL_HEADERS = [
  "Set",
  "% 1RM",
  "Reps",
  "Scheme",
  "RPE",
  "Abs kg",
  "Notes",
  "",
];

const GRID_CLS =
  "grid grid-cols-[32px_64px_56px_72px_56px_72px_1fr_40px] items-center gap-1";

interface ExerciseSetRowProps {
  programId: string;
  exerciseRowId: string;
  set: ExerciseSet;
  onRefresh: () => void;
}

function ExerciseSetRow({
  programId,
  exerciseRowId,
  set,
  onRefresh,
}: ExerciseSetRowProps) {
  const qc = useQueryClient();

  function refresh() {
    qc.invalidateQueries({ queryKey: ["program-tree", programId] });
    onRefresh();
  }

  const updateMut = useMutation({
    mutationFn: (payload: UpdateExerciseSetPayload) =>
      programService.updateExerciseSet(
        programId,
        exerciseRowId,
        set.id,
        payload,
      ),
    onSuccess: () => refresh(),
    onError: () => toast.error("Failed to update set"),
  });

  const deleteMut = useMutation({
    mutationFn: () =>
      programService.removeExerciseSet(programId, exerciseRowId, set.id),
    onSuccess: () => {
      toast.success("Set deleted");
      refresh();
    },
    onError: () => toast.error("Failed to delete set"),
  });

  const isSaving = updateMut.isPending;

  function patch(payload: UpdateExerciseSetPayload) {
    updateMut.mutate(payload);
  }

  const percentInput = set.percentOneRm != null ? String(set.percentOneRm) : "";
  const repsInput = set.reps != null ? String(set.reps) : "";
  const repSchemeInput = set.repScheme ?? "";
  const targetRpeInput = set.targetRpe != null ? String(set.targetRpe) : "";
  const loadInput =
    set.absoluteWeightKg != null ? String(set.absoluteWeightKg) : "";
  const notesInput = set.notes ?? "";

  return (
    <div
      className={`group ${GRID_CLS} rounded px-0.5 hover:bg-white dark:hover:bg-gray-700/50`}
    >
      <span className="text-center font-mono text-xs font-semibold text-gray-600 dark:text-gray-400">
        {set.setNumber}
      </span>
      <InlineMetricCell
        value={percentInput}
        isSaving={isSaving}
        inputClassName="text-indigo-700 dark:text-indigo-400"
        onCommit={(raw) => {
          const parsed = parsePercentInput(raw);
          if (raw.trim() && parsed === null) {
            toast.error("Enter a valid percent (e.g. 82.5)");
            return;
          }
          patch({ percentOneRm: parsed });
        }}
        display={
          set.percentOneRm != null ? (
            <span className="font-mono text-xs text-indigo-700 dark:text-indigo-400">
              {set.percentOneRm}%
            </span>
          ) : undefined
        }
      />
      <InlineMetricCell
        value={repsInput}
        isSaving={isSaving}
        onCommit={(raw) => {
          const trimmed = raw.trim();
          if (!trimmed) {
            patch({ reps: null });
            return;
          }
          const parsed = parseIntVal(trimmed);
          if (parsed === null) {
            toast.error("Reps must be a whole number");
            return;
          }
          patch({ reps: parsed });
        }}
        display={
          set.reps != null ? (
            <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
              {set.reps}
            </span>
          ) : undefined
        }
      />
      <InlineMetricCell
        value={repSchemeInput}
        isSaving={isSaving}
        onCommit={(raw) => patch({ repScheme: raw.trim() || null })}
        display={
          set.repScheme ? (
            <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
              {set.repScheme}
            </span>
          ) : undefined
        }
      />
      <InlineMetricCell
        value={targetRpeInput}
        isSaving={isSaving}
        onCommit={(raw) => {
          const trimmed = raw.trim().replace(/^@/, "");
          if (!trimmed) {
            patch({ targetRpe: null });
            return;
          }
          const parsed = parseNum(trimmed);
          if (parsed === null) {
            toast.error("RPE must be a number");
            return;
          }
          patch({ targetRpe: parsed });
        }}
        display={
          set.targetRpe != null ? (
            <span className="font-mono text-xs text-amber-700 dark:text-amber-400">
              @{set.targetRpe}
            </span>
          ) : undefined
        }
      />
      <InlineMetricCell
        value={loadInput}
        isSaving={isSaving}
        onCommit={(raw) => {
          const parsed = parseLoadInput(raw);
          if (parsed === undefined) {
            toast.error("Load must be a number (kg)");
            return;
          }
          patch({ absoluteWeightKg: parsed });
        }}
        display={
          set.absoluteWeightKg != null ? (
            <span className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
              {set.absoluteWeightKg} kg
            </span>
          ) : undefined
        }
      />
      <InlineMetricCell
        value={notesInput}
        isSaving={isSaving}
        placeholder=""
        inputClassName="text-left"
        className="text-left!"
        onCommit={(raw) => patch({ notes: raw.trim() || null })}
        display={
          set.notes ? (
            <span className="truncate text-xs italic text-gray-400">
              {set.notes}
            </span>
          ) : undefined
        }
      />
      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={() => deleteMut.mutate()}
          disabled={deleteMut.isPending}
          className="rounded p-1 text-gray-300 opacity-40 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
          title="Delete set"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function ExerciseSetsPanel({
  programId,
  exerciseRowId,
  sets,
  onRefresh,
  colSpan = 9,
}: ExerciseSetsProps) {
  const qc = useQueryClient();
  const [newRow, setNewRow] = useState<SetRowState>(emptyRow());
  const [addingNew, setAddingNew] = useState(false);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["program-tree", programId] });
    onRefresh();
  }

  const createMut = useMutation({
    mutationFn: (payload: CreateExerciseSetPayload) =>
      programService.createExerciseSet(programId, exerciseRowId, payload),
    onSuccess: () => {
      toast.success("Set added");
      setNewRow(emptyRow());
      setAddingNew(false);
      refresh();
    },
    onError: () => toast.error("Failed to add set"),
  });

  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const nextSetNumber =
    sortedSets.length > 0
      ? Math.max(...sortedSets.map((s) => s.setNumber)) + 1
      : 1;

  function handleSaveNew() {
    createMut.mutate(rowToPayload(nextSetNumber, newRow));
  }

  return (
    <TableRow className="bg-gray-50/70 hover:bg-gray-50/70 dark:bg-gray-700/30 dark:hover:bg-gray-700/30">
      <TableCell colSpan={colSpan} className="px-4 py-2">
        <div className="space-y-1">
          <div
            className={`${GRID_CLS} px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400`}
          >
            {COL_HEADERS.map((h, i) => (
              <span
                key={i}
                className={i === 0 ? "text-center" : i < 7 ? "text-center" : ""}
              >
                {h}
              </span>
            ))}
          </div>

          {sortedSets.map((set) => (
            <ExerciseSetRow
              key={set.id}
              programId={programId}
              exerciseRowId={exerciseRowId}
              set={set}
              onRefresh={onRefresh}
            />
          ))}

          {addingNew ? (
            <div className={GRID_CLS}>
              <span className="text-center font-mono text-xs text-gray-400">
                {nextSetNumber}
              </span>
              <input
                className={INPUT_CLS}
                placeholder="82.5"
                value={newRow.percentOneRm}
                onChange={(e) =>
                  setNewRow({ ...newRow, percentOneRm: e.target.value })
                }
                autoFocus
              />
              <input
                className={INPUT_CLS}
                placeholder="3"
                value={newRow.reps}
                onChange={(e) => setNewRow({ ...newRow, reps: e.target.value })}
              />
              <input
                className={INPUT_CLS}
                placeholder="AMRAP"
                value={newRow.repScheme}
                onChange={(e) =>
                  setNewRow({ ...newRow, repScheme: e.target.value })
                }
              />
              <input
                className={INPUT_CLS}
                placeholder="8.5"
                value={newRow.targetRpe}
                onChange={(e) =>
                  setNewRow({ ...newRow, targetRpe: e.target.value })
                }
              />
              <input
                className={INPUT_CLS}
                placeholder="60.0"
                value={newRow.absoluteWeightKg}
                onChange={(e) =>
                  setNewRow({ ...newRow, absoluteWeightKg: e.target.value })
                }
              />
              <input
                className={INPUT_CLS}
                placeholder="Note…"
                value={newRow.notes}
                onChange={(e) =>
                  setNewRow({ ...newRow, notes: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNew();
                }}
              />
              <div className="flex items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={handleSaveNew}
                  disabled={createMut.isPending}
                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  title="Save set"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAddingNew(false);
                    setNewRow(emptyRow());
                  }}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-xs text-gray-400 hover:bg-white hover:text-primary-600 dark:hover:bg-gray-700"
            >
              <Plus className="h-3 w-3" /> Add set
            </button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
