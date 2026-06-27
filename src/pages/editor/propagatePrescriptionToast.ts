import toast from "react-hot-toast";
import type { PrescriptionPropagationResult } from "@/types/programs";

const SKIP_REASON_LABEL: Record<
  NonNullable<PrescriptionPropagationResult["skipped"]>[number]["reason"],
  string
> = {
  missing_day: "no matching day",
  missing_slot: "no slot at this position",
  different_exercise: "different exercise at slot",
  missing_set: "set missing at slot",
};

function formatSkippedWeeks(
  skipped: NonNullable<PrescriptionPropagationResult["skipped"]>,
): string {
  const byReason = new Map<string, number[]>();
  for (const entry of skipped) {
    const label = SKIP_REASON_LABEL[entry.reason];
    const weeks = byReason.get(label) ?? [];
    weeks.push(entry.weekNumber);
    byReason.set(label, weeks);
  }

  return [...byReason.entries()]
    .map(([reason, weekNumbers]) => {
      const weeks = weekNumbers.map((n) => `W${n}`).join(", ");
      return `${weeks} (${reason})`;
    })
    .join("; ");
}

export function prescriptionPropagatedMessage(
  propagated?: PrescriptionPropagationResult,
): string | null {
  if (!propagated?.count) return null;
  const weeks = propagated.weekNumbers.map((n) => `W${n}`).join(", ");
  return `Also updated ${weeks}`;
}

export function showPrescriptionPropagationToasts(
  propagated?: PrescriptionPropagationResult,
  options?: { setNumber?: number },
) {
  if (propagated?.count) {
    const weeks = propagated.weekNumbers.map((n) => `W${n}`).join(", ");
    const prefix =
      options?.setNumber != null
        ? `Set ${options.setNumber} also updated in ${weeks}`
        : `Also updated ${weeks}`;
    toast.success(prefix);
  }

  if (propagated?.skipped?.length) {
    toast(`Skipped ${formatSkippedWeeks(propagated.skipped)}`, {
      icon: "⚠️",
    });
  }
}
