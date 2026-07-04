import type { CoachingPlan } from "@/types/program";
import {
  billingPeriodDays,
  formatBillingPeriodLabel,
} from "@/utils/coachingBillingPeriod";

export type FeeCoversMonths = 1 | 3;

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
  return plan.validityMonths <= 1 ? 1 : 3;
}

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToDateInput(dateInput: string, days: number): string {
  const base = dateInput ? new Date(`${dateInput}T12:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return todayDateInput();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function addBillingPeriodsToDateInput(
  dateInput: string,
  periodCount: number,
): string {
  return addDaysToDateInput(dateInput, billingPeriodDays(periodCount));
}

export function initialCoachingBillingState(
  plan?: CoachingPlan,
): CoachingBillingState {
  const start = todayDateInput();
  const periods = defaultFeeCoversMonths(plan);
  return {
    feeCoversMonths: periods,
    startDate: start,
    endDate: addBillingPeriodsToDateInput(start, periods),
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

export {
  todayDateInput,
  addBillingPeriodsToDateInput,
  formatBillingPeriodLabel,
};
