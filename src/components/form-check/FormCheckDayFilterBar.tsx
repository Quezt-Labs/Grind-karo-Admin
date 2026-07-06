import { Sun } from "lucide-react";
import type { ProgramDayOption } from "@/utils/formCheckWeekUtils";
import { formatProgramDayLabel } from "@/utils/formCheckWeekUtils";
import { cn } from "@/utils/cn";

export function FormCheckDayFilterBar({
  days,
  selectedDay,
  onChange,
  className,
}: {
  days: ProgramDayOption[];
  selectedDay: number | null;
  onChange: (day: number | null) => void;
  className?: string;
}) {
  if (days.length === 0) return null;

  const totalPending = days.reduce((sum, d) => sum + d.pendingCount, 0);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <Sun className="h-3.5 w-3.5" />
        Program day
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            selectedDay == null
              ? "bg-indigo-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
          )}
        >
          All days
          {totalPending > 0 ? (
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {totalPending}
            </span>
          ) : null}
        </button>
        {days.map((day) => (
          <button
            key={day.dayNumber}
            type="button"
            onClick={() => onChange(day.dayNumber)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              selectedDay === day.dayNumber
                ? "bg-indigo-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
            )}
          >
            {formatProgramDayLabel(day.dayNumber, day.dayLabel)}
            <span className="ml-1.5 opacity-80">{day.videoCount}</span>
            {day.pendingCount > 0 ? (
              <span
                className={cn(
                  "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  selectedDay === day.dayNumber
                    ? "bg-white/20 text-white"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
                )}
              >
                {day.pendingCount}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
