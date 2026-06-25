import { memo, useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Calendar,
  Sun,
  Plus,
} from "lucide-react";
import { cn } from "@/utils/cn";
import type {
  ProgramTree,
  Block,
  Week,
  Day,
  ExerciseRow,
} from "@/types/programs";
import { BLOCK_TYPE_COLORS } from "./programConstants";
import { EmptySection } from "./ProgramShared";
import { TreeNodeActions } from "./TreeNodeActions";
import { ExerciseTable } from "./ExerciseTable";
import { Button } from "@/components/ui/Button";

type BlockTree = ProgramTree["blocks"][number];
type WeekTree = BlockTree["weeks"][number];
type DayTree = WeekTree["days"][number];

export interface ProgramStructureEditorProps {
  programId: string;
  tree: ProgramTree;
  onAddBlock: () => void;
  onEditBlock: (block: Block) => void;
  onDeleteBlock: (block: Block) => void;
  onCloneBlock: (blockId: string) => void;
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

interface DayLocation {
  block: BlockTree;
  week: WeekTree;
  day: DayTree;
}

function sortedBlocks(blocks: BlockTree[]) {
  return [...blocks].sort((a, b) => a.displayOrder - b.displayOrder);
}

function findFirstDay(blocks: BlockTree[]): string | null {
  for (const block of sortedBlocks(blocks)) {
    const weeks = [...block.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
    for (const week of weeks) {
      const days = [...week.days].sort((a, b) => a.dayNumber - b.dayNumber);
      if (days[0]) return days[0].id;
    }
  }
  return null;
}

function findDayLocation(
  blocks: BlockTree[],
  dayId: string | null,
): DayLocation | null {
  if (!dayId) return null;
  for (const block of sortedBlocks(blocks)) {
    for (const week of block.weeks) {
      const day = week.days.find((d) => d.id === dayId);
      if (day) return { block, week, day };
    }
  }
  return null;
}

function allBlockIds(blocks: BlockTree[]) {
  return new Set(blocks.map((b) => b.id));
}

function allWeekIds(blocks: BlockTree[]) {
  const ids = new Set<string>();
  for (const block of blocks) {
    for (const week of block.weeks) ids.add(week.id);
  }
  return ids;
}

function toggleInSet(set: Set<string>, id: string): Set<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

const StructureSidebar = memo(function StructureSidebar({
  blocks,
  selectedDayId,
  expandedBlocks,
  expandedWeeks,
  onSelectDay,
  onToggleBlock,
  onToggleWeek,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onCloneBlock,
  onAddWeek,
  onEditWeek,
  onDeleteWeek,
  onCloneWeek,
  onAddDay,
}: {
  blocks: BlockTree[];
  selectedDayId: string | null;
  expandedBlocks: Set<string>;
  expandedWeeks: Set<string>;
  onSelectDay: (dayId: string) => void;
  onToggleBlock: (blockId: string) => void;
  onToggleWeek: (weekId: string) => void;
} & Pick<
  ProgramStructureEditorProps,
  | "onAddBlock"
  | "onEditBlock"
  | "onDeleteBlock"
  | "onCloneBlock"
  | "onAddWeek"
  | "onEditWeek"
  | "onDeleteWeek"
  | "onCloneWeek"
  | "onAddDay"
>) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 lg:w-72">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2.5 dark:border-gray-700">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Program tree
        </span>
        <button
          type="button"
          onClick={onAddBlock}
          className="rounded-md p-1 text-gray-500 hover:bg-white hover:text-primary-600 dark:hover:bg-gray-700"
          title="Add block"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {blocks.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-gray-500">
            No blocks yet
          </p>
        ) : (
          <ul className="space-y-1">
            {sortedBlocks(blocks).map((block) => {
              const blockOpen = expandedBlocks.has(block.id);
              const weeks = [...block.weeks].sort(
                (a, b) => a.weekNumber - b.weekNumber,
              );

              return (
                <li key={block.id}>
                  <div className="group flex items-center gap-1 rounded-lg px-1 py-0.5 hover:bg-white dark:hover:bg-gray-700/50">
                    <button
                      type="button"
                      onClick={() => onToggleBlock(block.id)}
                      className="rounded p-1 text-gray-400 hover:text-gray-600"
                    >
                      {blockOpen ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <Layers className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {block.name}
                    </span>
                    <span
                      className={cn(
                        "hidden shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase group-hover:inline",
                        BLOCK_TYPE_COLORS[block.blockType] ||
                          BLOCK_TYPE_COLORS.CUSTOM,
                      )}
                    >
                      {block.blockType}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100">
                      <TreeNodeActions
                        onAdd={() => onAddWeek(block.id)}
                        addTitle="Add week"
                        onClone={() => onCloneBlock(block.id)}
                        cloneTitle="Clone block"
                        onEdit={() => onEditBlock(block)}
                        editTitle="Edit block"
                        onDelete={() => onDeleteBlock(block)}
                        deleteTitle="Delete block"
                      />
                    </div>
                  </div>

                  {blockOpen && (
                    <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-2 dark:border-gray-600">
                      {weeks.length === 0 ? (
                        <li className="py-1 pl-2 text-[11px] text-gray-400">
                          <button
                            type="button"
                            onClick={() => onAddWeek(block.id)}
                            className="text-primary-600 hover:underline"
                          >
                            + Add week
                          </button>
                        </li>
                      ) : (
                        weeks.map((week) => {
                          const weekOpen = expandedWeeks.has(week.id);
                          const days = [...week.days].sort(
                            (a, b) => a.dayNumber - b.dayNumber,
                          );

                          return (
                            <li key={week.id}>
                              <div className="group flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-white dark:hover:bg-gray-700/50">
                                <button
                                  type="button"
                                  onClick={() => onToggleWeek(week.id)}
                                  className="rounded p-0.5 text-gray-400"
                                >
                                  {weekOpen ? (
                                    <ChevronDown className="h-3 w-3" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                </button>
                                <Calendar className="h-3 w-3 shrink-0 text-orange-500" />
                                <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {week.title}
                                </span>
                                <div className="opacity-0 group-hover:opacity-100">
                                  <TreeNodeActions
                                    onAdd={() => onAddDay(week.id)}
                                    addTitle="Add day"
                                    onClone={() => onCloneWeek(week)}
                                    cloneTitle="Clone week"
                                    onEdit={() => onEditWeek(week)}
                                    editTitle="Edit week"
                                    onDelete={() => onDeleteWeek(week)}
                                    deleteTitle="Delete week"
                                  />
                                </div>
                              </div>

                              {weekOpen && (
                                <ul className="ml-3 mt-0.5 space-y-0.5">
                                  {days.length === 0 ? (
                                    <li className="py-1 pl-2 text-[11px] text-gray-400">
                                      <button
                                        type="button"
                                        onClick={() => onAddDay(week.id)}
                                        className="text-primary-600 hover:underline"
                                      >
                                        + Add day
                                      </button>
                                    </li>
                                  ) : (
                                    days.map((day) => (
                                      <li key={day.id}>
                                        <button
                                          type="button"
                                          onClick={() => onSelectDay(day.id)}
                                          className={cn(
                                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                                            selectedDayId === day.id
                                              ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                                              : "text-gray-600 hover:bg-white dark:text-gray-400 dark:hover:bg-gray-700/50",
                                          )}
                                        >
                                          <Sun className="h-3 w-3 shrink-0 text-yellow-500" />
                                          <span className="truncate">
                                            {day.title}
                                          </span>
                                          <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                                            {day.exercises.length}
                                          </span>
                                        </button>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              )}
                            </li>
                          );
                        })
                      )}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
});

export function ProgramStructureEditor({
  programId,
  tree,
  onAddBlock,
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
}: ProgramStructureEditorProps) {
  const blocks = tree.blocks;
  const firstDayId = useMemo(() => findFirstDay(blocks), [blocks]);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedBlocks(allBlockIds(blocks));
    setExpandedWeeks(allWeekIds(blocks));
  }, [blocks]);

  useEffect(() => {
    const loc = findDayLocation(blocks, selectedDayId);
    if (!loc && firstDayId) setSelectedDayId(firstDayId);
  }, [blocks, selectedDayId, firstDayId]);

  const selection = findDayLocation(blocks, selectedDayId);

  if (blocks.length === 0) {
    return (
      <EmptySection
        icon={<Layers className="h-8 w-8" />}
        message="No blocks yet. Add a block to start building the program."
        actionLabel="Add Block"
        onAction={onAddBlock}
      />
    );
  }

  const nextSortOrder =
    selection && selection.day.exercises.length > 0
      ? Math.max(...selection.day.exercises.map((e) => e.sortOrder)) + 1
      : 0;

  return (
    <div className="flex min-h-[min(70vh,36rem)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <StructureSidebar
        blocks={blocks}
        selectedDayId={selectedDayId}
        expandedBlocks={expandedBlocks}
        expandedWeeks={expandedWeeks}
        onSelectDay={setSelectedDayId}
        onToggleBlock={(id) => setExpandedBlocks((s) => toggleInSet(s, id))}
        onToggleWeek={(id) => setExpandedWeeks((s) => toggleInSet(s, id))}
        onAddBlock={onAddBlock}
        onEditBlock={onEditBlock}
        onDeleteBlock={onDeleteBlock}
        onCloneBlock={onCloneBlock}
        onAddWeek={onAddWeek}
        onEditWeek={onEditWeek}
        onDeleteWeek={onDeleteWeek}
        onCloneWeek={onCloneWeek}
        onAddDay={onAddDay}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        {!selection ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-gray-500">
              Select a day from the tree, or add weeks and days to this program.
            </p>
            <Button size="sm" variant="secondary" onClick={onAddBlock}>
              Add block
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {selection.block.name} · {selection.week.title}
                </p>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {selection.day.title}
                </h2>
                {selection.day.focus && (
                  <p className="mt-0.5 text-sm text-gray-500">
                    {selection.day.focus}
                  </p>
                )}
              </div>
              <TreeNodeActions
                onEdit={() => onEditDay(selection.day)}
                editTitle="Edit day"
                onDelete={() => onDeleteDay(selection.day)}
                deleteTitle="Delete day"
                size="md"
              />
              <Button
                size="sm"
                onClick={() =>
                  onAddExercise(
                    selection.day.id,
                    selection.day.exercises,
                    nextSortOrder,
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Add exercise
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <ExerciseTable
                programId={programId}
                dayId={selection.day.id}
                exercises={selection.day.exercises}
                onAddExercise={() =>
                  onAddExercise(
                    selection.day.id,
                    selection.day.exercises,
                    nextSortOrder,
                  )
                }
                onEditExercise={(row) =>
                  onEditExercise(row, selection.day.id, selection.day.exercises)
                }
                onDeleteExercise={onDeleteExercise}
                onRefresh={onRefresh}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
