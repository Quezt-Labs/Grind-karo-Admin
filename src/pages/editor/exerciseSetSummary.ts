import type { ExerciseRow, ExerciseSet } from "@/types/programs";

function formatRpe(rpe: number | string | null | undefined): string | null {
  if (rpe == null || rpe === "") return null;
  const n = typeof rpe === "string" ? parseFloat(rpe.replace("@", "")) : rpe;
  if (Number.isNaN(n)) return typeof rpe === "string" ? rpe : null;
  return `@${Number.isInteger(n) ? n : n}`;
}

function formatLoadKg(kg: number | null | undefined): string | null {
  if (kg == null) return null;
  return Number.isInteger(kg) ? `${kg}` : kg.toFixed(1);
}

function setLoadLabel(set: ExerciseSet): string | null {
  if (set.absoluteWeightKg != null)
    return `${formatLoadKg(set.absoluteWeightKg)}kg`;
  if (set.percentOneRm != null) return `${set.percentOneRm}%`;
  return null;
}

function rangeLabel(values: string[]): string | null {
  const unique = [...new Set(values.filter(Boolean))];
  if (unique.length === 0) return null;
  if (unique.length === 1) return unique[0]!;
  return `${unique[0]}→${unique[unique.length - 1]}`;
}

export function formatExerciseSetSummary(row: ExerciseRow): string | null {
  const sets = row.exerciseSets ?? [];
  if (sets.length === 0) return null;

  const sorted = [...sets].sort((a, b) => a.setNumber - b.setNumber);
  const parts: string[] = [`${sorted.length} sets`];

  const rpes = sorted
    .map((s) => formatRpe(s.targetRpe))
    .filter(Boolean) as string[];
  const rpeRange = rangeLabel(rpes);
  if (rpeRange) parts.push(rpeRange);

  const loads = sorted.map(setLoadLabel).filter(Boolean) as string[];
  const loadRange = rangeLabel(loads);
  if (loadRange) parts.push(loadRange);

  return parts.join(" · ");
}

export function hasPerSetPrescription(row: ExerciseRow): boolean {
  return (row.exerciseSets?.length ?? 0) > 0;
}
