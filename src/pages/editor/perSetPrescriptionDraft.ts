import type { CreateExerciseSetPayload } from "@/types/programs";

export interface PerSetDraft {
  percentOneRm: string;
  reps: string;
  repScheme: string;
  targetRpe: string;
  absoluteWeightKg: string;
  notes: string;
}

export function emptyPerSetDraft(): PerSetDraft {
  return {
    percentOneRm: "",
    reps: "",
    repScheme: "",
    targetRpe: "",
    absoluteWeightKg: "",
    notes: "",
  };
}

export function defaultPerSetDrafts(count = 3): PerSetDraft[] {
  return Array.from({ length: count }, () => emptyPerSetDraft());
}

export function perSetDraftToPayload(
  setNumber: number,
  draft: PerSetDraft,
): CreateExerciseSetPayload {
  const parseNum = (v: string) => {
    const n = parseFloat(v);
    return v && !Number.isNaN(n) ? n : null;
  };
  const parseIntVal = (v: string) => {
    const n = Number.parseInt(v, 10);
    return v && !Number.isNaN(n) ? n : null;
  };
  return {
    setNumber,
    percentOneRm: parseNum(draft.percentOneRm),
    reps: parseIntVal(draft.reps),
    repScheme: draft.repScheme || null,
    targetRpe: parseNum(draft.targetRpe),
    absoluteWeightKg: parseNum(draft.absoluteWeightKg),
    notes: draft.notes || null,
  };
}
