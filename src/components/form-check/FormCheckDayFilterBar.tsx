import { Sun } from "lucide-react";
import type { ProgramDayOption } from "@/utils/formCheckWeekUtils";
import { formatProgramDayLabel } from "@/utils/formCheckWeekUtils";
import { cn } from "@/utils/cn";

/** Avoid duplicate total+pending when every video in the chip is still pending. */
function FilterChipCounts({
  videoCount,
  pendingCount,
  selected,
}: {
  videoCount: number;
  pendingCount: number;
  selected: boolean;
}) {
  const allPending = pendingCount > 0 && pendingCount === videoCount;
  const showTotal = videoCount > 0 && !allPending;
  const showPending = pendingCount > 0;

  return (
    <>
      {showTotal ? (
        <span className="ml-1.5 opacity-80">{videoCount}</span>
      ) : null}
      {showPending ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            showTotal ? "ml-1" : "ml-1.5",
            selected
              ? "bg-white/20 text-white"
              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
          )}
        >
          {pendingCount}
        </span>
      ) : null}
    </>
  );
}

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
            <FilterChipCounts
              videoCount={day.videoCount}
              pendingCount={day.pendingCount}
              selected={selectedDay === day.dayNumber}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
