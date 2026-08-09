import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins, Loader2, PauseCircle, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/ShadSelect";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import { planService } from "@/services/planService";
import { formatINR } from "@/pages/users/usersConstants";
import { CoachingBillingFields } from "@/components/users/CoachingBillingFields";
import {
  coachingBillingPayload,
  initialCoachingBillingState,
  type FeeCoversMonths,
} from "@/utils/coachingBilling";
import { COACHING_DAYS_PER_BILLING_PERIOD } from "@/utils/coachingBillingPeriod";
import type { Purchase } from "@/types/user";

type Props = {
  userId: string;
  purchases: Purchase[];
  onUpdated?: () => void;
  /** Hide manual payment when athlete has no coaching plan context yet. */
  showManualPayment?: boolean;
};

export function FormCheckBillingControls({
  userId,
  purchases,
  onUpdated,
  showManualPayment = true,
}: Props) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [billing, setBilling] = useState(() => initialCoachingBillingState());

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

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["coaching-billing-adjustments", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["admin-user-purchases", userId],
    });
    void queryClient.invalidateQueries({
      queryKey: ["coach-athlete-purchases", userId],
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
      toast.success("4-week block waived — access extended");
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

  const busy =
    extendMutation.isPending ||
    waiveMutation.isPending ||
    manualMutation.isPending;

  const reasonOk = reason.trim().length >= 3;

  return (
    <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 dark:border-indigo-800/60 dark:bg-indigo-950/20">
      <div className="mb-2 flex items-center gap-2">
        <HandCoins className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
          Form-check access billing
        </p>
      </div>
      <p className="mb-3 text-[11px] text-indigo-900/80 dark:text-indigo-200/80">
        Coaching blocks are 4 weeks (28 days) — form-check quota resets each
        block.
      </p>

      <Textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (required) — e.g. UPI received for next 4-week block"
        rows={2}
        className="mb-3 text-sm"
      />

      {primarySub && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || !reasonOk}
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
            disabled={busy || !reasonOk}
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
            disabled={busy || !reasonOk}
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
      )}

      {showManualPayment && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={manualPlanId}
              onValueChange={(id) => {
                setManualPlanId(id);
                const plan = plans.find((p) => p.id === id);
                const base = initialCoachingBillingState(plan);
                setBilling({
                  ...base,
                  lifterFee: plan ? String(plan.price) : "",
                });
              }}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Plan for offline payment" />
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
            onEndDateChange={(endDate) =>
              setBilling((b) => ({ ...b, endDate }))
            }
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
            disabled={busy || !manualPlanId || !reasonOk}
            onClick={() => manualMutation.mutate()}
          >
            {manualMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <HandCoins className="h-4 w-4" />
            )}
            Record offline payment
          </Button>
        </>
      )}
    </div>
  );
}
