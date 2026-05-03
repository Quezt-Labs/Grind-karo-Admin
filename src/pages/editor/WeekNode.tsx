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
  onAddDay: () => void;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onEditExercise: (row: ExerciseRow) => void;
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
  onAddDay,
  onEditDay,
  onDeleteDay,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
}: WeekNodeProps) {
  const totalExercises = week.days.reduce(
    (acc, d) => acc + d.exercises.length,
    0,
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50/50 dark:border-gray-600 dark:bg-gray-750">
      {/* Week header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2 dark:border-gray-600">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          )}
          <Calendar className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {week.title}
          </span>
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
            {week.days.length} days · {totalExercises} exercises
          </span>
        </button>
        <TreeNodeActions
          onAdd={onAddDay}
          addTitle="Add Day"
          onEdit={onEdit}
          editTitle="Edit Week"
          onDelete={onDelete}
          deleteTitle="Delete Week"
        />
      </div>

      {expanded && (
        <div className="space-y-2 p-2">
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
