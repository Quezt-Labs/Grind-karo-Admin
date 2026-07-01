import type { Block, Week, Day, ExerciseRow } from "@/types/programs";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProgramWeekStrip } from "./ProgramWeekStrip";
import { ProgramDayTabs } from "./ProgramDayTabs";
import { ProgramBlockHeader } from "./ProgramBlockHeader";
import { ProgramDayHeader } from "./ProgramDayHeader";
import { ProgramDayEditorPanel } from "./ProgramDayEditorPanel";
import type {
  BlockTree,
  ProgramDayLocation,
  WeekTree,
  DayTree,
} from "./programStructureUtils";
import { computeBlockDateRange, formatWeekDateRange } from "@/utils/weekDates";
import { nextExerciseSortOrder } from "@/utils/exerciseSortOrder";

export interface ProgramStructureMainProps {
  programId: string;
  selectedBlock: BlockTree;
  blockWeeks: WeekTree[];
  selectedWeek: WeekTree | null;
  weekDays: DayTree[];
  selectedDay: DayTree | null;
  selection: ProgramDayLocation | null;
  onAddWeek: (blockId: string) => void;
  onEditBlock: (block: Block) => void;
  onDeleteBlock: (block: Block) => void;
  onEditWeek: (week: Week) => void;
  onDeleteWeek: (week: Week) => void;
  onCloneWeek: (week: Week) => void;
  onAddDay: (weekId: string) => void;
  onSelectWeek: (weekId: string) => void;
  onSelectDay: (dayId: string) => void;
  onEditDay: (day: Day) => void;
  onDeleteDay: (day: Day) => void;
  onAddExercise: (
    dayId: string,
    dayExercises: ExerciseRow[],
    nextSortOrder: number,
  ) => void;
  onEditExercise: (
    row: ExerciseRow,
    dayId: string,
    dayExercises: ExerciseRow[],
  ) => void;
  onDeleteExercise: (row: ExerciseRow) => void;
  onRefresh: () => void;
  showMobileBack?: boolean;
  onBackToBlocks?: () => void;
}

const STICKY_NAV_CLASS =
  "sticky top-0 z-20 shrink-0 divide-y divide-gray-200 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800/95";

export function ProgramStructureMain({
  programId,
  selectedBlock,
  blockWeeks,
  selectedWeek,
  weekDays,
  selectedDay,
  selection,
  onAddWeek,
  onEditBlock,
  onDeleteBlock,
  onEditWeek,
  onDeleteWeek,
  onCloneWeek,
  onAddDay,
  onSelectWeek,
  onSelectDay,
  onEditDay,
  onDeleteDay,
  onAddExercise,
  onEditExercise,
  onDeleteExercise,
  onRefresh,
  showMobileBack = false,
  onBackToBlocks,
}: ProgramStructureMainProps) {
  const blockRange = computeBlockDateRange(selectedBlock.weeks);
  const blockRangeLabel = blockRange
    ? formatWeekDateRange(blockRange.weekStart, blockRange.weekEnd)
    : null;

  const weekRangeLabel = selection
    ? formatWeekDateRange(selection.week.weekStart, selection.week.weekEnd)
    : null;

  const nextSortOrder =
    selection && selection.day.exercises.length > 0
      ? nextExerciseSortOrder(selection.day.exercises)
      : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className={STICKY_NAV_CLASS}>
        {showMobileBack && onBackToBlocks && (
          <div className="border-b border-gray-100 px-3 py-2 dark:border-gray-700/60 lg:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBackToBlocks}
              className="gap-1 text-gray-600 dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Blocks
            </Button>
          </div>
        )}

        <ProgramBlockHeader
          block={selectedBlock}
          blockRangeLabel={blockRangeLabel}
          onAddWeek={() => onAddWeek(selectedBlock.id)}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
        />

        <ProgramWeekStrip
          weeks={blockWeeks}
          selectedWeekId={selectedWeek?.id ?? null}
          onSelectWeek={onSelectWeek}
          onAddWeek={() => onAddWeek(selectedBlock.id)}
          onEditWeek={onEditWeek}
          onCloneWeek={onCloneWeek}
          onDeleteWeek={onDeleteWeek}
        />

        <ProgramDayTabs
          days={weekDays}
          selectedDayId={selectedDay?.id ?? null}
          onSelectDay={onSelectDay}
          onAddDay={() => selectedWeek && onAddDay(selectedWeek.id)}
        />

        {selection && (
          <ProgramDayHeader
            programId={programId}
            selection={selection}
            weekRangeLabel={weekRangeLabel}
            nextSortOrder={nextSortOrder}
            onEditDay={onEditDay}
            onDeleteDay={onDeleteDay}
            onAddExercise={onAddExercise}
            onRefresh={onRefresh}
          />
        )}
      </div>

      {!selection ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add a week and day to start programming exercises.
          </p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onAddWeek(selectedBlock.id)}
          >
            Add week
          </Button>
        </div>
      ) : (
        <ProgramDayEditorPanel
          programId={programId}
          selection={selection}
          nextSortOrder={nextSortOrder}
          onAddExercise={onAddExercise}
          onEditExercise={onEditExercise}
          onDeleteExercise={onDeleteExercise}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
