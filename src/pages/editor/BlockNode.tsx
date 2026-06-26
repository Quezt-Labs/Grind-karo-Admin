import { memo } from "react";
import { ChevronDown, ChevronRight, Layers, Calendar } from "lucide-react";
import { cn } from "@/utils/cn";
import type { ProgramTree, Week, Day, ExerciseRow } from "@/types/programs";
import { BLOCK_TYPE_COLORS } from "./programConstants";
import { EmptySection } from "./ProgramShared";
import { TreeNodeActions } from "./TreeNodeActions";
import { WeekNode } from "./WeekNode";
import { computeBlockDateRange, formatWeekDateRange } from "@/utils/weekDates";

type BlockTree = ProgramTree["blocks"][number];

interface BlockNodeProps {
  programId: string;
  block: BlockTree;
  expanded: boolean;
  onToggle: () => void;
  expandedWeeks: Set<string>;
  toggleWeek: (id: string) => void;
  expandedDays: Set<string>;
  toggleDay: (id: string) => void;
  onEditBlock: () => void;
  onDeleteBlock: () => void;
  onCloneBlock: () => void;
  onAddWeek: (blockId: string) => void;
  onEditWeek: (week: Week) => void;
  onDeleteWeek: (week: Week) => void;
  onCloneWeek: (week: Week) => void;
  onAddDay: (weekId: string) => void;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onEditExercise: (
    row: ExerciseRow,
    dayId: string,
    dayExercises: ExerciseRow[],
  ) => void;
  onAddExercise: (
    dayId: string,
    dayExercises: ExerciseRow[],
    nextSortOrder: number,
  ) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
}

export const BlockNode = memo(function BlockNode({
  programId,
  block,
  expanded,
  onToggle,
  expandedWeeks,
  toggleWeek,
  expandedDays,
  toggleDay,
  onEditBlock,
  onDeleteBlock,
  onCloneBlock,
  onAddWeek,
  onEditWeek,
  onDeleteWeek,
  onCloneWeek,
  onAddDay,
  onEditDay,
  onDeleteDay,
  onEditExercise,
  onAddExercise,
  onDeleteExercise,
  onRefresh,
}: BlockNodeProps) {
  const totalExercises = block.weeks.reduce(
    (acc, w) => acc + w.days.reduce((da, d) => da + d.exercises.length, 0),
    0,
  );
  const blockRange = computeBlockDateRange(block.weeks);
  const blockRangeLabel = blockRange
    ? formatWeekDateRange(blockRange.weekStart, blockRange.weekEnd)
    : null;

  return (
    <div className="flex h-full w-[min(100%,28rem)] min-w-72 shrink-0 flex-col overflow-hidden rounded-xl border-2 border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      {/* Block header */}
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-3",
          "bg-linear-to-r",
          block.blockType === "MAIN"
            ? "from-blue-50 to-white dark:from-blue-900/10 dark:to-gray-800"
            : block.blockType === "DELOAD"
              ? "from-green-50 to-white dark:from-green-900/10 dark:to-gray-800"
              : block.blockType === "PEAK"
                ? "from-red-50 to-white dark:from-red-900/10 dark:to-gray-800"
                : "from-gray-50 to-white dark:from-gray-700/30 dark:to-gray-800",
          "dark:border-gray-700",
        )}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-3 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
          <Layers className="h-5 w-5 text-primary-500" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {block.name}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  BLOCK_TYPE_COLORS[block.blockType] ||
                    BLOCK_TYPE_COLORS.CUSTOM,
                )}
              >
                {block.blockType}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {block.weeks.length} weeks · {totalExercises} exercises
              {blockRangeLabel && (
                <span className="text-gray-400"> · {blockRangeLabel}</span>
              )}
            </p>
          </div>
        </button>
        <TreeNodeActions
          onAdd={() => onAddWeek(block.id)}
          addTitle="Add Week"
          onClone={onCloneBlock}
          cloneTitle="Clone Block"
          onEdit={onEditBlock}
          editTitle="Edit Block"
          onDelete={onDeleteBlock}
          deleteTitle="Delete Block"
          size="md"
        />
      </div>

      {expanded && (
        <div className="flex gap-2 overflow-x-auto p-3">
          {block.weeks.length === 0 ? (
            <EmptySection
              icon={<Calendar className="h-6 w-6" />}
              message="No weeks yet"
              actionLabel="Add Week"
              onAction={() => onAddWeek(block.id)}
            />
          ) : (
            block.weeks
              .sort((a, b) => a.weekNumber - b.weekNumber)
              .map((week) => (
                <WeekNode
                  key={week.id}
                  programId={programId}
                  week={week}
                  expanded={expandedWeeks.has(week.id)}
                  onToggle={() => toggleWeek(week.id)}
                  expandedDays={expandedDays}
                  toggleDay={toggleDay}
                  onEdit={() => onEditWeek(week)}
                  onDelete={() => onDeleteWeek(week)}
                  onClone={() => onCloneWeek(week)}
                  onAddDay={() => onAddDay(week.id)}
                  onEditDay={onEditDay}
                  onDeleteDay={onDeleteDay}
                  onEditExercise={onEditExercise}
                  onAddExercise={onAddExercise}
                  onDeleteExercise={onDeleteExercise}
                  onRefresh={onRefresh}
                />
              ))
          )}
        </div>
      )}
    </div>
  );
});
