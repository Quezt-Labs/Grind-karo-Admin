import { cn } from "@/utils/cn";
import type { SheetWorkoutContextChip } from "@/lib/sheetWorkoutContextChips";

const toneClass: Record<
  NonNullable<SheetWorkoutContextChip["tone"]>,
  string
> = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  block:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200",
  accent:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  muted: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
};

export function SheetWorkoutContextChips({
  chips,
  className,
}: {
  chips: SheetWorkoutContextChip[];
  className?: string;
}) {
  if (chips.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            toneClass[chip.tone ?? "default"],
          )}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}
