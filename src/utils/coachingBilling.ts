import type { CoachingPlan } from "@/types/program";

export type FeeCoversMonths = 1 | 3;

export function defaultFeeCoversMonths(
  plan: CoachingPlan | undefined,
): FeeCoversMonths {
  if (!plan) return 3;
  return plan.validityMonths <= 1 ? 1 : 3;
}

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsToDateInput(dateInput: string, months: number): string {
  const base = dateInput ? new Date(`${dateInput}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return todayDateInput();
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

export function initialCoachingBillingState(plan?: CoachingPlan) {
  const start = todayDateInput();
  const months = defaultFeeCoversMonths(plan);
  return {
    feeCoversMonths: months,
    startDate: start,
    endDate: addMonthsToDateInput(start, months),
    endDateTouched: false,
  };
}

export function coachingBillingPayload(
  planId: string,
  customPrice: string,
  billing: {
    feeCoversMonths: FeeCoversMonths;
    startDate: string;
    endDate: string;
  },
) {
  return {
    planId,
    totalAmount: customPrice.trim() ? Number(customPrice.trim()) : undefined,
    feeCoversMonths: billing.feeCoversMonths,
    startDate: billing.startDate
      ? new Date(`${billing.startDate}T00:00:00`).toISOString()
      : undefined,
    expiresAt: billing.endDate
      ? new Date(`${billing.endDate}T23:59:59`).toISOString()
      : undefined,
  };
}

export { todayDateInput, addMonthsToDateInput };
