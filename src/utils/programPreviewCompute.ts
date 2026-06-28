import type {
  ExerciseRow,
  MovementSlot,
  MovementOption,
  LoadComputation,
} from "@/types/programs";
import {
  computeRowLoad,
  effectiveFixedLoadKg,
  mround,
  type E1rmInputs,
} from "@/utils/programFormulas";

export interface PreviewInputs {
  squat: number;
  bench: number;
  deadlift: number;
  has125kgPlates: boolean;
  movementSelections: Record<string, string>;
}

export interface PreviewRowState {
  resolvedName: string;
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null;
  loadNote: string | null;
  notes: string | null;
  hidden: boolean;
  load: number | null;
  loadSource: "percent" | "rpe" | null;
}

function plateIncrement(has125kgPlates: boolean): number {
  return has125kgPlates ? 2.5 : 5;
}

function pickSlotOption(
  slotOptions: MovementOption[],
  selectedId: string | undefined,
): MovementOption | undefined {
  if (selectedId) {
    return slotOptions.find((o) => o.id === selectedId);
  }
  return slotOptions.find((o) => o.isDefault) ?? slotOptions[0];
}

function resolvePreviewFields(
  row: ExerciseRow,
  slots: MovementSlot[],
  selections: Record<string, string>,
): {
  resolvedName: string;
  sets: number | null;
  repScheme: string | null;
  targetRpe: string | null;
  percentOneRm: number | null;
  loadNote: string | null;
  notes: string | null;
  loadComputation: LoadComputation;
  loadRefFactor: number | null;
  loadRefExerciseId: string | null;
  hidden: boolean;
} {
  let resolvedName = row.resolvedName || row.exerciseNameOverride || "—";
  let sets = row.sets;
  let repScheme = row.repScheme;
  let targetRpe = row.targetRpe;
  let percentOneRm = row.percentOneRm;
  let loadNote = row.loadNote;
  let notes = row.notes;
  let loadComputation = (row.loadComputation ?? "RPE_CHART") as LoadComputation;
  let loadRefFactor = row.loadRefFactor ?? null;
  let loadRefExerciseId = row.loadRefExerciseId ?? null;
  let hidden = false;

  if (row.movementSlotId) {
    const slot = slots.find((s) => s.id === row.movementSlotId);
    if (slot) {
      const option = pickSlotOption(slot.options, selections[slot.id]);

      if (option) {
        resolvedName = option.exerciseName;
        const override = option.overrides.find(
          (o) => o.programExerciseId === row.id,
        );
        if (override) {
          if (override.sets === 0) hidden = true;
          if (override.sets != null) sets = override.sets;
          if (override.repScheme != null) repScheme = override.repScheme;
          if (override.targetRpe != null) targetRpe = override.targetRpe;
          if (override.percentOneRm != null)
            percentOneRm = override.percentOneRm;
          if (override.loadComputation != null)
            loadComputation = override.loadComputation;
          if (override.loadRefFactor != null)
            loadRefFactor = Number(override.loadRefFactor);
          if (override.loadRefExerciseId != null)
            loadRefExerciseId = override.loadRefExerciseId;
          if (override.loadNote != null) loadNote = override.loadNote;
          if (override.notes != null) notes = override.notes;
        }
      }
    }
  }

  if (repScheme === "") hidden = true;

  return {
    resolvedName,
    sets,
    repScheme,
    targetRpe,
    percentOneRm,
    loadNote,
    notes,
    loadComputation,
    loadRefFactor,
    loadRefExerciseId,
    hidden,
  };
}

/**
 * Client-side mirror of backend getComputedDay for preview mode.
 */
export function computeDayPreview(
  exercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
  loadOverrides: Record<string, number> = {},
  options?: { ignoreFixedLoad?: boolean },
): Map<string, PreviewRowState> {
  const e1rms: E1rmInputs = {
    squat: inputs.squat,
    bench: inputs.bench,
    deadlift: inputs.deadlift,
  };
  const roundTo = plateIncrement(inputs.has125kgPlates);
  const computedById = new Map<string, number>();
  const result = new Map<string, PreviewRowState>();

  const sorted = [...exercises].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const row of sorted) {
    const fields = resolvePreviewFields(row, slots, inputs.movementSelections);

    if (fields.hidden) {
      result.set(row.id, { ...fields, load: null, loadSource: null });
      continue;
    }

    let load: number | null = null;
    let loadSource: "percent" | "rpe" | null = null;

    if (loadOverrides[row.id] != null) {
      load = loadOverrides[row.id]!;
    } else if (
      !options?.ignoreFixedLoad &&
      effectiveFixedLoadKg(row.loadKg) != null
    ) {
      load = mround(effectiveFixedLoadKg(row.loadKg)!, roundTo);
    } else {
      switch (fields.loadComputation) {
        case "PERCENT_1RM": {
          const calc = computeRowLoad(
            row.category,
            fields.percentOneRm,
            e1rms,
            roundTo,
            fields.targetRpe,
            fields.repScheme,
          );
          load = calc?.load ?? null;
          loadSource = calc?.source ?? null;
          break;
        }
        case "RPE_CHART": {
          const calc = computeRowLoad(
            row.category,
            fields.percentOneRm,
            e1rms,
            roundTo,
            fields.targetRpe,
            fields.repScheme,
          );
          load = calc?.load ?? null;
          loadSource = calc?.source ?? null;
          break;
        }
        case "PERCENT_OF_ROW": {
          if (fields.loadRefExerciseId && fields.loadRefFactor != null) {
            const ref =
              loadOverrides[fields.loadRefExerciseId] ??
              computedById.get(fields.loadRefExerciseId);
            if (ref != null) {
              load = mround(ref * fields.loadRefFactor, roundTo);
              loadSource = "percent";
            }
          }
          break;
        }
        default:
          load = null;
      }
    }

    if (load != null) computedById.set(row.id, load);
    result.set(row.id, { ...fields, load, loadSource });
  }

  return result;
}

/** @deprecated Use computeDayPreview — kept for callers that only need loads */
export function computeDayPreviewLoads(
  exercises: ExerciseRow[],
  slots: MovementSlot[],
  inputs: PreviewInputs,
  loadOverrides: Record<string, number> = {},
): Map<string, number | null> {
  const preview = computeDayPreview(exercises, slots, inputs, loadOverrides);
  return new Map([...preview.entries()].map(([id, state]) => [id, state.load]));
}
