import { cn } from "@/utils/cn";
import { TableCell } from "@/components/ui/ShadTable";
import type { ExerciseRow } from "@/types/programs";
import {
  exercisePrescriptionLines,
  exercisePrescriptionShort,
  priorWeekCellTitle,
  prescriptionsMatch,
} from "./programWeekHistory";

interface PriorWeekCellProps {
  weekLabel: string;
  row: ExerciseRow | null;
  currentRow: ExerciseRow;
  isLastInGroup?: boolean;
  cellPy?: string;
}

export function PriorWeekCell({
  weekLabel,
  row,
  currentRow,
  isLastInGroup = false,
  cellPy = "py-2",
}: PriorWeekCellProps) {
  const lines = row ? exercisePrescriptionLines(row) : null;
  const empty = !lines || (!lines.volume && !lines.intensity);
  const unchanged = row ? prescriptionsMatch(row, currentRow) : false;

  return (
    <TableCell
      className={cn(
        "w-[4.25rem] min-w-[4.25rem] border-b-0 bg-slate-50/90 px-1.5 py-2 align-top dark:bg-slate-900/40",
        isLastInGroup &&
          "border-r-2 border-r-slate-200 dark:border-r-slate-600",
        !empty && !unchanged && "bg-amber-50/70 dark:bg-amber-950/25",
        cellPy,
      )}
      title={priorWeekCellTitle(weekLabel, row)}
    >
      {empty ? (
        <span className="block text-center font-mono text-[11px] text-gray-300 dark:text-gray-600">
          —
        </span>
      ) : (
        <div className="flex flex-col items-center gap-0.5 leading-none">
          {lines.volume && (
            <span className="font-mono text-[11px] font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {lines.volume}
            </span>
          )}
          {lines.intensity && (
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                lines.intensity.includes("kg")
                  ? "font-medium text-emerald-700 dark:text-emerald-400"
                  : lines.intensity.startsWith("@")
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-indigo-600 dark:text-indigo-400",
              )}
            >
              {lines.intensity}
            </span>
          )}
          {!lines.volume && !lines.intensity && (
            <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
              {exercisePrescriptionShort(row!)}
            </span>
          )}
        </div>
      )}
    </TableCell>
  );
}
