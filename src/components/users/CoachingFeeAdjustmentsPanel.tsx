import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Loader2, PauseCircle, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import type { CoachingBillingAdjustment } from "@/services/coachingSubscriptionService";
import { planService } from "@/services/planService";
import { formatINR } from "@/pages/users/usersConstants";
import { CoachingBillingFields } from "@/components/users/CoachingBillingFields";
import {
  coachingBillingPayload,
  initialCoachingBillingState,
  isLifterFeeInputInvalid,
  parseLifterFeeInput,
  type CoachingBillingState,
  type FeeCoversMonths,
} from "@/utils/coachingBilling";
import type { Purchase } from "@/types/user";
import { COACHING_DAYS_PER_BILLING_PERIOD } from "@/utils/coachingBillingPeriod";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TYPE_LABEL: Record<CoachingBillingAdjustment["type"], string> = {
  EXTEND: "Extended access",
  WAIVE: "Fee waived / hold",
  MANUAL_PAYMENT: "Manual payment",
  DATE_CORRECTION: "Dates corrected",
  FEE_CORRECTION: "Lifter fee updated",
  PLAN_CHANGE: "Plan changed",
};

type Props = {
  userId: string;
  purchases: Purchase[];
  onUpdated?: () => void;
};

export function CoachingFeeAdjustmentsPanel({
  userId,
  purchases,
  onUpdated,
}: Props) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [billing, setBilling] = useState(() => initialCoachingBillingState());
  const [lifterFeeDraft, setLifterFeeDraft] = useState("");
  const [overridePlanId, setOverridePlanId] = useState("");
  const [overrideFeeDraft, setOverrideFeeDraft] = useState("");

  const paidCoachingSubs = useMemo(
    () =>
      purchases.filter(
        (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
          p.kind === "coaching_subscription" &&
          (p.status === "ACTIVE" || p.status === "EXPIRED"),
      ),
    [purchases],
  );

  const primarySub = useMemo(() => {
    const active = paidCoachingSubs.find((p) => p.status === "ACTIVE");
    return active ?? paidCoachingSubs[0] ?? null;
  }, [paidCoachingSubs]);

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-coaching-plans"],
    queryFn: () => planService.getAll(),
  });

  const manualPlan = useMemo(
    () => plans.find((p) => p.id === manualPlanId),
    [plans, manualPlanId],
  );

  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery({
    queryKey: ["coaching-billing-adjustments", userId],
    queryFn: () => coachingSubscriptionService.listAdjustments({ userId }),
    enabled: !!userId,
  });

  const { data: feeOverrides = [] } = useQuery({
    queryKey: ["coaching-fee-overrides", userId],
    queryFn: () => coachingSubscriptionService.listFeeOverrides(userId),
    enabled: !!userId,
  });

  const selectedOverridePlanId =
    overridePlanId || primarySub?.planId || manualPlanId || "";
  const currentOverride = useMemo(
    () => feeOverrides.find((o) => o.planId === selectedOverridePlanId) ?? null,
    [feeOverrides, selectedOverridePlanId],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["coaching-billing-adjustments", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["coaching-fee-overrides", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", userId],
    });
    onUpdated?.();
  };

  const extendMutation = useMutation({
    mutationFn: (days: number) => {
      if (!primarySub) throw new Error("No subscription to extend");
      return coachingSubscriptionService.extendSubscription(primarySub.id, {
        days,
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Access extended");
      setReason("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to extend subscription"),
  });

  const waiveMutation = useMutation({
    mutationFn: () => {
      if (!primarySub) throw new Error("No subscription to waive");
      return coachingSubscriptionService.waivePeriod(primarySub.id, {
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Billing period waived — access extended");
      setReason("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to waive billing period"),
  });

  const manualMutation = useMutation({
    mutationFn: () =>
      coachingSubscriptionService.recordManualPayment({
        userId,
        ...coachingBillingPayload(manualPlanId, billing),
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success("Manual payment recorded");
      setReason("");
      setBilling((b) => ({ ...b, lifterFee: "" }));
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to record manual payment"),
  });

  const feeMutation = useMutation({
    mutationFn: () => {
      if (!primarySub) throw new Error("No subscription to update");
      const nextFee = parseLifterFeeInput(lifterFeeDraft);
      if (nextFee == null) throw new Error("Enter a valid lifter fee");
      return coachingSubscriptionService.patchSubscriptionFee(primarySub.id, {
        totalAmount: nextFee,
        reason: reason.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Lifter fee updated");
      setReason("");
      setLifterFeeDraft("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to update lifter fee"),
  });

  const setOverrideMutation = useMutation({
    mutationFn: () => {
      if (!selectedOverridePlanId) throw new Error("Select a plan");
      const fee = parseLifterFeeInput(overrideFeeDraft);
      if (fee == null) throw new Error("Enter a valid renewal fee");
      return coachingSubscriptionService.setFeeOverride(userId, {
        planId: selectedOverridePlanId,
        baseAmount: fee,
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: () => {
      toast.success("Renewal fee saved — future payments will use this amount");
      setOverrideFeeDraft("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to save renewal fee"),
  });

  const clearOverrideMutation = useMutation({
    mutationFn: (planId: string) =>
      coachingSubscriptionService.clearFeeOverride(userId, planId),
    onSuccess: () => {
      toast.success("Renewal fee cleared — plan price will apply");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to clear renewal fee"),
  });

  const busy =
    extendMutation.isPending ||
    waiveMutation.isPending ||
    manualMutation.isPending ||
    feeMutation.isPending ||
    setOverrideMutation.isPending ||
    clearOverrideMutation.isPending;

  const overrideFeeInvalid = isLifterFeeInputInvalid(overrideFeeDraft);
  const overridePlanName =
    plans.find((p) => p.id === selectedOverridePlanId)?.name ?? "plan";

  const lifterFeeDraftInvalid = isLifterFeeInputInvalid(lifterFeeDraft);
  const lifterFeeChanged =
    primarySub != null &&
    parseLifterFeeInput(lifterFeeDraft) != null &&
    parseLifterFeeInput(lifterFeeDraft) !== primarySub.totalAmount;

  if (paidCoachingSubs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-5 dark:border-gray-600 dark:bg-gray-800">
        <div className="mb-2 flex items-center gap-2">
          <HandCoins className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Fee adjustments
          </h2>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No paid coaching subscription yet. Record a manual payment below when
          the athlete pays offline.
        </p>
        <ManualPaymentForm
          plans={plans}
          manualPlanId={manualPlanId}
          setManualPlanId={(id) => {
            setManualPlanId(id);
            const plan = plans.find((p) => p.id === id);
            setBilling(initialCoachingBillingState(plan));
          }}
          billing={billing}
          setBilling={setBilling}
          manualPlan={manualPlan}
          reason={reason}
          onSubmit={() => manualMutation.mutate()}
          busy={manualMutation.isPending}
          disabled={!manualPlanId || reason.trim().length < 3}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Fee adjustments
            </h2>
          </div>
          {primarySub && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {primarySub.planName} · {primarySub.status} · lifter fee{" "}
              {formatINR(primarySub.totalAmount)} · expires{" "}
              {formatDate(primarySub.expiresAt)}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reason (required)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Athlete requested 4-week hold — comp prep break agreed on WhatsApp"
            rows={2}
            className="text-sm"
          />
        </div>

        {primarySub && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-800/60 dark:bg-indigo-950/20">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
              Change lifter fee
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[160px] flex-1">
                <Input
                  label="Lifter fee (INR)"
                  type="number"
                  min={1}
                  value={lifterFeeDraft}
                  onChange={(e) => setLifterFeeDraft(e.target.value)}
                  placeholder={formatINR(primarySub.totalAmount)}
                  error={
                    lifterFeeDraftInvalid
                      ? "Enter a valid amount greater than zero"
                      : undefined
                  }
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={
                  busy ||
                  reason.trim().length < 3 ||
                  lifterFeeDraftInvalid ||
                  !lifterFeeChanged
                }
                onClick={() => feeMutation.mutate()}
              >
                {feeMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <HandCoins className="h-4 w-4" />
                )}
                Update lifter fee
              </Button>
            </div>
            <p className="mt-1 text-[11px] text-indigo-900/70 dark:text-indigo-200/70">
              Current: {formatINR(primarySub.totalAmount)} per billing block.
              Used for payment calendar reminders and offline payment defaults.
            </p>
          </div>
        )}

        {plans.length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 dark:border-emerald-800/60 dark:bg-emerald-950/20">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
              Renewal fee (what the athlete pays in the app)
            </p>
            <p className="mb-2 text-[11px] text-emerald-900/70 dark:text-emerald-200/70">
              Sets the exact amount charged on this athlete&apos;s Razorpay
              checkout for the selected plan. If left unset, the standard plan
              price applies. Add-ons are charged on top.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-300">
                  Plan
                </label>
                <Select
                  value={selectedOverridePlanId}
                  onValueChange={setOverridePlanId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans
                      .filter((p) => p.isActive)
                      .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({formatINR(plan.price)})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                label="Renewal fee (INR)"
                type="number"
                min={1}
                value={overrideFeeDraft}
                onChange={(e) => setOverrideFeeDraft(e.target.value)}
                placeholder={
                  currentOverride
                    ? formatINR(currentOverride.baseAmount)
                    : "e.g. 4999"
                }
                error={
                  overrideFeeInvalid
                    ? "Enter a valid amount greater than zero"
                    : undefined
                }
              />
              <Button
                type="button"
                size="sm"
                disabled={
                  busy ||
                  !selectedOverridePlanId ||
                  overrideFeeInvalid ||
                  !parseLifterFeeInput(overrideFeeDraft)
                }
                onClick={() => setOverrideMutation.mutate()}
              >
                {setOverrideMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <HandCoins className="h-4 w-4" />
                )}
                Save renewal fee
              </Button>
            </div>
            {currentOverride ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/70 px-2.5 py-1.5 dark:bg-gray-900/30">
                <span className="text-[11px] text-emerald-900 dark:text-emerald-200">
                  Active override: {overridePlanName} charges{" "}
                  <strong>{formatINR(currentOverride.baseAmount)}</strong> on
                  renewal (instead of plan price).
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    clearOverrideMutation.mutate(selectedOverridePlanId)
                  }
                  className="text-[11px] font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 dark:text-red-400"
                >
                  Clear
                </button>
              </div>
            ) : (
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                No renewal-fee override set — {overridePlanName} charges the
                standard plan price.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || reason.trim().length < 3 || !primarySub}
            onClick={() => extendMutation.mutate(7)}
          >
            {extendMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            +7 days
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || reason.trim().length < 3 || !primarySub}
            onClick={() =>
              extendMutation.mutate(COACHING_DAYS_PER_BILLING_PERIOD)
            }
          >
            +28 days (4 weeks)
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || reason.trim().length < 3 || !primarySub}
            onClick={() => waiveMutation.mutate()}
          >
            {waiveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PauseCircle className="h-4 w-4" />
            )}
            Waive 4-week block
          </Button>
        </div>

        <ManualPaymentForm
          plans={plans}
          manualPlanId={manualPlanId}
          setManualPlanId={(id) => {
            setManualPlanId(id);
            const plan = plans.find((p) => p.id === id);
            setBilling(initialCoachingBillingState(plan));
          }}
          billing={billing}
          setBilling={setBilling}
          manualPlan={manualPlan}
          reason={reason}
          onSubmit={() => manualMutation.mutate()}
          busy={manualMutation.isPending}
          disabled={!manualPlanId || reason.trim().length < 3}
        />
      </div>

      <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
          Adjustment history
        </h3>
        {adjustmentsLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : adjustments.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No admin adjustments recorded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {adjustments.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {TYPE_LABEL[row.type]}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDate(row.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                  {row.reason}
                </p>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {row.amount != null && `${formatINR(row.amount)} · `}
                  {row.daysAdded != null && `+${row.daysAdded} days · `}
                  {row.newExpiresAt &&
                    `New expiry ${formatDate(row.newExpiresAt)}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ManualPaymentForm({
  plans,
  manualPlanId,
  setManualPlanId,
  billing,
  setBilling,
  manualPlan,
  reason,
  onSubmit,
  busy,
  disabled,
}: {
  plans: Awaited<ReturnType<typeof planService.getAll>>;
  manualPlanId: string;
  setManualPlanId: (value: string) => void;
  billing: CoachingBillingState;
  setBilling: Dispatch<SetStateAction<CoachingBillingState>>;
  manualPlan: (typeof plans)[number] | undefined;
  reason: string;
  onSubmit: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-gray-700 dark:bg-gray-900/30">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Record offline payment (UPI / cash)
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Select value={manualPlanId} onValueChange={setManualPlanId}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Select plan" />
          </SelectTrigger>
          <SelectContent>
            {plans
              .filter((p) => p.isActive)
              .map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} ({formatINR(plan.price)})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
      <CoachingBillingFields
        plan={manualPlan}
        feeCoversMonths={billing.feeCoversMonths}
        startDate={billing.startDate}
        endDate={billing.endDate}
        endDateTouched={billing.endDateTouched}
        lifterFee={billing.lifterFee}
        onFeeCoversMonthsChange={(feeCoversMonths: FeeCoversMonths) =>
          setBilling((b) => ({ ...b, feeCoversMonths }))
        }
        onStartDateChange={(startDate) =>
          setBilling((b) => ({ ...b, startDate }))
        }
        onEndDateChange={(endDate) => setBilling((b) => ({ ...b, endDate }))}
        onEndDateTouchedChange={(endDateTouched) =>
          setBilling((b) => ({ ...b, endDateTouched }))
        }
        onLifterFeeChange={(lifterFee) =>
          setBilling((b) => ({ ...b, lifterFee }))
        }
      />
      <Button
        type="button"
        size="sm"
        className="mt-2"
        disabled={disabled || busy}
        onClick={onSubmit}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <HandCoins className="h-4 w-4" />
        )}
        Record manual payment
      </Button>
      {!reason.trim() && (
        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
          Add a reason above before applying any adjustment.
        </p>
      )}
    </div>
  );
}
