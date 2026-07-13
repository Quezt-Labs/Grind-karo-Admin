import { CalendarDays } from "lucide-react";
import type { ProgramWeekOption } from "@/utils/formCheckWeekUtils";
import {
  formatProgramDayLabel,
  formatProgramWeekLabel,
} from "@/utils/formCheckWeekUtils";
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

export function FormCheckWeekFilterBar({
  weeks,
  selectedWeek,
  onChange,
  className,
}: {
  weeks: ProgramWeekOption[];
  selectedWeek: number | null;
  onChange: (week: number | null) => void;
  className?: string;
}) {
  if (weeks.length === 0) return null;

  const totalPending = weeks.reduce((sum, w) => sum + w.pendingCount, 0);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <CalendarDays className="h-3.5 w-3.5" />
        Program week
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            selectedWeek == null
              ? "bg-indigo-600 text-white"
              : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
          )}
        >
          All weeks
          {totalPending > 0 ? (
            <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
              {totalPending}
            </span>
          ) : null}
        </button>
        {weeks.map((week) => (
          <button
            key={week.weekNumber}
            type="button"
            onClick={() => onChange(week.weekNumber)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              selectedWeek === week.weekNumber
                ? "bg-indigo-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200",
            )}
          >
            {formatProgramWeekLabel(week.weekNumber)}
            <FilterChipCounts
              videoCount={week.videoCount}
              pendingCount={week.pendingCount}
              selected={selectedWeek === week.weekNumber}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function FormCheckWeekBadge({
  weekNumber,
  dayNumber,
  dayLabel,
  className,
}: {
  weekNumber: number | null | undefined;
  dayNumber?: number | null;
  dayLabel?: string | null;
  className?: string;
}) {
  if (weekNumber == null) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
        className,
      )}
    >
      <CalendarDays className="h-3 w-3" />
      {formatProgramWeekLabel(weekNumber)}
      {dayNumber != null ? (
        <span className="font-medium normal-case opacity-90">
          · {formatProgramDayLabel(dayNumber, dayLabel)}
        </span>
      ) : null}
    </span>
  );
}
