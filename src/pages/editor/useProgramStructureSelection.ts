import { useMemo, useState } from "react";
import {
  type BlockTree,
  type ProgramSelectionAnchor,
  findDayLocation,
  pickDayByNumber,
  resolveProgramStructureSelection,
  sortedDays,
  sortedWeeks,
} from "./programStructureUtils";

export function useProgramStructureSelection(blocks: BlockTree[]) {
  const [anchor, setAnchor] = useState<ProgramSelectionAnchor | null>(null);

  const resolved = useMemo(
    () => resolveProgramStructureSelection(blocks, anchor),
    [blocks, anchor],
  );

  function selectBlock(blockId: string) {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const weeks = sortedWeeks(block.weeks);
    const week = weeks[0];
    const days = week ? sortedDays(week.days) : [];
    setAnchor({
      blockId,
      weekId: week?.id ?? null,
      dayId: days[0]?.id ?? null,
    });
  }

  function selectWeek(weekId: string) {
    const current = resolveProgramStructureSelection(blocks, anchor);
    if (!current) return;
    const week = current.selectedBlock.weeks.find((w) => w.id === weekId);
    if (!week) return;
    const day = pickDayByNumber(week.days, current.selectedDay?.dayNumber);
    setAnchor({
      blockId: current.selectedBlock.id,
      weekId,
      dayId: day?.id ?? null,
    });
  }

  function selectDay(dayId: string) {
    const loc = findDayLocation(blocks, dayId);
    if (!loc) return;
    setAnchor({
      blockId: loc.block.id,
      weekId: loc.week.id,
      dayId: loc.day.id,
    });
  }

  return {
    selectedBlockId: resolved?.anchor.blockId ?? null,
    selectedBlock: resolved?.selectedBlock ?? null,
    blockWeeks: resolved?.blockWeeks ?? [],
    selectedWeek: resolved?.selectedWeek ?? null,
    weekDays: resolved?.weekDays ?? [],
    selectedDay: resolved?.selectedDay ?? null,
    selection: resolved?.selection ?? null,
    selectBlock,
    selectWeek,
    selectDay,
  };
}
