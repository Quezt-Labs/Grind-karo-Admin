import { cn } from "@/utils/cn";
import {
  formatAthleteLoggedLine,
  formatPrescription,
  type SheetExerciseContext,
} from "@/components/shared/formCheckSheetContext.utils";

export function FormCheckAthleteLoggedMetrics({
  ctx,
  className,
  compact = false,
}: {
  ctx: SheetExerciseContext | null | undefined;
  className?: string;
  compact?: boolean;
}) {
  const logged = formatAthleteLoggedLine(ctx);
  const prescription = ctx ? formatPrescription(ctx) : null;

  if (!logged && !prescription && !ctx?.category) return null;

  return (
    <div
      className={cn(
        "mt-2 rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-600 dark:bg-gray-900/40",
        compact ? "px-2 py-1.5" : "px-2.5 py-2",
        className,
      )}
    >
      {logged ? (
        <div className={cn(compact ? "text-xs" : "text-sm")}>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            Athlete logged
          </span>
          <p className="mt-0.5 font-semibold tabular-nums text-gray-900 dark:text-white">
            {logged}
          </p>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          Load / RPE abhi sheet mein log nahi hua
        </p>
      )}
      {prescription ? (
        <p
          className={cn(
            "text-gray-500 dark:text-gray-400",
            logged
              ? "mt-1 border-t border-gray-200 pt-1 dark:border-gray-600"
              : "",
            compact ? "text-[10px]" : "text-[11px]",
          )}
        >
          <span className="font-medium text-gray-600 dark:text-gray-300">
            Rx:{" "}
          </span>
          {prescription}
        </p>
      ) : null}
    </div>
  );
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
  const logged = formatAthleteLoggedLine(ctx);

  if (!ctx.category && !prescription && !logged) return null;

  return (
    <div className={cn("mt-1.5 flex flex-wrap gap-1", className)}>
      {ctx.category ? (
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          {ctx.category}
        </span>
      ) : null}
      {logged ? (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
          {logged}
        </span>
      ) : null}
      {prescription ? (
        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
          Rx: {prescription}
        </span>
      ) : null}
    </div>
  );
}
