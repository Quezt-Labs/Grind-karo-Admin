import { z } from "zod";
import type { ExerciseRow } from "@/types/programs";

export const CATEGORY_OPTIONS = [
  { value: "SQUAT", label: "Squat" },
  { value: "BENCH", label: "Bench" },
  { value: "DEADLIFT", label: "Deadlift" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
];

export const LOAD_COMPUTATION_OPTIONS = [
  {
    value: "RPE_CHART",
    label: "RPE Chart",
    info: "E1RM aur RPE/reps table se working weight calculate hota hai. Main lifts (Squat, Bench, Deadlift) ke liye.",
  },
  {
    value: "PERCENT_1RM",
    label: "% of 1RM",
    info: "Category 1RM ka percentage use karke load nikalta hai. Accessories ke liye common.",
  },
  {
    value: "PERCENT_OF_ROW",
    label: "% of Another Row",
    info: "Kisi aur exercise row ke computed load × reference factor. Back-off sets ke liye.",
  },
  {
    value: "NONE",
    label: "None",
    info: "Auto load compute nahi hoga. Bodyweight ya coach manual load ke liye.",
  },
];

export const exerciseRowSchema = z.object({
  sortOrder: z.coerce.number().min(0),
  category: z.enum(["SQUAT", "BENCH", "DEADLIFT", "ACCESSORY", "OTHER"]),
  exerciseId: z.string().optional(),
  exerciseNameOverride: z.string().optional(),
  sets: z.coerce.number().nullable().optional(),
  repScheme: z.string().optional(),
  targetRpe: z.string().optional(),
  percentOneRmDisplay: z.coerce.number().nullable().optional(),
  loadKg: z.coerce.number().nullable().optional(),
  loadNote: z.string().optional(),
  notes: z.string().optional(),
  movementSlotId: z.string().optional(),
  loadComputation: z
    .enum(["RPE_CHART", "PERCENT_1RM", "PERCENT_OF_ROW", "NONE"])
    .optional(),
  loadRefFactor: z.coerce.number().nullable().optional(),
  loadRefExerciseId: z.string().optional(),
  hasPlateCheck: z.boolean().optional(),
});

export type ExerciseRowFormData = z.infer<typeof exerciseRowSchema>;

export function toPayload(d: ExerciseRowFormData) {
  const pctBasisPoints = d.percentOneRmDisplay
    ? Math.round(d.percentOneRmDisplay * 100)
    : null;
  return {
    sortOrder: d.sortOrder,
    category: d.category,
    exerciseId: d.exerciseId || null,
    exerciseNameOverride: d.exerciseNameOverride || null,
    sets: d.sets || null,
    repScheme: d.repScheme || null,
    targetRpe: d.targetRpe || null,
    percentOneRm: pctBasisPoints,
    loadKg: d.loadKg ?? null,
    loadNote: d.loadNote || null,
    notes: d.notes || null,
    movementSlotId: d.movementSlotId || null,
    loadComputation: d.loadComputation || "RPE_CHART",
    loadRefFactor: d.loadRefFactor ?? null,
    loadRefExerciseId: d.loadRefExerciseId || null,
    hasPlateCheck: d.hasPlateCheck ?? false,
  };
}

export function getDefaultValues(
  row?: ExerciseRow,
  nextSortOrder = 0,
): ExerciseRowFormData {
  if (row) {
    return {
      sortOrder: row.sortOrder,
      category: row.category,
      exerciseId: row.exerciseId || "",
      exerciseNameOverride: row.exerciseNameOverride || "",
      sets: row.sets,
      repScheme: row.repScheme || "",
      targetRpe: row.targetRpe || "",
      percentOneRmDisplay: row.percentOneRm ? row.percentOneRm / 100 : null,
      loadKg: row.loadKg ?? null,
      loadNote: row.loadNote || "",
      notes: row.notes || "",
      movementSlotId: row.movementSlotId || "",
      loadComputation: row.loadComputation || "RPE_CHART",
      loadRefFactor: row.loadRefFactor,
      loadRefExerciseId: row.loadRefExerciseId || "",
      hasPlateCheck: row.hasPlateCheck ?? false,
    };
  }
  return {
    sortOrder: nextSortOrder,
    category: "ACCESSORY",
    exerciseId: "",
    exerciseNameOverride: "",
    sets: null,
    repScheme: "",
    targetRpe: "",
    percentOneRmDisplay: null,
    loadKg: null,
    loadNote: "",
    notes: "",
    movementSlotId: "",
    loadComputation: "RPE_CHART",
    loadRefFactor: null,
    loadRefExerciseId: "",
    hasPlateCheck: false,
  };
}
