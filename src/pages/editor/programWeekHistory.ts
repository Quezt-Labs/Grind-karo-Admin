import type { ExerciseRow } from "@/types/programs";
import { formatPercent } from "./programConstants";
import {
  sortedDays,
  sortedWeeks,
  type WeekTree,
} from "./programStructureUtils";

export interface PriorWeekColumn {
  weekNumber: number;
  label: string;
}

export function buildPriorWeekColumns(
  blockWeeks: WeekTree[],
  currentWeekNumber: number,
): PriorWeekColumn[] {
  return sortedWeeks(blockWeeks)
    .filter((w) => w.weekNumber < currentWeekNumber)
    .map((w) => ({
      weekNumber: w.weekNumber,
      label: `W${w.weekNumber}`,
    }));
}

export function getPriorWeekExercise(
  blockWeeks: WeekTree[],
  weekNumber: number,
  dayNumber: number,
  slotOrIndex: string | number,
): ExerciseRow | null {
  const week = sortedWeeks(blockWeeks).find((w) => w.weekNumber === weekNumber);
  if (!week) return null;

  const day = sortedDays(week.days).find((d) => d.dayNumber === dayNumber);
  if (!day) return null;

  if (typeof slotOrIndex === "string") {
    return (
      day.exercises.find((e) => e.prescriptionSlotId === slotOrIndex) ?? null
    );
  }

  const exercises = [...day.exercises].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id),
  );
  return exercises[slotOrIndex] ?? null;
}

/** Compact history cell split across two lines for readability */
export interface PrescriptionLines {
  volume: string | null;
  intensity: string | null;
}

export function exercisePrescriptionLines(row: ExerciseRow): PrescriptionLines {
  let volume: string | null = null;
  if (row.sets != null && row.repScheme) {
    volume = `${row.sets}×${row.repScheme}`;
  } else if (row.sets != null) {
    volume = `${row.sets}×`;
  } else if (row.repScheme) {
    volume = row.repScheme;
  }

  let intensity: string | null = null;
  if (row.percentOneRm != null) {
    intensity = formatPercent(row.percentOneRm);
  } else if (row.targetRpe) {
    const rpe = row.targetRpe.trim();
    intensity = rpe.startsWith("@") ? rpe : `@${rpe}`;
  } else if (row.loadKg != null) {
    intensity = `${row.loadKg} kg`;
  } else if (row.computedLoadKg != null) {
    intensity = `${row.computedLoadKg} kg`;
  }

  return { volume, intensity };
}

/** Compact history cell, e.g. "2×6 @7" or "3×4 85%" or "150kg" */
export function exercisePrescriptionShort(row: ExerciseRow): string {
  const { volume, intensity } = exercisePrescriptionLines(row);
  const parts = [volume, intensity].filter(Boolean);
  return parts.length ? parts.join(" ") : "—";
}

export function prescriptionsMatch(
  a: ExerciseRow | null,
  b: ExerciseRow | null,
): boolean {
  if (!a || !b) return a === b;
  const la = exercisePrescriptionLines(a);
  const lb = exercisePrescriptionLines(b);
  return la.volume === lb.volume && la.intensity === lb.intensity;
}

export function priorWeekCellTitle(
  weekLabel: string,
  row: ExerciseRow | null,
): string {
  if (!row) return `${weekLabel}: no exercise at this slot`;
  const name = row.resolvedName || row.exerciseNameOverride || "Exercise";
  return `${weekLabel}: ${name} — ${exercisePrescriptionShort(row)}`;
}
