import { Layers } from "lucide-react";
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

type MobilePanel = "blocks" | "detail";

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

  function handleSelectBlock(blockId: string) {
    selectBlock(blockId);
    if (!isLgUp) setMobilePanel("detail");
  }

  const showBlocks = isLgUp || mobilePanel === "blocks";
  const showDetail = isLgUp || mobilePanel === "detail";

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
        />
      </div>

      <main
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
          !showDetail && "hidden lg:flex",
        )}
      >
        {!selectedBlock ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-gray-500">Select a block to begin.</p>
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
            showMobileBack={!isLgUp}
            onBackToBlocks={() => setMobilePanel("blocks")}
          />
        )}
      </main>
    </div>
  );
}
