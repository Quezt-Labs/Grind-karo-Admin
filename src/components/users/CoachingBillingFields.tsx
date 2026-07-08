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
import { formatINR } from "@/pages/users/usersConstants";
import {
  addMonthsToDateInput,
  defaultFeeCoversMonths,
  FEE_COVERS_MONTH_OPTIONS,
  isLifterFeeInputInvalid,
  todayDateInput,
  type FeeCoversMonths,
} from "@/utils/coachingBilling";

type Props = {
  plan: CoachingPlan | undefined;
  feeCoversMonths: FeeCoversMonths;
  startDate: string;
  endDate: string;
  endDateTouched: boolean;
  lifterFee: string;
  onFeeCoversMonthsChange: (value: FeeCoversMonths) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onEndDateTouchedChange: (touched: boolean) => void;
  onLifterFeeChange: (value: string) => void;
  /** Hide lifter fee when parent renders it elsewhere (e.g. subscription fee editor). */
  showLifterFee?: boolean;
};

export function CoachingBillingFields({
  plan,
  feeCoversMonths,
  startDate,
  endDate,
  endDateTouched,
  lifterFee,
  onFeeCoversMonthsChange,
  onStartDateChange,
  onEndDateChange,
  onEndDateTouchedChange,
  onLifterFeeChange,
  showLifterFee = true,
}: Props) {
  const prevPlanId = useRef(plan?.id);

  useEffect(() => {
    if (plan?.id && plan.id !== prevPlanId.current) {
      prevPlanId.current = plan.id;
      onFeeCoversMonthsChange(defaultFeeCoversMonths(plan));
      onEndDateTouchedChange(false);
      onLifterFeeChange("");
    }
  }, [
    plan,
    onFeeCoversMonthsChange,
    onEndDateTouchedChange,
    onLifterFeeChange,
  ]);

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

  const lifterFeeInvalid = isLifterFeeInputInvalid(lifterFee);

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
            {FEE_COVERS_MONTH_OPTIONS.map((months) => (
              <SelectItem key={months} value={String(months)}>
                {months} {months === 1 ? "month" : "months"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          How long this payment grants access (calendar months).
        </p>
      </div>
      {showLifterFee ? (
        <Input
          label="Lifter fee (INR)"
          type="number"
          min={1}
          value={lifterFee}
          onChange={(e) => onLifterFeeChange(e.target.value)}
          placeholder={`Default ${formatINR(plan.price)}`}
          error={
            lifterFeeInvalid
              ? "Enter a valid amount greater than zero"
              : undefined
          }
        />
      ) : (
        <div />
      )}
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
