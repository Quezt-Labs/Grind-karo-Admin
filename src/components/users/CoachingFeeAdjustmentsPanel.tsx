import { useMemo, useState } from "react";
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
import { planService } from "@/services/planService";
import { formatINR } from "@/pages/users/usersConstants";
import type { Purchase } from "@/types/user";
import type { CoachingBillingAdjustment } from "@/services/coachingSubscriptionService";

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
  const [manualAmount, setManualAmount] = useState("");

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

  const { data: adjustments = [], isLoading: adjustmentsLoading } = useQuery({
    queryKey: ["coaching-billing-adjustments", userId],
    queryFn: () => coachingSubscriptionService.listAdjustments({ userId }),
    enabled: !!userId,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["coaching-billing-adjustments", userId],
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
        planId: manualPlanId,
        totalAmount: manualAmount.trim() ? Number(manualAmount) : undefined,
        reason: reason.trim(),
      }),
    onSuccess: () => {
      toast.success("Manual payment recorded");
      setReason("");
      setManualAmount("");
      invalidate();
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to record manual payment"),
  });

  const busy =
    extendMutation.isPending ||
    waiveMutation.isPending ||
    manualMutation.isPending;

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
          setManualPlanId={setManualPlanId}
          manualAmount={manualAmount}
          setManualAmount={setManualAmount}
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
              {primarySub.planName} · {primarySub.status} · expires{" "}
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
            placeholder="e.g. Athlete requested 1-month hold — comp prep break agreed on WhatsApp"
            rows={2}
            className="text-sm"
          />
        </div>

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
            onClick={() => extendMutation.mutate(30)}
          >
            +30 days
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
            Waive / hold month
          </Button>
        </div>

        <ManualPaymentForm
          plans={plans}
          manualPlanId={manualPlanId}
          setManualPlanId={setManualPlanId}
          manualAmount={manualAmount}
          setManualAmount={setManualAmount}
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
  manualAmount,
  setManualAmount,
  reason,
  onSubmit,
  busy,
  disabled,
}: {
  plans: Awaited<ReturnType<typeof planService.getAll>>;
  manualPlanId: string;
  setManualPlanId: (value: string) => void;
  manualAmount: string;
  setManualAmount: (value: string) => void;
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
        <Input
          type="number"
          min={0}
          placeholder="Amount (optional)"
          value={manualAmount}
          onChange={(e) => setManualAmount(e.target.value)}
          className="h-9 text-sm"
        />
      </div>
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
