import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { FormModal } from "@/components/ui/FormModal";
import type { ExerciseRow } from "@/types/programs";
import { mergeExerciseRows } from "./mergeExerciseRows";
import {
  exercisePrescription,
  exerciseDisplayName,
} from "./programCompareUtils";

interface MergeExerciseRowsModalProps {
  programId: string;
  rows: ExerciseRow[];
  onClose: () => void;
  onSuccess: () => void;
}

export function MergeExerciseRowsModal({
  programId,
  rows,
  onClose,
  onSuccess,
}: MergeExerciseRowsModalProps) {
  const mergeMut = useMutation({
    mutationFn: () => mergeExerciseRows(programId, rows),
    onSuccess: () => {
      toast.success("Exercises merged into one row with per-set prescription");
      onSuccess();
    },
    onError: () => toast.error("Failed to merge exercises"),
  });

  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const keepName = exerciseDisplayName(sorted[0]!);

  return (
    <FormModal
      title="Merge into one exercise"
      onClose={onClose}
      contentClassName="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {sorted.length} rows of <strong>{keepName}</strong> will become one
          exercise with {sorted.length} per-set prescriptions. The first row is
          kept; others are removed.
        </p>
        <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs dark:border-gray-600 dark:bg-gray-900/40">
          {sorted.map((row, i) => (
            <li
              key={row.id}
              className="flex gap-2 text-gray-700 dark:text-gray-300"
            >
              <span className="shrink-0 font-mono text-gray-400">
                Set {i + 1}
              </span>
              <span>{exercisePrescription(row)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            isLoading={mergeMut.isPending}
            onClick={() => mergeMut.mutate()}
          >
            Merge {sorted.length} rows
          </Button>
        </div>
      </div>
    </FormModal>
  );
}
