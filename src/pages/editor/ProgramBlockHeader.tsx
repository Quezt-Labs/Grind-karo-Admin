import { cn } from "@/utils/cn";
import type { Block } from "@/types/programs";
import { BLOCK_TYPE_COLORS } from "./programConstants";
import { TreeNodeActions } from "./TreeNodeActions";

export interface ProgramBlockHeaderProps {
  block: Block;
  blockRangeLabel: string | null;
  onAddWeek: () => void;
  onEditBlock: (block: Block) => void;
  onDeleteBlock: (block: Block) => void;
}

export function ProgramBlockHeader({
  block,
  blockRangeLabel,
  onAddWeek,
  onEditBlock,
  onDeleteBlock,
}: ProgramBlockHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-3 sm:px-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {block.name}
          </h2>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
              BLOCK_TYPE_COLORS[block.blockType] || BLOCK_TYPE_COLORS.CUSTOM,
            )}
          >
            {block.blockType}
          </span>
        </div>
        {blockRangeLabel && (
          <p className="mt-0.5 text-xs text-gray-500">
            Block schedule: {blockRangeLabel}
          </p>
        )}
      </div>
      <TreeNodeActions
        onAdd={onAddWeek}
        addTitle="Add week"
        onEdit={() => onEditBlock(block)}
        editTitle="Edit block"
        onDelete={() => onDeleteBlock(block)}
        deleteTitle="Delete block"
        size="md"
      />
    </div>
  );
}
