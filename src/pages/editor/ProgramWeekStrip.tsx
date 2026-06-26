import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import type { Week } from "@/types/programs";
import { formatWeekDateRange } from "@/utils/weekDates";

type WeekTree = Week & { days: { id: string; exercises: unknown[] }[] };

interface ProgramWeekStripProps {
  weeks: WeekTree[];
  selectedWeekId: string | null;
  onSelectWeek: (weekId: string) => void;
  onAddWeek: () => void;
  onEditWeek: (week: Week) => void;
  onCloneWeek?: (week: Week) => void;
  onDeleteWeek?: (week: Week) => void;
}

const ICON_BTN_CLASS = "h-7 w-7 shrink-0 p-0 text-gray-400";

export function ProgramWeekStrip({
  weeks,
  selectedWeekId,
  onSelectWeek,
  onAddWeek,
  onEditWeek,
  onCloneWeek,
  onDeleteWeek,
}: ProgramWeekStripProps) {
  const sorted = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No weeks in this block yet.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddWeek}
          className="text-primary-600 hover:text-primary-700"
        >
          Add week
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-gray-50/80 dark:bg-gray-800/40">
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
          Weeks
        </span>
        <div className="h-px min-w-0 flex-1 bg-gray-200 dark:bg-gray-700" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddWeek}
          className="shrink-0 text-xs text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Week
        </Button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto px-3 pb-3 pt-1 snap-x snap-mandatory scrollbar-thin sm:px-4">
        {sorted.map((week) => {
          const selected = week.id === selectedWeekId;
          const dateRange = formatWeekDateRange(week.weekStart, week.weekEnd);
          const dayCount = week.days.length;
          const exerciseCount = week.days.reduce(
            (n, d) => n + d.exercises.length,
            0,
          );

          return (
            <div
              key={week.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectWeek(week.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectWeek(week.id);
                }
              }}
              onDoubleClick={() => onEditWeek(week)}
              title="Double-click to edit week"
              className={cn(
                "group relative flex w-44 min-w-44 shrink-0 cursor-pointer snap-start flex-col rounded-lg border px-3 py-2.5 text-left transition-all sm:w-48 sm:min-w-48",
                selected
                  ? "border-primary-400 bg-white shadow-sm ring-1 ring-primary-400/30 dark:border-primary-500 dark:bg-gray-800 dark:ring-primary-500/20"
                  : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white dark:border-gray-600 dark:bg-gray-800/60 dark:hover:border-gray-500 dark:hover:bg-gray-800",
              )}
            >
              <div
                className={cn("flex items-center gap-2", selected && "pr-16")}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    selected
                      ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
                  )}
                >
                  {week.weekNumber}
                </span>
                <span
                  className={cn(
                    "truncate text-sm font-semibold",
                    selected
                      ? "text-gray-900 dark:text-white"
                      : "text-gray-700 dark:text-gray-200",
                  )}
                >
                  {week.title}
                </span>
              </div>
              {dateRange ? (
                <span className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
                  {dateRange}
                </span>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditWeek(week);
                  }}
                  className="mt-1 h-auto justify-start p-0 text-[11px] font-normal text-amber-600 hover:bg-transparent hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
                >
                  Set dates
                </Button>
              )}
              <span className="mt-1.5 text-[10px] text-gray-400">
                {dayCount} {dayCount === 1 ? "day" : "days"} · {exerciseCount}{" "}
                exercises
              </span>
              {selected && (
                <div
                  className="absolute right-1 top-1.5 flex gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditWeek(week);
                    }}
                    className={cn(
                      ICON_BTN_CLASS,
                      "hover:text-gray-700 dark:hover:text-gray-200",
                    )}
                    title="Edit week"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {onCloneWeek && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloneWeek(week);
                      }}
                      className={cn(ICON_BTN_CLASS, "hover:text-primary-600")}
                      title="Clone week"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {onDeleteWeek && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWeek(week);
                      }}
                      className={cn(
                        ICON_BTN_CLASS,
                        "hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20",
                      )}
                      title="Delete week"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
