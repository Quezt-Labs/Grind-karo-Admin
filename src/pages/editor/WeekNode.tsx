import { memo } from "react";
import { ChevronDown, ChevronRight, Calendar } from "lucide-react";
import type { ProgramTree, Day, ExerciseRow } from "@/types/programs";
import { TreeNodeActions } from "./TreeNodeActions";
import { DayNode } from "./DayNode";

type WeekTree = ProgramTree["blocks"][number]["weeks"][number];

interface WeekNodeProps {
  programId: string;
  week: WeekTree;
  expanded: boolean;
  onToggle: () => void;
  expandedDays: Set<string>;
  toggleDay: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  onClone: () => void;
  onAddDay: () => void;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onEditExercise: (
    row: ExerciseRow,
    dayId: string,
    dayExercises: ExerciseRow[],
  ) => void;
  onAddExercise: (
    dayId: string,
    dayExercises: ExerciseRow[],
    nextSortOrder: number,
  ) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
}

export const WeekNode = memo(function WeekNode({
  programId,
  week,
  expanded,
  onToggle,
  expandedDays,
  toggleDay,
  onEdit,
  onDelete,
  onClone,
  onAddDay,
  onEditDay,
  onDeleteDay,
  onEditExercise,
  onAddExercise,
  onDeleteExercise,
  onRefresh,
}: WeekNodeProps) {
  const totalExercises = week.days.reduce(
    (acc, d) => acc + d.exercises.length,
    0,
  );

  return (
    <div className="flex w-72 min-w-72 shrink-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-750">
      {/* Week header */}
      <div className="flex flex-col gap-1 border-b border-gray-200 px-3 py-2 sm:flex-row sm:items-center sm:justify-between dark:border-gray-600">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          <Calendar className="h-4 w-4 text-orange-500" />
          <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
            {week.title}
          </span>
          <span className="shrink-0 rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
            {week.days.length} days · {totalExercises} exercises
          </span>
        </button>
        <TreeNodeActions
          onAdd={onAddDay}
          addTitle="Add Day"
          onClone={onClone}
          cloneTitle="Clone Week"
          onEdit={onEdit}
          editTitle="Edit Week"
          onDelete={onDelete}
          deleteTitle="Delete Week"
        />
      </div>

      {expanded && (
        <div className="flex gap-2 overflow-x-auto p-2">
          {week.days.length === 0 ? (
            <div className="py-3 text-center">
              <p className="text-xs text-gray-400">No days yet</p>
              <button
                onClick={onAddDay}
                className="mt-1 text-xs font-medium text-primary-500 hover:text-primary-600"
              >
                + Add Day
              </button>
            </div>
          ) : (
            week.days
              .sort((a, b) => a.dayNumber - b.dayNumber)
              .map((day) => (
                <DayNode
                  key={day.id}
                  programId={programId}
                  day={day}
                  expanded={expandedDays.has(day.id)}
                  onToggle={() => toggleDay(day.id)}
                  onEdit={() => onEditDay(day)}
                  onDelete={() => onDeleteDay(day)}
                  onEditExercise={onEditExercise}
                  onAddExercise={onAddExercise}
                  onDeleteExercise={onDeleteExercise}
                  onRefresh={onRefresh}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
});
