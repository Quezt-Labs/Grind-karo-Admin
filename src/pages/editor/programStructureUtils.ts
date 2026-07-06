import type { ProgramTree } from "@/types/programs";

export type BlockTree = ProgramTree["blocks"][number];
export type WeekTree = BlockTree["weeks"][number];
export type DayTree = WeekTree["days"][number];

export interface ProgramDayLocation {
  block: BlockTree;
  week: WeekTree;
  day: DayTree;
}

export interface ProgramSelectionAnchor {
  blockId: string;
  weekId: string | null;
  dayId: string | null;
}

export interface ResolvedProgramSelection {
  anchor: ProgramSelectionAnchor;
  selectedBlock: BlockTree;
  selectedWeek: WeekTree | null;
  selectedDay: DayTree | null;
  blockWeeks: WeekTree[];
  weekDays: DayTree[];
  selection: ProgramDayLocation | null;
}

export function resolveProgramStructureSelection(
  blocks: BlockTree[],
  anchor: ProgramSelectionAnchor | null,
): ResolvedProgramSelection | null {
  const orderedBlocks = sortedBlocks(blocks);
  const first = findFirstSelection(blocks);
  const block =
    orderedBlocks.find((b) => b.id === anchor?.blockId) ??
    first?.block ??
    orderedBlocks[0];
  if (!block) return null;

  const blockWeeks = sortedWeeks(block.weeks);
  const week =
    blockWeeks.find((w) => w.id === anchor?.weekId) ??
    blockWeeks.find((w) => w.id === first?.week.id) ??
    blockWeeks[0] ??
    null;

  const weekDays = week ? sortedDays(week.days) : [];
  const day =
    weekDays.find((d) => d.id === anchor?.dayId) ??
    weekDays.find((d) => d.id === first?.day.id) ??
    weekDays[0] ??
    null;

  const resolvedAnchor: ProgramSelectionAnchor = {
    blockId: block.id,
    weekId: week?.id ?? null,
    dayId: day?.id ?? null,
  };

  return {
    anchor: resolvedAnchor,
    selectedBlock: block,
    selectedWeek: week,
    selectedDay: day,
    blockWeeks,
    weekDays,
    selection: week && day ? { block, week, day } : null,
  };
}

export function sortedBlocks(blocks: BlockTree[]) {
  return [...blocks].sort((a, b) => a.displayOrder - b.displayOrder);
}

export function sortedWeeks(weeks: WeekTree[]) {
  return [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);
}

export function sortedDays(days: DayTree[]) {
  return [...days].sort((a, b) => a.dayNumber - b.dayNumber);
}

/** Keep the same day number when switching weeks (e.g. Day 3 → Day 3). */
export function pickDayByNumber(
  days: DayTree[],
  preferredDayNumber: number | null | undefined,
): DayTree | null {
  const sorted = sortedDays(days);
  if (sorted.length === 0) return null;
  if (preferredDayNumber == null) return sorted[0] ?? null;
  return sorted.find((d) => d.dayNumber === preferredDayNumber) ?? sorted[0];
}

export function findFirstSelection(
  blocks: BlockTree[],
): ProgramDayLocation | null {
  for (const block of sortedBlocks(blocks)) {
    const weeks = sortedWeeks(block.weeks);
    for (const week of weeks) {
      const days = sortedDays(week.days);
      if (days[0]) return { block, week, day: days[0] };
    }
  }
  return null;
}

export function findDayLocation(
  blocks: BlockTree[],
  dayId: string | null,
): ProgramDayLocation | null {
  if (!dayId) return null;
  for (const block of sortedBlocks(blocks)) {
    for (const week of block.weeks) {
      const day = week.days.find((d) => d.id === dayId);
      if (day) return { block, week, day };
    }
  }
  return null;
}
