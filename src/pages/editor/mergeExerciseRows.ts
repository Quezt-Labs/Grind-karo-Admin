import { programService } from "@/services/programService";
import type { CreateExerciseSetPayload, ExerciseRow } from "@/types/programs";

function parseRpe(targetRpe: string | null): number | null {
  if (!targetRpe) return null;
  const n = parseFloat(targetRpe.replace("@", "").trim());
  return Number.isNaN(n) ? null : n;
}

function rowToSetPayload(
  setNumber: number,
  row: ExerciseRow,
): CreateExerciseSetPayload {
  const repsFromScheme = row.repScheme
    ? Number.parseInt(row.repScheme, 10)
    : NaN;
  return {
    setNumber,
    percentOneRm: row.percentOneRm != null ? row.percentOneRm / 100 : null,
    reps: !Number.isNaN(repsFromScheme) ? repsFromScheme : null,
    repScheme: row.repScheme || null,
    targetRpe: parseRpe(row.targetRpe),
    absoluteWeightKg: row.loadKg ?? null,
    notes: row.notes || null,
  };
}

export async function mergeExerciseRows(
  programId: string,
  rows: ExerciseRow[],
): Promise<void> {
  const sorted = [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
  const keep = sorted[0]!;
  const extras = sorted.slice(1);

  let nextSetNumber = 1;

  if ((keep.exerciseSets?.length ?? 0) === 0) {
    await programService.createExerciseSet(
      programId,
      keep.id,
      rowToSetPayload(nextSetNumber, keep),
    );
    nextSetNumber++;
  } else {
    nextSetNumber = (keep.exerciseSets?.length ?? 0) + 1;
  }

  for (const row of extras) {
    if ((row.exerciseSets?.length ?? 0) > 0) {
      for (const s of [...(row.exerciseSets ?? [])].sort(
        (a, b) => a.setNumber - b.setNumber,
      )) {
        await programService.createExerciseSet(programId, keep.id, {
          setNumber: nextSetNumber,
          percentOneRm: s.percentOneRm,
          reps: s.reps,
          repScheme: s.repScheme,
          targetRpe: s.targetRpe,
          absoluteWeightKg: s.absoluteWeightKg,
          notes: s.notes,
        });
        nextSetNumber++;
      }
    } else {
      await programService.createExerciseSet(
        programId,
        keep.id,
        rowToSetPayload(nextSetNumber, row),
      );
      nextSetNumber++;
    }
    await programService.removeExerciseRow(programId, row.id);
  }

  const totalSets = nextSetNumber - 1;
  await programService.updateExerciseRow(programId, keep.id, {
    sets: totalSets > 0 ? totalSets : null,
    targetRpe: null,
    loadKg: null,
    percentOneRm: null,
    repScheme: null,
  });
}
