import { cn } from "@/utils/cn";

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

function formatPrescription(ctx: SheetExerciseContext): string | null {
  const parts: string[] = [];
  if (ctx.prescriptionSets != null && ctx.repScheme) {
    parts.push(`${ctx.prescriptionSets} × ${ctx.repScheme}`);
  } else if (ctx.repScheme) {
    parts.push(ctx.repScheme);
  }
  if (ctx.goalRpe) {
    parts.push(`@ RPE ${ctx.goalRpe}`);
  }
  if (ctx.loadKg) {
    parts.push(`· ${ctx.loadKg} kg`);
  }
  return parts.length > 0 ? parts.join(" ") : null;
}

function formatLogged(ctx: SheetExerciseContext): string | null {
  const parts: string[] = [];
  if (ctx.actualLoad) parts.push(`${ctx.actualLoad} kg`);
  if (ctx.actualRpe) parts.push(`RPE ${ctx.actualRpe}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function FormCheckSheetContextBadges({
  ctx,
  className,
}: {
  ctx: SheetExerciseContext | null | undefined;
  className?: string;
}) {
  if (!ctx) return null;

  const prescription = formatPrescription(ctx);
  const logged = formatLogged(ctx);

  if (!ctx.category && !prescription && !logged) return null;

  return (
    <div className={cn("mt-1.5 flex flex-wrap gap-1", className)}>
      {ctx.category ? (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {ctx.category}
        </span>
      ) : null}
      {prescription ? (
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          Rx: {prescription}
        </span>
      ) : null}
      {logged ? (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          Logged: {logged}
        </span>
      ) : ctx.goalRpe ? (
        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          No RPE logged yet
        </span>
      ) : null}
    </div>
  );
}
