import { memo } from "react";
import { Dumbbell } from "lucide-react";
import type { ExerciseRow } from "@/types/programs";
import { ExerciseTableRow } from "./ExerciseTableRow";
import { InlineExerciseRow } from "./InlineExerciseRow";

interface ExerciseTableProps {
  programId: string;
  dayId: string;
  exercises: ExerciseRow[];
  nextSortOrder: number;
  onEditExercise: (row: ExerciseRow) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
}

export const ExerciseTable = memo(function ExerciseTable({
  programId,
  dayId,
  exercises,
  nextSortOrder,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
}: ExerciseTableProps) {
  return (
    <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="sticky top-0 z-10 bg-gray-50/95 text-left backdrop-blur-sm dark:bg-gray-800/95">
            <th className="w-10 border-b border-gray-200 py-3 pl-4 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              #
            </th>
            <th className="min-w-52 border-b border-gray-200 py-3 pl-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              Exercise
            </th>
            <th className="w-28 border-b border-gray-200 py-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              Category
            </th>
            <th className="w-16 border-b border-gray-200 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              Sets
            </th>
            <th className="w-24 border-b border-gray-200 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              Reps
            </th>
            <th className="w-20 border-b border-gray-200 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              RPE
            </th>
            <th className="w-20 border-b border-gray-200 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              %1RM
            </th>
            <th className="w-28 border-b border-gray-200 py-3 text-center text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:border-gray-600 dark:text-emerald-400">
              Load (kg)
            </th>
            <th className="w-20 border-b border-gray-200 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400 dark:border-gray-600 dark:text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {exercises.length === 0 && (
            <tr>
              <td colSpan={9} className="py-8 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Dumbbell className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                  <p className="text-xs text-gray-400">No exercises yet</p>
                  <p className="text-[10px] text-gray-400">
                    Click &quot;+ Add Exercise&quot; below to start
                  </p>
                </div>
              </td>
            </tr>
          )}
          {exercises
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((row, i) => (
              <ExerciseTableRow
                key={row.id}
                row={row}
                index={i}
                onEdit={() => onEditExercise(row)}
                onDelete={() => onDeleteExercise(row)}
              />
            ))}
          <InlineExerciseRow
            programId={programId}
            dayId={dayId}
            nextSortOrder={nextSortOrder}
            onSuccess={onRefresh}
          />
        </tbody>
      </table>
    </div>
  );
});
