import type { ExerciseRow } from "@/types/programs";
import { sortDayExercises } from "@/utils/exerciseSortOrder";

export interface DuplicateExerciseGroup {
  rowIds: string[];
  displayName: string;
  startIndex: number;
}

function rowDisplayName(row: ExerciseRow): string {
  return row.resolvedName || row.exerciseNameOverride || "Exercise";
}

function sameExerciseIdentity(a: ExerciseRow, b: ExerciseRow): boolean {
  if (a.exerciseId && b.exerciseId) return a.exerciseId === b.exerciseId;
  const nameA = rowDisplayName(a).toLowerCase().trim();
  const nameB = rowDisplayName(b).toLowerCase().trim();
  if (nameA !== nameB) return false;
  if (a.movementSlotId || b.movementSlotId) {
    return a.movementSlotId === b.movementSlotId;
  }
  return true;
}

function looksLikeRampClone(row: ExerciseRow): boolean {
  if ((row.exerciseSets?.length ?? 0) > 0) return false;
  return row.sets === 1 || row.sets == null;
}

export function detectDuplicateExerciseGroups(
  exercises: ExerciseRow[],
): DuplicateExerciseGroup[] {
  const sorted = sortDayExercises(exercises);
  const groups: DuplicateExerciseGroup[] = [];
  let i = 0;

  while (i < sorted.length) {
    const start = sorted[i]!;
    if (!looksLikeRampClone(start)) {
      i++;
      continue;
    }

    const group: ExerciseRow[] = [start];
    let j = i + 1;
    while (j < sorted.length) {
      const next = sorted[j]!;
      if (!looksLikeRampClone(next) || !sameExerciseIdentity(start, next)) {
        break;
      }
      group.push(next);
      j++;
    }

    if (group.length >= 2) {
      groups.push({
        rowIds: group.map((r) => r.id),
        displayName: rowDisplayName(start),
        startIndex: sorted.findIndex((r) => r.id === start.id),
      });
    }
    i = j;
  }

  return groups;
}
