import { z } from "zod";
import type { ExerciseRow } from "@/types/programs";

export const CATEGORY_OPTIONS = [
  { value: "SQUAT", label: "Squat" },
  { value: "BENCH", label: "Bench" },
  { value: "DEADLIFT", label: "Deadlift" },
  { value: "ACCESSORY", label: "Accessory" },
  { value: "OTHER", label: "Other" },
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
  loadNote: z.string().optional(),
  notes: z.string().optional(),
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
    computedLoadKg: null,
    loadSource: null,
    loadNote: d.loadNote || null,
    notes: d.notes || null,
  };
}

export function getDefaultValues(row?: ExerciseRow): ExerciseRowFormData {
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
      loadNote: row.loadNote || "",
      notes: row.notes || "",
    };
  }
  return {
    sortOrder: 0,
    category: "ACCESSORY",
    exerciseId: "",
    exerciseNameOverride: "",
    sets: null,
    repScheme: "",
    targetRpe: "",
    percentOneRmDisplay: null,
    loadNote: "",
    notes: "",
  };
}
