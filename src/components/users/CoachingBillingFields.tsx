import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
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

type Props = {
  plan: CoachingPlan | undefined;
  feeCoversMonths: FeeCoversMonths;
  startDate: string;
  endDate: string;
  endDateTouched: boolean;
  onFeeCoversMonthsChange: (value: FeeCoversMonths) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onEndDateTouchedChange: (touched: boolean) => void;
};

export function CoachingBillingFields({
  plan,
  feeCoversMonths,
  startDate,
  endDate,
  endDateTouched,
  onFeeCoversMonthsChange,
  onStartDateChange,
  onEndDateChange,
  onEndDateTouchedChange,
}: Props) {
  const prevPlanId = useRef(plan?.id);

  useEffect(() => {
    if (plan?.id && plan.id !== prevPlanId.current) {
      prevPlanId.current = plan.id;
      onFeeCoversMonthsChange(defaultFeeCoversMonths(plan));
      onEndDateTouchedChange(false);
    }
  }, [plan, onFeeCoversMonthsChange, onEndDateTouchedChange]);

  useEffect(() => {
    if (endDateTouched) return;
    const computed = addMonthsToDateInput(
      startDate || todayDateInput(),
      feeCoversMonths,
    );
    if (computed !== endDate) {
      onEndDateChange(computed);
    }
  }, [startDate, feeCoversMonths, endDateTouched, endDate, onEndDateChange]);

  if (!plan) return null;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Fee covers
        </label>
        <Select
          value={String(feeCoversMonths)}
          onValueChange={(v) =>
            onFeeCoversMonthsChange(Number(v) as FeeCoversMonths)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Monthly (1 month)</SelectItem>
            <SelectItem value="3">3-month package</SelectItem>
          </SelectContent>
        </Select>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          How long this payment grants access — for monthly vs upfront packages.
        </p>
      </div>
      <div />
      <Input
        label="Start date"
        type="date"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
      />
      <div>
        <Input
          label="End date"
          type="date"
          value={endDate}
          onChange={(e) => {
            onEndDateTouchedChange(true);
            onEndDateChange(e.target.value);
          }}
        />
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          {endDateTouched
            ? "Manual end date — reminders use this date"
            : "Auto-calculated from start + fee period"}
        </p>
      </div>
    </div>
  );
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
