export interface SheetExerciseContext {
  category: string | null;
  sortOrder: number;
  prescriptionSets: number | null;
  repScheme: string | null;
  goalRpe: string | null;
  loadKg: string | null;
  actualLoad: string | null;
  actualRpe: string | null;
}

export function formatPrescription(ctx: SheetExerciseContext): string | null {
  const parts: string[] = [];
  if (ctx.prescriptionSets != null && ctx.repScheme) {
    parts.push(`${ctx.prescriptionSets} × ${ctx.repScheme}`);
  } else if (ctx.repScheme) {
    parts.push(ctx.repScheme);
  }
  if (ctx.goalRpe) {
    const rpe = ctx.goalRpe.replace(/^@\s*/, "");
    parts.push(`@ RPE ${rpe}`);
  }
  if (ctx.loadKg) {
    parts.push(`${ctx.loadKg} kg`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** Athlete-logged load / RPE from sheet ACTUAL columns. */
export function formatAthleteLoggedLine(
  ctx: SheetExerciseContext | null | undefined,
): string | null {
  if (!ctx) return null;
  const parts: string[] = [];
  if (ctx.actualLoad?.trim()) {
    const load = ctx.actualLoad.trim();
    parts.push(load.toLowerCase().includes("kg") ? load : `${load} kg`);
  }
  if (ctx.actualRpe?.trim()) {
    const rpe = ctx.actualRpe.trim().replace(/^@\s*/, "");
    parts.push(`RPE ${rpe}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
