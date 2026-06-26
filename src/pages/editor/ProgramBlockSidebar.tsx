import { memo } from "react";
import { ChevronRight, Layers, Plus } from "lucide-react";
import { cn } from "@/utils/cn";
import type { Block } from "@/types/programs";
import { Button } from "@/components/ui/Button";
import { BLOCK_TYPE_COLORS } from "./programConstants";
import { TreeNodeActions } from "./TreeNodeActions";
import {
  type BlockTree,
  sortedBlocks,
  sortedWeeks,
} from "./programStructureUtils";
import { computeBlockDateRange, formatWeekDateRange } from "@/utils/weekDates";

export interface ProgramBlockSidebarProps {
  blocks: BlockTree[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onEditBlock: (block: Block) => void;
  onDeleteBlock: (block: Block) => void;
  onCloneBlock: (blockId: string) => void;
}

export const ProgramBlockSidebar = memo(function ProgramBlockSidebar({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onCloneBlock,
}: ProgramBlockSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 lg:w-56 lg:shrink-0 lg:border-r">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Blocks
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddBlock}
          className="h-8 w-8 p-0 text-gray-500 hover:text-primary-600"
          title="Add block"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-gray-500">
            No blocks yet
          </p>
        ) : (
          <ul className="space-y-1">
            {sortedBlocks(blocks).map((block) => {
              const selected = block.id === selectedBlockId;
              const weeks = sortedWeeks(block.weeks);
              const blockRange = computeBlockDateRange(weeks);
              const blockRangeLabel = blockRange
                ? formatWeekDateRange(blockRange.weekStart, blockRange.weekEnd)
                : null;
              const exerciseCount = weeks.reduce(
                (n, w) =>
                  n + w.days.reduce((dn, d) => dn + d.exercises.length, 0),
                0,
              );

              return (
                <li key={block.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectBlock(block.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectBlock(block.id);
                      }
                    }}
                    className={cn(
                      "group relative flex w-full cursor-pointer items-start gap-2 rounded-lg p-2 text-left transition-colors",
                      selected
                        ? "bg-white shadow-sm ring-1 ring-primary-400/25 dark:bg-gray-800 dark:ring-primary-500/20"
                        : "hover:bg-white dark:hover:bg-gray-700/50",
                    )}
                  >
                    <Layers
                      className={cn(
                        "mt-0.5 h-4 w-4 shrink-0",
                        selected ? "text-primary-500" : "text-gray-400",
                      )}
                    />
                    <div className="min-w-0 flex-1 pr-6">
                      <span
                        className={cn(
                          "block truncate text-sm font-semibold",
                          selected
                            ? "text-gray-900 dark:text-white"
                            : "text-gray-800 dark:text-gray-200",
                        )}
                      >
                        {block.name}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 inline-block rounded px-1 py-0.5 text-[9px] font-bold uppercase",
                          BLOCK_TYPE_COLORS[block.blockType] ||
                            BLOCK_TYPE_COLORS.CUSTOM,
                        )}
                      >
                        {block.blockType}
                      </span>
                      <p className="mt-1 text-[10px] leading-snug text-gray-500 dark:text-gray-400">
                        {weeks.length} {weeks.length === 1 ? "week" : "weeks"} ·{" "}
                        {exerciseCount} exercises
                      </p>
                      {blockRangeLabel && (
                        <p className="mt-0.5 truncate text-[10px] text-gray-400">
                          {blockRangeLabel}
                        </p>
                      )}
                    </div>
                    {selected && (
                      <ChevronRight className="absolute right-2 top-2.5 h-3.5 w-3.5 shrink-0 text-primary-500" />
                    )}
                    <div
                      className="absolute right-1 top-1 z-10 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <TreeNodeActions
                        onClone={() => onCloneBlock(block.id)}
                        cloneTitle="Clone block"
                        onEdit={() => onEditBlock(block)}
                        editTitle="Edit block"
                        onDelete={() => onDeleteBlock(block)}
                        deleteTitle="Delete block"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
});
