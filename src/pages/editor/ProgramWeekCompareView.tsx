import { useMemo, useState, type ReactNode } from "react";
import { GitCompare } from "lucide-react";
import { cn } from "@/utils/cn";
import { Select } from "@/components/ui/Select";
import type { ProgramTree } from "@/types/programs";
import {
  alignDaysByNumber,
  alignExercisesByIndex,
  exerciseDisplayName,
  exercisePrescription,
  sortedBlocks,
  sortedDays,
  sortedWeeks,
  weekLabel,
  weekShortLabel,
  weekStats,
} from "./programCompareUtils";
import { formatWeekDateRange } from "@/utils/weekDates";

interface ProgramWeekCompareViewProps {
  tree: ProgramTree;
}

export function ProgramWeekCompareView({ tree }: ProgramWeekCompareViewProps) {
  const blocks = sortedBlocks(tree.blocks);
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? "");
  const block = blocks.find((b) => b.id === blockId) ?? blocks[0];
  const weeks = block ? sortedWeeks(block.weeks) : [];

  const [leftWeekId, setLeftWeekId] = useState(weeks[0]?.id ?? "");
  const [rightWeekId, setRightWeekId] = useState(
    weeks[Math.min(1, weeks.length - 1)]?.id ?? "",
  );

  const leftWeek = weeks.find((w) => w.id === leftWeekId) ?? weeks[0];
  const rightWeek = weeks.find((w) => w.id === rightWeekId) ?? weeks[1];

  const blockOptions = blocks.map((b) => ({ value: b.id, label: b.name }));
  const weekOptions = weeks.map((w) => ({
    value: w.id,
    label: weekShortLabel(w),
  }));

  const dayPairs = useMemo(() => {
    if (!leftWeek || !rightWeek) return [];
    return alignDaysByNumber(
      sortedDays(leftWeek.days),
      sortedDays(rightWeek.days),
    );
  }, [leftWeek, rightWeek]);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-gray-500">Add blocks to compare weeks.</p>
    );
  }

  if (weeks.length < 2) {
    return (
      <p className="text-sm text-gray-500">
        Need at least two weeks in this block to compare.
      </p>
    );
  }

  const leftStats = leftWeek ? weekStats(leftWeek) : null;
  const rightStats = rightWeek ? weekStats(rightWeek) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Select
          label="Block"
          options={blockOptions}
          value={blockId}
          onValueChange={(id) => {
            setBlockId(id);
            const nextBlock = blocks.find((b) => b.id === id);
            const nextWeeks = nextBlock ? sortedWeeks(nextBlock.weeks) : [];
            setLeftWeekId(nextWeeks[0]?.id ?? "");
            setRightWeekId(
              nextWeeks[Math.min(1, nextWeeks.length - 1)]?.id ?? "",
            );
          }}
        />
        <Select
          label="Week A"
          options={weekOptions}
          value={leftWeekId}
          onValueChange={setLeftWeekId}
        />
        <Select
          label="Week B"
          options={weekOptions}
          value={rightWeekId}
          onValueChange={setRightWeekId}
        />
      </div>

      {leftWeek && rightWeek && (
        <div className="grid gap-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:grid-cols-2">
          <WeekSummaryCard week={leftWeek} stats={leftStats} accent="primary" />
          <WeekSummaryCard week={rightWeek} stats={rightStats} accent="amber" />
        </div>
      )}

      <div className="space-y-6">
        {dayPairs.map(({ dayNumber, left, right }) => (
          <DayCompareSection
            key={dayNumber}
            dayNumber={dayNumber}
            leftTitle={left?.title ?? null}
            rightTitle={right?.title ?? null}
            left={left}
            right={right}
          />
        ))}
      </div>
    </div>
  );
}

function WeekSummaryCard({
  week,
  stats,
  accent,
}: {
  week: {
    weekNumber: number;
    title: string;
    weekStart: string | null;
    weekEnd: string | null;
  };
  stats: { days: number; exercises: number } | null;
  accent: "primary" | "amber";
}) {
  const dateRange = formatWeekDateRange(week.weekStart, week.weekEnd);
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        accent === "primary"
          ? "border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
      )}
    >
      <p className="text-sm font-semibold text-gray-900 dark:text-white">
        {weekLabel(week as Parameters<typeof weekLabel>[0])}
      </p>
      {dateRange && <p className="mt-0.5 text-xs text-gray-500">{dateRange}</p>}
      {stats && (
        <p className="mt-1 text-xs text-gray-500">
          {stats.days} days · {stats.exercises} exercises
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
  left: { exercises: import("@/types/programs").ExerciseRow[] } | null;
  right: { exercises: import("@/types/programs").ExerciseRow[] } | null;
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
        <GitCompare className="h-4 w-4 text-gray-400" />
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
            <p className="px-3 py-4 text-xs text-gray-400">No day in Week A</p>
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
            <p className="px-3 py-4 text-xs text-gray-400">No day in Week B</p>
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
  row: import("@/types/programs").ExerciseRow | null;
  differs: boolean;
  side: "left" | "right";
}) {
  if (!row) {
    return (
      <div
        className={cn(
          "px-3 py-2.5 text-xs italic text-gray-400",
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
      <p className="mt-0.5 text-xs text-gray-500">
        {exercisePrescription(row)}
      </p>
    </div>
  );
}
