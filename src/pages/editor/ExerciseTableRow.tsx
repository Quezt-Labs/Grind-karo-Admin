import { memo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ExerciseRow } from "@/types/programs";
import {
  CATEGORY_COLORS,
  CATEGORY_BORDER,
  formatPercent,
} from "./programConstants";

interface ExerciseTableRowProps {
  row: ExerciseRow;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export const ExerciseTableRow = memo(function ExerciseTableRow({
  row,
  index,
  onEdit,
  onDelete,
}: ExerciseTableRowProps) {
  const exerciseName = row.resolvedName || row.exerciseNameOverride || "—";
  const hasNotes = row.loadNote || row.notes;
  const isAccessory = row.category === "ACCESSORY" || row.category === "OTHER";

  return (
    <>
      <tr
        className={cn(
          "group border-l-3 transition-colors",
          CATEGORY_BORDER[row.category] || CATEGORY_BORDER.OTHER,
          isAccessory
            ? "bg-gray-50/50 hover:bg-gray-100/50 dark:bg-gray-800/50 dark:hover:bg-gray-750"
            : "hover:bg-gray-50 dark:hover:bg-gray-750",
          index > 0 && "border-t border-t-gray-100 dark:border-t-gray-700",
        )}
      >
        <td className="py-2.5 pl-3">
          <span
            className={cn(
              "font-mono text-[10px]",
              isAccessory ? "text-gray-400" : "text-gray-500",
            )}
          >
            {index + 1}
          </span>
        </td>
        <td className="py-2.5">
          <span
            className={cn(
              "font-medium",
              isAccessory
                ? "text-gray-600 dark:text-gray-400"
                : "text-gray-900 dark:text-white",
            )}
          >
            {exerciseName}
          </span>
          {hasNotes && (
            <p className="mt-0.5 text-[10px] leading-tight text-gray-400 dark:text-gray-500">
              {row.loadNote && <span className="italic">{row.loadNote}</span>}
              {row.loadNote && row.notes && <span> · </span>}
              {row.notes && <span>{row.notes}</span>}
            </p>
          )}
        </td>
        <td className="py-2.5">
          <span
            className={cn(
              "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
              CATEGORY_COLORS[row.category] || CATEGORY_COLORS.OTHER,
            )}
          >
            {row.category}
          </span>
        </td>
        <td
          className={cn(
            "py-2.5 text-center font-mono",
            isAccessory
              ? "text-gray-500 dark:text-gray-400"
              : "text-gray-700 dark:text-gray-300",
          )}
        >
          {row.sets ?? (
            <span className="text-gray-300 dark:text-gray-600">–</span>
          )}
        </td>
        <td className="py-2.5 text-center">
          {row.repScheme ? (
            <span
              className={cn(
                "font-mono",
                isAccessory
                  ? "text-gray-500 dark:text-gray-400"
                  : "text-gray-700 dark:text-gray-300",
              )}
            >
              {row.repScheme}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">–</span>
          )}
        </td>
        <td className="py-2.5 text-center">
          {row.targetRpe ? (
            <span
              className={cn(
                "inline-block rounded-md px-1.5 py-0.5 font-mono text-[11px] font-semibold",
                !isAccessory &&
                  "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
                isAccessory && "text-gray-500 dark:text-gray-400",
              )}
            >
              {row.targetRpe}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">–</span>
          )}
        </td>
        <td className="py-2.5 text-center">
          {row.percentOneRm ? (
            <span className="inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400">
              {formatPercent(row.percentOneRm)}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">–</span>
          )}
        </td>
        <td className="py-2.5 text-center">
          {row.computedLoadKg ? (
            <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {row.computedLoadKg}
              <span className="ml-0.5 text-[10px] font-normal text-emerald-600/70 dark:text-emerald-400/70">
                kg
              </span>
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600">–</span>
          )}
        </td>
        <td className="py-2.5">
          <div className="flex items-center justify-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-40 sm:group-hover:opacity-100">
            <button
              onClick={onEdit}
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-gray-600 dark:hover:text-gray-200"
              title="Edit exercise"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
              title="Delete exercise"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    </>
  );
});
