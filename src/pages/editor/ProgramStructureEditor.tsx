import { ChevronRight, Layers } from "lucide-react";
import { useState } from "react";
import type {
  ProgramTree,
  Block,
  Week,
  Day,
  ExerciseRow,
} from "@/types/programs";
import { cn } from "@/utils/cn";
import { useIsLgUp } from "@/hooks/useMediaQuery";
import { EmptySection } from "./ProgramShared";
import { Button } from "@/components/ui/Button";
import { ProgramBlockSidebar } from "./ProgramBlockSidebar";
import { ProgramStructureMain } from "./ProgramStructureMain";
import { useProgramStructureSelection } from "./useProgramStructureSelection";
import { useBlockSidebarCollapsed } from "./useProgramEditorChrome";
import { ProgramEditorAthleteVideosPanel } from "./ProgramEditorAthleteVideosPanel";

type MobilePanel = "blocks" | "detail";

export interface ProgramStructureEditorProps {
  programId: string;
  tree: ProgramTree;
  coachingUserId?: string | null;
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
  expandExerciseRowId?: string | null;
  onExpandConsumed?: () => void;
}

export function ProgramStructureEditor({
  programId,
  tree,
  coachingUserId,
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
  expandExerciseRowId,
  onExpandConsumed,
}: ProgramStructureEditorProps) {
  const blocks = tree.blocks;
  const {
    selectedBlockId,
    selectedBlock,
    blockWeeks,
    selectedWeek,
    weekDays,
    selectedDay,
    selection,
    selectBlock,
    selectWeek,
    selectDay,
  } = useProgramStructureSelection(blocks);

  const isLgUp = useIsLgUp();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("blocks");
  const { collapsed, toggle } = useBlockSidebarCollapsed();
  const [videosOpen, setVideosOpen] = useState(!!coachingUserId);

  function handleSelectBlock(blockId: string) {
    selectBlock(blockId);
    if (!isLgUp) setMobilePanel("detail");
  }

  const showBlocks = isLgUp || mobilePanel === "blocks";
  const showDetail = isLgUp || mobilePanel === "detail";
  const sidebarHiddenOnDesktop = isLgUp && collapsed;

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

  return (
    <div className="flex min-h-[min(70vh,36rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:flex-row">
      <div
        className={cn(
          "min-h-0 shrink-0",
          sidebarHiddenOnDesktop && "lg:hidden",
          !showBlocks && "hidden lg:block",
          showBlocks &&
            "flex min-h-0 flex-1 flex-col lg:min-h-[min(70vh,36rem)] lg:flex-none",
        )}
      >
        <ProgramBlockSidebar
          blocks={blocks}
          selectedBlockId={selectedBlockId}
          onSelectBlock={handleSelectBlock}
          onAddBlock={onAddBlock}
          onEditBlock={onEditBlock}
          onDeleteBlock={onDeleteBlock}
          onCloneBlock={onCloneBlock}
          onCollapse={isLgUp ? toggle : undefined}
        />
      </div>

      <main
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          !showDetail && "hidden lg:flex",
        )}
      >
        {(sidebarHiddenOnDesktop || coachingUserId) && (
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700">
            {sidebarHiddenOnDesktop && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={toggle}
                className="h-8 gap-1.5 text-xs text-gray-600 dark:text-gray-300"
                title="Show blocks"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                Blocks
              </Button>
            )}
            {coachingUserId && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setVideosOpen((v) => !v)}
                className="ml-auto h-8 text-xs"
              >
                {videosOpen ? "Hide videos" : "Athlete videos"}
              </Button>
            )}
          </div>
        )}

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {!selectedBlock ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Select a block to begin.
                </p>
                <Button size="sm" variant="secondary" onClick={onAddBlock}>
                  Add block
                </Button>
              </div>
            ) : (
              <ProgramStructureMain
                programId={programId}
                selectedBlock={selectedBlock}
                blockWeeks={blockWeeks}
                selectedWeek={selectedWeek}
                weekDays={weekDays}
                selectedDay={selectedDay}
                selection={selection}
                onAddWeek={onAddWeek}
                onEditBlock={onEditBlock}
                onDeleteBlock={onDeleteBlock}
                onEditWeek={onEditWeek}
                onDeleteWeek={onDeleteWeek}
                onCloneWeek={onCloneWeek}
                onAddDay={onAddDay}
                onSelectWeek={selectWeek}
                onSelectDay={selectDay}
                onEditDay={onEditDay}
                onDeleteDay={onDeleteDay}
                onAddExercise={onAddExercise}
                onEditExercise={onEditExercise}
                onDeleteExercise={onDeleteExercise}
                onRefresh={onRefresh}
                expandExerciseRowId={expandExerciseRowId}
                onExpandConsumed={onExpandConsumed}
                showMobileBack={!isLgUp}
                onBackToBlocks={() => setMobilePanel("blocks")}
              />
            )}
          </div>
          {videosOpen && coachingUserId && (
            <ProgramEditorAthleteVideosPanel
              userId={coachingUserId}
              onClose={() => setVideosOpen(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
