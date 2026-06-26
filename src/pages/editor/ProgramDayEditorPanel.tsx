import type { ExerciseRow } from "@/types/programs";
import { ExerciseTable } from "./ExerciseTable";
import type { ProgramDayLocation } from "./programStructureUtils";

export interface ProgramDayEditorPanelProps {
  programId: string;
  selection: ProgramDayLocation;
  nextSortOrder: number;
  onAddExercise: (
    dayId: string,
    dayExercises: ExerciseRow[],
    nextSortOrder: number,
  ) => void;
  onEditExercise: (
    row: ExerciseRow,
    dayId: string,
    dayExercises: ExerciseRow[],
  ) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
}

export function ProgramDayEditorPanel({
  programId,
  selection,
  nextSortOrder,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
}: ProgramDayEditorPanelProps) {
  const { day } = selection;

  return (
    <div className="overflow-x-auto px-2 pb-4 sm:px-4">
      <ExerciseTable
        programId={programId}
        dayId={day.id}
        exercises={day.exercises}
        blockWeeks={selection.block.weeks}
        currentWeekNumber={selection.week.weekNumber}
        dayNumber={selection.day.dayNumber}
        onAddExercise={() =>
          onAddExercise(day.id, day.exercises, nextSortOrder)
        }
        onEditExercise={(row) => onEditExercise(row, day.id, day.exercises)}
        onDeleteExercise={onDeleteExercise}
        onRefresh={onRefresh}
      />
    </div>
  );
}
