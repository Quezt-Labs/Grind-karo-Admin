import type { ExerciseRow } from "@/types/programs";
import { formatPercent } from "./programConstants";
import {
  sortedBlocks,
  sortedDays,
  sortedWeeks,
  type BlockTree,
  type DayTree,
  type WeekTree,
} from "./programStructureUtils";
import { formatWeekDateRange } from "@/utils/weekDates";

export function exerciseDisplayName(row: ExerciseRow): string {
  return row.resolvedName || row.exerciseNameOverride || "—";
}

export function exercisePrescription(row: ExerciseRow): string {
  const parts: string[] = [];
  if (row.sets != null) parts.push(`${row.sets} sets`);
  if (row.repScheme) parts.push(row.repScheme);
  if (row.percentOneRm != null) parts.push(formatPercent(row.percentOneRm));
  else if (row.targetRpe) parts.push(`RPE ${row.targetRpe}`);
  else if (row.loadKg != null) parts.push(`${row.loadKg} kg`);
  return parts.length ? parts.join(" · ") : "—";
}

export interface WeekStats {
  days: number;
  exercises: number;
}

export function weekStats(week: WeekTree): WeekStats {
  const days = sortedDays(week.days);
  const exercises = days.reduce((n, d) => n + d.exercises.length, 0);
  return { days: days.length, exercises };
}

export interface BlockStats {
  weeks: number;
  days: number;
  exercises: number;
}

export function blockStats(block: BlockTree): BlockStats {
  const weeks = sortedWeeks(block.weeks);
  let days = 0;
  let exercises = 0;
  for (const week of weeks) {
    const weekDays = sortedDays(week.days);
    days += weekDays.length;
    exercises += weekDays.reduce((n, d) => n + d.exercises.length, 0);
  }
  return { weeks: weeks.length, days, exercises };
}

export function weekLabel(week: WeekTree, blockName?: string): string {
  const dateRange = formatWeekDateRange(week.weekStart, week.weekEnd);
  const base = week.title
    ? `Week ${week.weekNumber} — ${week.title}`
    : `Week ${week.weekNumber}`;
  const withBlock = blockName ? `${blockName} · ${base}` : base;
  return dateRange ? `${withBlock} (${dateRange})` : withBlock;
}

export function weekShortLabel(week: WeekTree): string {
  return week.title
    ? `Week ${week.weekNumber} — ${week.title}`
    : `Week ${week.weekNumber}`;
}

export interface AlignedDayPair {
  dayNumber: number;
  left: DayTree | null;
  right: DayTree | null;
}

export function alignDaysByNumber(
  leftDays: DayTree[],
  rightDays: DayTree[],
): AlignedDayPair[] {
  const numbers = new Set<number>();
  for (const d of leftDays) numbers.add(d.dayNumber);
  for (const d of rightDays) numbers.add(d.dayNumber);
  const sorted = [...numbers].sort((a, b) => a - b);
  const leftMap = new Map(leftDays.map((d) => [d.dayNumber, d]));
  const rightMap = new Map(rightDays.map((d) => [d.dayNumber, d]));
  return sorted.map((dayNumber) => ({
    dayNumber,
    left: leftMap.get(dayNumber) ?? null,
    right: rightMap.get(dayNumber) ?? null,
  }));
}

export interface AlignedExercisePair {
  index: number;
  left: ExerciseRow | null;
  right: ExerciseRow | null;
  differs: boolean;
}

export function alignExercisesByIndex(
  left: ExerciseRow[],
  right: ExerciseRow[],
): AlignedExercisePair[] {
  const max = Math.max(left.length, right.length);
  const pairs: AlignedExercisePair[] = [];
  for (let i = 0; i < max; i++) {
    const l = left[i] ?? null;
    const r = right[i] ?? null;
    pairs.push({ index: i, left: l, right: r, differs: exercisesDiffer(l, r) });
  }
  return pairs;
}

function exercisesDiffer(
  left: ExerciseRow | null,
  right: ExerciseRow | null,
): boolean {
  if (!left || !right) return true;
  return (
    exerciseDisplayName(left) !== exerciseDisplayName(right) ||
    left.sets !== right.sets ||
    (left.repScheme ?? "") !== (right.repScheme ?? "") ||
    (left.targetRpe ?? "") !== (right.targetRpe ?? "") ||
    left.percentOneRm !== right.percentOneRm ||
    left.loadKg !== right.loadKg
  );
}

export interface AlignedWeekPair {
  weekNumber: number;
  left: WeekTree | null;
  right: WeekTree | null;
}

export function alignWeeksByNumber(
  leftWeeks: WeekTree[],
  rightWeeks: WeekTree[],
): AlignedWeekPair[] {
  const numbers = new Set<number>();
  for (const w of leftWeeks) numbers.add(w.weekNumber);
  for (const w of rightWeeks) numbers.add(w.weekNumber);
  const sorted = [...numbers].sort((a, b) => a - b);
  const leftMap = new Map(leftWeeks.map((w) => [w.weekNumber, w]));
  const rightMap = new Map(rightWeeks.map((w) => [w.weekNumber, w]));
  return sorted.map((weekNumber) => ({
    weekNumber,
    left: leftMap.get(weekNumber) ?? null,
    right: rightMap.get(weekNumber) ?? null,
  }));
}

export { sortedBlocks, sortedWeeks, sortedDays };
