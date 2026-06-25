import { useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { TableCell, TableRow } from "@/components/ui/ShadTable";
import { programService } from "@/services/programService";
import type { ExerciseSet, CreateExerciseSetPayload } from "@/types/programs";

interface ExerciseSetsProps {
  programId: string;
  exerciseRowId: string;
  sets: ExerciseSet[];
  onRefresh: () => void;
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
  return isNaN(n) ? null : n;
}

function parseIntVal(v: string): number | null {
  const n = window.parseInt(v, 10);
  return isNaN(n) ? null : n;
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

function setToState(s: ExerciseSet): SetRowState {
  return {
    percentOneRm: s.percentOneRm != null ? String(s.percentOneRm) : "",
    reps: s.reps != null ? String(s.reps) : "",
    repScheme: s.repScheme ?? "",
    targetRpe: s.targetRpe != null ? String(s.targetRpe) : "",
    absoluteWeightKg:
      s.absoluteWeightKg != null ? String(s.absoluteWeightKg) : "",
    notes: s.notes ?? "",
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

export function ExerciseSetsPanel({
  programId,
  exerciseRowId,
  sets,
  onRefresh,
}: ExerciseSetsProps) {
  const qc = useQueryClient();
  const [newRow, setNewRow] = useState<SetRowState>(emptyRow());
  const [editId, setEditId] = useState<string | null>(null);
  const [editState, setEditState] = useState<SetRowState>(emptyRow());
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

  const updateMut = useMutation({
    mutationFn: ({
      setId,
      payload,
    }: {
      setId: string;
      payload: CreateExerciseSetPayload;
    }) =>
      programService.updateExerciseSet(
        programId,
        exerciseRowId,
        setId,
        payload,
      ),
    onSuccess: () => {
      toast.success("Set updated");
      setEditId(null);
      refresh();
    },
    onError: () => toast.error("Failed to update set"),
  });

  const deleteMut = useMutation({
    mutationFn: (setId: string) =>
      programService.removeExerciseSet(programId, exerciseRowId, setId),
    onSuccess: () => {
      toast.success("Set deleted");
      refresh();
    },
    onError: () => toast.error("Failed to delete set"),
  });

  const sortedSets = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const nextSetNumber =
    sortedSets.length > 0
      ? Math.max(...sortedSets.map((s) => s.setNumber)) + 1
      : 1;

  function handleSaveNew() {
    createMut.mutate(rowToPayload(nextSetNumber, newRow));
  }

  function handleSaveEdit(setId: string, setNumber: number) {
    updateMut.mutate({ setId, payload: rowToPayload(setNumber, editState) });
  }

  return (
    <TableRow className="bg-gray-50/70 hover:bg-gray-50/70 dark:bg-gray-700/30 dark:hover:bg-gray-700/30">
      <TableCell colSpan={9} className="px-4 py-2">
        <div className="space-y-1">
          {/* Column headers */}
          <div className="grid grid-cols-[32px_64px_56px_72px_56px_72px_1fr_64px] gap-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {COL_HEADERS.map((h, i) => (
              <span
                key={i}
                className={i === 0 ? "text-center" : i < 7 ? "text-center" : ""}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Existing set rows */}
          {sortedSets.map((set) =>
            editId === set.id ? (
              <div
                key={set.id}
                className="grid grid-cols-[32px_64px_56px_72px_56px_72px_1fr_64px] items-center gap-1"
              >
                <span className="text-center text-xs font-mono text-gray-500">
                  {set.setNumber}
                </span>
                <input
                  className={INPUT_CLS}
                  placeholder="82.5"
                  value={editState.percentOneRm}
                  onChange={(e) =>
                    setEditState({ ...editState, percentOneRm: e.target.value })
                  }
                />
                <input
                  className={INPUT_CLS}
                  placeholder="3"
                  value={editState.reps}
                  onChange={(e) =>
                    setEditState({ ...editState, reps: e.target.value })
                  }
                />
                <input
                  className={INPUT_CLS}
                  placeholder="AMRAP"
                  value={editState.repScheme}
                  onChange={(e) =>
                    setEditState({ ...editState, repScheme: e.target.value })
                  }
                />
                <input
                  className={INPUT_CLS}
                  placeholder="8.5"
                  value={editState.targetRpe}
                  onChange={(e) =>
                    setEditState({ ...editState, targetRpe: e.target.value })
                  }
                />
                <input
                  className={INPUT_CLS}
                  placeholder="60.0"
                  value={editState.absoluteWeightKg}
                  onChange={(e) =>
                    setEditState({
                      ...editState,
                      absoluteWeightKg: e.target.value,
                    })
                  }
                />
                <input
                  className={INPUT_CLS}
                  placeholder="Coach note"
                  value={editState.notes}
                  onChange={(e) =>
                    setEditState({ ...editState, notes: e.target.value })
                  }
                />
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleSaveEdit(set.id, set.setNumber)}
                    disabled={updateMut.isPending}
                    className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    title="Save"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={set.id}
                className="grid grid-cols-[32px_64px_56px_72px_56px_72px_1fr_64px] items-center gap-1 rounded px-0.5 hover:bg-white dark:hover:bg-gray-700/50"
              >
                <span className="text-center font-mono text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {set.setNumber}
                </span>
                <span className="text-center font-mono text-xs text-indigo-700 dark:text-indigo-400">
                  {set.percentOneRm != null ? `${set.percentOneRm}%` : "–"}
                </span>
                <span className="text-center font-mono text-xs text-gray-700 dark:text-gray-300">
                  {set.reps ?? "–"}
                </span>
                <span className="text-center font-mono text-xs text-gray-500 dark:text-gray-400">
                  {set.repScheme || "–"}
                </span>
                <span className="text-center font-mono text-xs text-amber-700 dark:text-amber-400">
                  {set.targetRpe != null ? `@${set.targetRpe}` : "–"}
                </span>
                <span className="text-center font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  {set.absoluteWeightKg != null
                    ? `${set.absoluteWeightKg} kg`
                    : "–"}
                </span>
                <span className="truncate text-xs text-gray-400 italic">
                  {set.notes || ""}
                </span>
                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setEditId(set.id);
                      setEditState(setToState(set));
                    }}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-600"
                    title="Edit set"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => deleteMut.mutate(set.id)}
                    disabled={deleteMut.isPending}
                    className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    title="Delete set"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ),
          )}

          {/* New set row */}
          {addingNew ? (
            <div className="grid grid-cols-[32px_64px_56px_72px_56px_72px_1fr_64px] items-center gap-1">
              <span className="text-center font-mono text-xs text-gray-400">
                {nextSetNumber}
              </span>
              <input
                className={INPUT_CLS}
                placeholder="100.0"
                value={newRow.percentOneRm}
                onChange={(e) =>
                  setNewRow({ ...newRow, percentOneRm: e.target.value })
                }
                autoFocus
              />
              <input
                className={INPUT_CLS}
                placeholder="2"
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
                placeholder="9.0"
                value={newRow.targetRpe}
                onChange={(e) =>
                  setNewRow({ ...newRow, targetRpe: e.target.value })
                }
              />
              <input
                className={INPUT_CLS}
                placeholder="–"
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
                  onClick={handleSaveNew}
                  disabled={createMut.isPending}
                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  title="Save set"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
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
