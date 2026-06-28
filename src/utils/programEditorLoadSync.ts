import type {
  ExerciseRow,
  MovementSlot,
  UpdateExerciseRowPayload,
} from "@/types/programs";
import {
  computeDayPreview,
  type PreviewInputs,
} from "@/utils/programPreviewCompute";

export type AutoLoadPatch = Pick<
  UpdateExerciseRowPayload,
  "computedLoadKg" | "loadSource"
>;

function applyDraft(
  dayExercises: ExerciseRow[],
  rowId: string,
  payload: UpdateExerciseRowPayload,
): ExerciseRow[] {
  return dayExercises.map((row) =>
    row.id === rowId ? { ...row, ...payload } : row,
  );
}

/** When %1RM is set, persist PERCENT_1RM instead of default RPE_CHART. */
export function syncLoadComputationFromPercent(
  row: ExerciseRow | undefined,
  payload: UpdateExerciseRowPayload,
): UpdateExerciseRowPayload {
  if (!row) return payload;

  const percentOneRm =
    payload.percentOneRm !== undefined
      ? payload.percentOneRm
      : row.percentOneRm;
  const loadComputation =
    payload.loadComputation ?? row.loadComputation ?? "RPE_CHART";

  if (
    percentOneRm != null &&
    percentOneRm > 0 &&
    loadComputation === "RPE_CHART"
  ) {
    return { ...payload, loadComputation: "PERCENT_1RM" };
  }

  return payload;
}

/** Merge auto-computed template load into a prescription patch. */
export function withAutoComputedLoad(
  dayExercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
  rowId: string,
  payload: UpdateExerciseRowPayload,
): UpdateExerciseRowPayload {
  const row = dayExercises.find((r) => r.id === rowId);
  const syncedPayload = syncLoadComputationFromPercent(row, payload);
  const draft = applyDraft(dayExercises, rowId, syncedPayload);
  const rowIds = rowIdsNeedingLoadSync(draft, rowId);
  const patches = buildAutoLoadPatchesForDay(draft, slots, inputs, rowIds);
  const primary = patches.get(rowId);
  if (!primary) return syncedPayload;
  return { ...syncedPayload, ...primary };
}

/** Rows whose template load should refresh after a prescription edit (incl. PERCENT_OF_ROW deps). */
export function rowIdsNeedingLoadSync(
  dayExercises: ExerciseRow[],
  triggerRowId: string,
): string[] {
  const sorted = [...dayExercises].sort((a, b) => a.sortOrder - b.sortOrder);
  const triggerIdx = sorted.findIndex((r) => r.id === triggerRowId);
  if (triggerIdx < 0) return [triggerRowId];

  const ids = new Set<string>([triggerRowId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of sorted) {
      if (
        row.loadComputation === "PERCENT_OF_ROW" &&
        row.loadRefExerciseId &&
        ids.has(row.loadRefExerciseId) &&
        !ids.has(row.id)
      ) {
        ids.add(row.id);
        changed = true;
      }
    }
  }

  return sorted.filter((r) => ids.has(r.id)).map((r) => r.id);
}

export function buildAutoLoadPatchesForDay(
  dayExercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
  rowIds: string[],
): Map<string, AutoLoadPatch> {
  const preview = computeDayPreview(
    dayExercises,
    slots,
    inputs,
    {},
    {
      ignoreFixedLoad: true,
    },
  );
  const patches = new Map<string, AutoLoadPatch>();

  for (const rowId of rowIds) {
    const state = preview.get(rowId);
    const row = dayExercises.find((e) => e.id === rowId);
    if (!state || state.hidden || !row) continue;

    if ((row.loadComputation ?? "RPE_CHART") === "NONE") {
      patches.set(rowId, { computedLoadKg: null, loadSource: null });
      continue;
    }

    patches.set(rowId, {
      computedLoadKg: state.load,
      loadSource: state.loadSource,
    });
  }

  return patches;
}

/** Recompute template loads for every row on a day (reference 1RM + formulas). */
export function buildAutoLoadPatchesForEntireDay(
  dayExercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
): Map<string, AutoLoadPatch> {
  return buildAutoLoadPatchesForDay(
    dayExercises,
    slots,
    inputs,
    dayExercises.map((row) => row.id),
  );
}

/** Rows whose stored template load differs from the freshly computed patch. */
export function patchesNeedPersisting(
  dayExercises: ExerciseRow[],
  patches: Map<string, AutoLoadPatch>,
): Array<{ rowId: string; patch: AutoLoadPatch }> {
  const updates: Array<{ rowId: string; patch: AutoLoadPatch }> = [];
  for (const [rowId, patch] of patches) {
    const row = dayExercises.find((r) => r.id === rowId);
    if (!row) continue;
    const sameLoad =
      (row.computedLoadKg ?? null) === (patch.computedLoadKg ?? null);
    const sameSource = (row.loadSource ?? null) === (patch.loadSource ?? null);
    if (sameLoad && sameSource) continue;
    updates.push({ rowId, patch });
  }
  return updates;
}

/** Dependent rows (PERCENT_OF_ROW) that need a separate save after the primary row updates. */
export function getCascadeLoadPatches(
  dayExercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
  rowId: string,
  payload: UpdateExerciseRowPayload,
): Map<string, AutoLoadPatch> {
  const draft = applyDraft(dayExercises, rowId, payload);
  const rowIds = rowIdsNeedingLoadSync(draft, rowId).filter(
    (id) => id !== rowId,
  );
  if (rowIds.length === 0) return new Map();
  return buildAutoLoadPatchesForDay(draft, slots, inputs, rowIds);
}

export function autoLoadPatchForFormRow(
  dayExercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
  rowId: string | undefined,
  payload: UpdateExerciseRowPayload & { category?: ExerciseRow["category"] },
): AutoLoadPatch | null {
  if (rowId) {
    const draft = dayExercises.map((row) =>
      row.id === rowId ? { ...row, ...payload } : row,
    );
    const patches = buildAutoLoadPatchesForDay(draft, slots, inputs, [rowId]);
    return patches.get(rowId) ?? null;
  }

  if (!payload.category) return null;

  const virtualId = "__draft__";
  const virtualRow: ExerciseRow = {
    id: virtualId,
    dayId: "",
    sortOrder: payload.sortOrder ?? dayExercises.length,
    category: payload.category,
    exerciseId: payload.exerciseId ?? null,
    exerciseNameOverride: payload.exerciseNameOverride ?? null,
    sets: payload.sets ?? null,
    repScheme: payload.repScheme ?? null,
    targetRpe: payload.targetRpe ?? null,
    percentOneRm: payload.percentOneRm ?? null,
    loadKg: payload.loadKg ?? null,
    loadNote: payload.loadNote ?? null,
    notes: payload.notes ?? null,
    movementSlotId: payload.movementSlotId ?? null,
    loadComputation: payload.loadComputation ?? "RPE_CHART",
    loadRefFactor: payload.loadRefFactor ?? null,
    loadRefExerciseId: payload.loadRefExerciseId ?? null,
    hasPlateCheck: payload.hasPlateCheck ?? false,
  };

  const patches = buildAutoLoadPatchesForDay(
    [...dayExercises, virtualRow],
    slots,
    inputs,
    [virtualId],
  );
  return patches.get(virtualId) ?? null;
}
