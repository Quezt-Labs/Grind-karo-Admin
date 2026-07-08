import type { CoachingPlan } from "@/types/program";
import { formatBillingPeriodLabel } from "@/utils/coachingBillingPeriod";

export const FEE_COVERS_MONTH_OPTIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
] as const;

export type FeeCoversMonths = (typeof FEE_COVERS_MONTH_OPTIONS)[number];

export type CoachingBillingState = {
  feeCoversMonths: FeeCoversMonths;
  startDate: string;
  endDate: string;
  endDateTouched: boolean;
  lifterFee: string;
};

export function defaultFeeCoversMonths(
  plan: CoachingPlan | undefined,
): FeeCoversMonths {
  if (!plan) return 3;
  const months = plan.validityMonths <= 1 ? 1 : 3;
  return Math.min(12, Math.max(1, months)) as FeeCoversMonths;
}

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add whole calendar months to a "YYYY-MM-DD" value, clamping day overflow. */
export function addMonthsToDateInput(
  dateInput: string,
  months: number,
): string {
  if (!dateInput) return "";
  const d = new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const daysInTargetMonth = new Date(
    d.getFullYear(),
    d.getMonth() + 1,
    0,
  ).getDate();
  d.setDate(Math.min(day, daysInTargetMonth));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function initialCoachingBillingState(
  plan?: CoachingPlan,
): CoachingBillingState {
  const start = todayDateInput();
  const months = defaultFeeCoversMonths(plan);
  return {
    feeCoversMonths: months,
    startDate: start,
    endDate: addMonthsToDateInput(start, months),
    endDateTouched: false,
    lifterFee: "",
  };
}

export function parseLifterFeeInput(lifterFee: string): number | undefined {
  const trimmed = lifterFee.trim();
  if (!trimmed) return undefined;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return amount;
}

export function isLifterFeeInputInvalid(lifterFee: string): boolean {
  const trimmed = lifterFee.trim();
  if (!trimmed) return false;
  const amount = Number(trimmed);
  return !Number.isFinite(amount) || amount <= 0;
}

export function coachingBillingPayload(
  planId: string,
  billing: CoachingBillingState,
) {
  return {
    planId,
    totalAmount: parseLifterFeeInput(billing.lifterFee),
    feeCoversMonths: billing.feeCoversMonths,
    startDate: billing.startDate
      ? new Date(`${billing.startDate}T00:00:00`).toISOString()
      : undefined,
    expiresAt: billing.endDate
      ? new Date(`${billing.endDate}T23:59:59`).toISOString()
      : undefined,
  };
}

export { todayDateInput, formatBillingPeriodLabel };
