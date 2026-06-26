import { useMemo, useState } from "react";
import { cn } from "@/utils/cn";
import { Select } from "@/components/ui/Select";
import type { ProgramTree } from "@/types/programs";
import { BLOCK_TYPE_COLORS } from "./programConstants";
import {
  alignWeeksByNumber,
  blockStats,
  sortedBlocks,
  sortedDays,
  sortedWeeks,
  weekStats,
} from "./programCompareUtils";
import { computeBlockDateRange, formatWeekDateRange } from "@/utils/weekDates";

interface ProgramBlockCompareViewProps {
  tree: ProgramTree;
}

export function ProgramBlockCompareView({
  tree,
}: ProgramBlockCompareViewProps) {
  const blocks = sortedBlocks(tree.blocks);
  const [leftBlockId, setLeftBlockId] = useState(blocks[0]?.id ?? "");
  const [rightBlockId, setRightBlockId] = useState(
    blocks[Math.min(1, blocks.length - 1)]?.id ?? "",
  );

  const leftBlock = blocks.find((b) => b.id === leftBlockId) ?? blocks[0];
  const rightBlock = blocks.find((b) => b.id === rightBlockId) ?? blocks[1];

  const blockOptions = blocks.map((b) => ({ value: b.id, label: b.name }));

  const weekPairs = useMemo(() => {
    if (!leftBlock || !rightBlock) return [];
    return alignWeeksByNumber(
      sortedWeeks(leftBlock.weeks),
      sortedWeeks(rightBlock.weeks),
    );
  }, [leftBlock, rightBlock]);

  if (blocks.length < 2) {
    return (
      <p className="text-sm text-gray-500">
        Need at least two blocks to compare.
      </p>
    );
  }

  const leftStats = leftBlock ? blockStats(leftBlock) : null;
  const rightStats = rightBlock ? blockStats(rightBlock) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Block A"
          options={blockOptions}
          value={leftBlockId}
          onValueChange={setLeftBlockId}
        />
        <Select
          label="Block B"
          options={blockOptions}
          value={rightBlockId}
          onValueChange={setRightBlockId}
        />
      </div>

      {leftBlock && rightBlock && (
        <div className="grid gap-3 sm:grid-cols-2">
          <BlockSummaryCard
            block={leftBlock}
            stats={leftStats}
            accent="primary"
          />
          <BlockSummaryCard
            block={rightBlock}
            stats={rightStats}
            accent="amber"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Week
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {leftBlock?.name ?? "Block A"}
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {rightBlock?.name ?? "Block B"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
            {weekPairs.map(({ weekNumber, left, right }) => {
              const leftS = left ? weekStats(left) : null;
              const rightS = right ? weekStats(right) : null;
              const differs =
                leftS?.days !== rightS?.days ||
                leftS?.exercises !== rightS?.exercises ||
                !left ||
                !right;

              return (
                <tr
                  key={weekNumber}
                  className={cn(
                    differs && "bg-amber-50/40 dark:bg-amber-950/15",
                  )}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    Week {weekNumber}
                  </td>
                  <td className="px-4 py-3">
                    <WeekCell week={left} stats={leftS} />
                  </td>
                  <td className="px-4 py-3">
                    <WeekCell week={right} stats={rightS} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlockSummaryCard({
  block,
  stats,
  accent,
}: {
  block: ProgramTree["blocks"][number];
  stats: { weeks: number; days: number; exercises: number } | null;
  accent: "primary" | "amber";
}) {
  const range = computeBlockDateRange(block.weeks);
  const rangeLabel = range
    ? formatWeekDateRange(range.weekStart, range.weekEnd)
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        accent === "primary"
          ? "border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-950/30"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {block.name}
        </p>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
            BLOCK_TYPE_COLORS[block.blockType] || BLOCK_TYPE_COLORS.CUSTOM,
          )}
        >
          {block.blockType}
        </span>
      </div>
      {rangeLabel && (
        <p className="mt-0.5 text-xs text-gray-500">{rangeLabel}</p>
      )}
      {stats && (
        <p className="mt-1 text-xs text-gray-500">
          {stats.weeks} weeks · {stats.days} days · {stats.exercises} exercises
        </p>
      )}
    </div>
  );
}

function WeekCell({
  week,
  stats,
}: {
  week: ProgramTree["blocks"][number]["weeks"][number] | null;
  stats: { days: number; exercises: number } | null;
}) {
  if (!week) {
    return <span className="text-xs italic text-gray-400">—</span>;
  }

  const dateRange = formatWeekDateRange(week.weekStart, week.weekEnd);
  const dayTitles = sortedDays(week.days)
    .map((d) => d.title)
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-0.5">
      <p className="text-sm text-gray-900 dark:text-white">
        {week.title || `Week ${week.weekNumber}`}
      </p>
      {dateRange && <p className="text-xs text-gray-500">{dateRange}</p>}
      {stats && (
        <p className="text-xs text-gray-500">
          {stats.days} days · {stats.exercises} exercises
        </p>
      )}
      {dayTitles && (
        <p
          className="text-[11px] text-gray-400 truncate max-w-xs"
          title={dayTitles}
        >
          {dayTitles}
        </p>
      )}
    </div>
  );
}
