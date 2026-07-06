import { useMemo, type ReactNode } from "react";
import { GitCompare } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ExerciseRow } from "@/types/programs";
import type { DayTree } from "./programStructureUtils";
import {
  alignDaysByNumber,
  alignExercisesByIndex,
  exerciseDisplayName,
  exercisePrescription,
  sortedDays,
} from "./programCompareUtils";
import { formatWeekDateRange } from "@/utils/weekDates";

export interface WeekCompareSide {
  label: string;
  week: {
    weekNumber: number;
    title: string;
    weekStart: string | null;
    weekEnd: string | null;
    days: DayTree[];
  };
  stats: { days: number; exercises: number } | null;
  accent: "primary" | "amber";
}

interface ProgramWeekCompareContentProps {
  left: WeekCompareSide;
  right: WeekCompareSide;
  showSummaries?: boolean;
}

export function ProgramWeekCompareContent({
  left,
  right,
  showSummaries = true,
}: ProgramWeekCompareContentProps) {
  const dayPairs = useMemo(
    () =>
      alignDaysByNumber(
        sortedDays(left.week.days),
        sortedDays(right.week.days),
      ),
    [left.week.days, right.week.days],
  );

  return (
    <div className="space-y-4">
      {showSummaries && (
        <div className="grid gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:grid-cols-2">
          <WeekSummaryCard side={left} />
          <WeekSummaryCard side={right} />
        </div>
      )}

      <div className="space-y-6">
        {dayPairs.map(({ dayNumber, left: leftDay, right: rightDay }) => (
          <DayCompareSection
            key={dayNumber}
            dayNumber={dayNumber}
            leftTitle={leftDay?.title ?? null}
            rightTitle={rightDay?.title ?? null}
            left={leftDay}
            right={rightDay}
          />
        ))}
      </div>
    </div>
  );
}

function WeekSummaryCard({ side }: { side: WeekCompareSide }) {
  const dateRange = formatWeekDateRange(side.week.weekStart, side.week.weekEnd);

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        side.accent === "primary"
          ? "border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
      )}
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {side.label}
      </p>
      {dateRange && (
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {dateRange}
        </p>
      )}
      {side.stats && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {side.stats.days} days · {side.stats.exercises} exercises
        </p>
      )}
    </div>
  );
}

function DayCompareSection({
  dayNumber,
  leftTitle,
  rightTitle,
  left,
  right,
}: {
  dayNumber: number;
  leftTitle: string | null;
  rightTitle: string | null;
  left: { exercises: ExerciseRow[] } | null;
  right: { exercises: ExerciseRow[] } | null;
}) {
  const pairs = alignExercisesByIndex(
    left?.exercises ?? [],
    right?.exercises ?? [],
  );
  const hasDiff = pairs.some((p) => p.differs);
  const onlyOneSide = !left || !right;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800/60">
        <GitCompare className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Day {dayNumber}
        </h3>
        {hasDiff && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Differences
          </span>
        )}
        {onlyOneSide && (
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-600 dark:text-gray-300">
            Missing on one side
          </span>
        )}
      </div>

      <div className="grid sm:grid-cols-2">
        <DayColumn title={leftTitle ?? "—"} side="left" missing={!left}>
          {left ? (
            pairs.map((pair) => (
              <ExerciseCompareRow
                key={`l-${pair.index}`}
                row={pair.left}
                differs={pair.differs}
                side="left"
              />
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500">
              No day on left
            </p>
          )}
        </DayColumn>
        <DayColumn title={rightTitle ?? "—"} side="right" missing={!right}>
          {right ? (
            pairs.map((pair) => (
              <ExerciseCompareRow
                key={`r-${pair.index}`}
                row={pair.right}
                differs={pair.differs}
                side="right"
              />
            ))
          ) : (
            <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500">
              No day on right
            </p>
          )}
        </DayColumn>
      </div>
    </section>
  );
}

function DayColumn({
  title,
  side,
  missing,
  children,
}: {
  title: string;
  side: "left" | "right";
  missing: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "min-w-0 border-gray-200 dark:border-gray-700",
        side === "right" && "border-t sm:border-t-0 sm:border-l",
        missing && "bg-gray-50/50 dark:bg-gray-900/30",
      )}
    >
      <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700/60">
        <p className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
          {title}
        </p>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
        {children}
      </div>
    </div>
  );
}

function ExerciseCompareRow({
  row,
  differs,
  side,
}: {
  row: ExerciseRow | null;
  differs: boolean;
  side: "left" | "right";
}) {
  if (!row) {
    return (
      <div
        className={cn(
          "px-3 py-2.5 text-xs italic text-gray-400 dark:text-gray-500",
          differs && "bg-amber-50/60 dark:bg-amber-950/20",
        )}
      >
        —
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-3 py-2.5",
        differs && "bg-amber-50/60 dark:bg-amber-950/20",
        side === "left" && differs && "border-l-2 border-l-amber-400",
        side === "right" &&
          differs &&
          "border-r-2 border-r-amber-400 sm:border-l-0",
      )}
    >
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {exerciseDisplayName(row)}
      </p>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {exercisePrescription(row)}
      </p>
    </div>
  );
}
