import { memo } from "react";
import { Dumbbell, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/ShadTable";
import type { ExerciseRow } from "@/types/programs";
import { ExerciseTableRow } from "./ExerciseTableRow";

interface ExerciseTableProps {
  programId: string;
  dayId: string;
  exercises: ExerciseRow[];
  compact?: boolean;
  onAddExercise: () => void;
  onEditExercise: (
    row: ExerciseRow,
    dayId: string,
    dayExercises: ExerciseRow[],
  ) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
}

export const ExerciseTable = memo(function ExerciseTable({
  programId,
  dayId,
  exercises,
  compact = false,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
}: ExerciseTableProps) {
  const cellPy = compact ? "py-1.5" : "py-3";
  const headPy = compact ? "py-1.5" : "py-3";
  const textSize = compact ? "text-xs" : "text-sm";
  const colSpan = compact ? 8 : 9;

  return (
    <div className="border-t border-[#e0e0e0] dark:border-gray-700">
      <Table className={cn(textSize)}>
        <TableHeader>
          <TableRow className="sticky top-0 z-10 border-b border-[#e0e0e0] bg-[#f8f9fa]/95 backdrop-blur-sm hover:bg-[#f8f9fa]/95 dark:border-gray-600 dark:bg-gray-800/95 dark:hover:bg-gray-800/95">
            <TableHead
              className={cn(
                "h-auto w-8 border-b-0 pl-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            >
              #
            </TableHead>
            <TableHead
              className={cn(
                "h-auto min-w-36 border-b-0 pl-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            >
              Exercise
            </TableHead>
            {!compact && (
              <TableHead
                className={cn(
                  "h-auto w-28 border-b-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                  headPy,
                )}
              >
                Category
              </TableHead>
            )}
            <TableHead
              className={cn(
                "h-auto w-12 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            >
              Sets
            </TableHead>
            <TableHead
              className={cn(
                "h-auto w-16 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            >
              Reps
            </TableHead>
            <TableHead
              className={cn(
                "h-auto w-12 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            >
              RPE
            </TableHead>
            <TableHead
              className={cn(
                "h-auto w-12 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            >
              %
            </TableHead>
            <TableHead
              className={cn(
                "h-auto w-16 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400",
                headPy,
              )}
            >
              Load
            </TableHead>
            <TableHead
              className={cn(
                "h-auto w-14 border-b-0 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500",
                headPy,
              )}
            />
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.length === 0 && (
            <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
              <TableCell colSpan={compact ? 8 : 9} className="py-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Dumbbell className="h-5 w-5 text-gray-300 dark:text-gray-600" />
                  <p className="text-[10px] text-gray-400">No exercises</p>
                </div>
              </TableCell>
            </TableRow>
          )}
          {exercises
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((row, i) => (
              <ExerciseTableRow
                key={row.id}
                programId={programId}
                row={row}
                dayExercises={exercises}
                index={i}
                compact={compact}
                cellPy={cellPy}
                onEdit={() => onEditExercise(row, dayId, exercises)}
                onDelete={() => onDeleteExercise(row)}
                onRefresh={onRefresh}
              />
            ))}
          <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
            <TableCell colSpan={colSpan} className="py-3">
              <button
                type="button"
                onClick={onAddExercise}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-primary-600 transition-colors hover:border-primary-400 hover:bg-primary-50 dark:border-gray-600 dark:text-primary-400 dark:hover:border-primary-600 dark:hover:bg-primary-900/20"
              >
                <Plus className="h-4 w-4" />
                Add Exercise
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
});
