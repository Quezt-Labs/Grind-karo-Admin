import { Plus } from "lucide-react";
import type { Day } from "@/types/programs";
import { Button } from "@/components/ui/Button";
import { TreeNodeActions } from "./TreeNodeActions";
import type { ProgramDayLocation } from "./programStructureUtils";

export interface ProgramDayHeaderProps {
  selection: ProgramDayLocation;
  weekRangeLabel: string | null;
  nextSortOrder: number;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onAddExercise: (
    dayId: string,
    dayExercises: Day["exercises"],
    nextSortOrder: number,
  ) => void;
}

export function ProgramDayHeader({
  selection,
  weekRangeLabel,
  nextSortOrder,
  onEditDay,
  onDeleteDay,
  onAddExercise,
}: ProgramDayHeaderProps) {
  const { week, day } = selection;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
      <div className="min-w-0 w-full flex-1 sm:w-auto">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {week.title}
          {weekRangeLabel ? ` · ${weekRangeLabel}` : ""}
        </p>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {day.title}
        </h3>
        {day.focus && (
          <p className="mt-0.5 text-sm text-gray-500">{day.focus}</p>
        )}
      </div>
      <TreeNodeActions
        onEdit={() => onEditDay(day)}
        editTitle="Edit day"
        onDelete={() => onDeleteDay(day)}
        deleteTitle="Delete day"
        size="md"
      />
      <Button
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => onAddExercise(day.id, day.exercises, nextSortOrder)}
      >
        <Plus className="h-4 w-4" />
        Add exercise
      </Button>
    </div>
  );
}
