import { Plus, Sun } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";
import type { Day } from "@/types/programs";

type DayTree = Day;

interface ProgramDayTabsProps {
  days: DayTree[];
  selectedDayId: string | null;
  onSelectDay: (dayId: string) => void;
  onAddDay: () => void;
}

export function ProgramDayTabs({
  days,
  selectedDayId,
  onSelectDay,
  onAddDay,
}: ProgramDayTabsProps) {
  const sorted = [...days].sort((a, b) => a.dayNumber - b.dayNumber);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5">
        <p className="text-sm text-gray-500">No days in this week.</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddDay}
          className="text-primary-600 hover:text-primary-700"
        >
          Add day
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto px-3 py-2 scrollbar-thin sm:px-4">
      <span className="mr-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        Days
      </span>
      {sorted.map((day) => {
        const selected = day.id === selectedDayId;
        return (
          <Button
            key={day.id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectDay(day.id)}
            className={cn(
              "shrink-0 gap-1.5",
              selected
                ? "bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/30"
                : "text-gray-600 dark:text-gray-400",
            )}
          >
            <Sun
              className={cn(
                "h-3.5 w-3.5",
                selected ? "text-amber-500" : "text-gray-400",
              )}
            />
            <span>{day.title}</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                selected
                  ? "bg-primary-100 text-primary-600 dark:bg-primary-900/50 dark:text-primary-300"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
              )}
            >
              {day.exercises.length}
            </span>
          </Button>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAddDay}
        className="shrink-0 text-gray-500 hover:text-primary-600"
        title="Add day"
      >
        <Plus className="h-3.5 w-3.5" />
        Day
      </Button>
    </div>
  );
}
