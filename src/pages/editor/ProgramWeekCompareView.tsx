import { useMemo, useState } from "react";
import { Select } from "@/components/ui/Select";
import type { ProgramTree } from "@/types/programs";
import {
  sortedBlocks,
  sortedWeeks,
  weekLabel,
  weekShortLabel,
  weekStats,
} from "./programCompareUtils";
import { ProgramWeekCompareContent } from "./ProgramWeekCompareContent";

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

  const leftStats = leftWeek ? weekStats(leftWeek) : null;
  const rightStats = rightWeek ? weekStats(rightWeek) : null;

  const compareSides = useMemo(() => {
    if (!leftWeek || !rightWeek || !block) return null;
    return {
      left: {
        label: weekLabel(leftWeek, block.name),
        week: leftWeek,
        stats: leftStats,
        accent: "primary" as const,
      },
      right: {
        label: weekLabel(rightWeek, block.name),
        week: rightWeek,
        stats: rightStats,
        accent: "amber" as const,
      },
    };
  }, [leftWeek, rightWeek, block, leftStats, rightStats]);

  if (blocks.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Add blocks to compare weeks.
      </p>
    );
  }

  if (weeks.length < 2) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Need at least two weeks in this block to compare.
      </p>
    );
  }

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

      {compareSides && (
        <ProgramWeekCompareContent
          left={compareSides.left}
          right={compareSides.right}
        />
      )}
    </div>
  );
}
