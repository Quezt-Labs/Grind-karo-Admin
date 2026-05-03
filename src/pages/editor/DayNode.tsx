import { memo } from "react";
import { ChevronDown, ChevronRight, Sun } from "lucide-react";
import type { ProgramTree, ExerciseRow } from "@/types/programs";
import { TreeNodeActions } from "./TreeNodeActions";
import { ExerciseTable } from "./ExerciseTable";

type DayTree = ProgramTree["blocks"][number]["weeks"][number]["days"][number];

interface DayNodeProps {
  programId: string;
  day: DayTree;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEditExercise: (row: ExerciseRow) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
}

export const DayNode = memo(function DayNode({
  programId,
  day,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
}: DayNodeProps) {
  const nextSortOrder =
    day.exercises.length > 0
      ? Math.max(...day.exercises.map((e) => e.sortOrder)) + 1
      : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800">
      {/* Day header */}
      <div className="flex items-center justify-between bg-linear-to-r from-yellow-50 to-white px-3 py-2.5 dark:from-yellow-900/5 dark:to-gray-800">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          <Sun className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {day.title}
          </span>
          {day.focus && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              {day.focus}
            </span>
          )}
          <span className="ml-1 text-[10px] text-gray-400">
            {day.exercises.length} exercises
          </span>
          {day.exercises.length > 0 && (
            <span className="text-[10px] text-gray-400">
              · {day.exercises.reduce((a, e) => a + (e.sets ?? 0), 0)} total
              sets
            </span>
          )}
        </button>
        <TreeNodeActions
          onEdit={onEdit}
          editTitle="Edit Day"
          onDelete={onDelete}
          deleteTitle="Delete Day"
        />
      </div>

      {expanded && (
        <ExerciseTable
          programId={programId}
          dayId={day.id}
          exercises={day.exercises}
          nextSortOrder={nextSortOrder}
          onEditExercise={onEditExercise}
          onDeleteExercise={onDeleteExercise}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
});
