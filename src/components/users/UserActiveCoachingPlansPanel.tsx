import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownUp, Crown, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/ShadDialog";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import { planService } from "@/services/planService";
import { orderedActiveCoachingSubscriptions } from "@/utils/coachingCapabilities";
import { apiErrorMessage } from "@/utils/apiErrorMessage";
import { formatINR } from "@/pages/users/usersConstants";
import type { Purchase } from "@/types/user";
import type { CoachingPlan } from "@/types/program";
import {
  allowedSwitchTargets,
  planDisplayName,
  switchButtonLabel,
  switchDirectionFor,
} from "@/utils/coachingPlanSwitch";
import { cn } from "@/utils/cn";

type Props = {
  userId: string;
  purchases: Purchase[];
  primarySubscriptionId?: string | null;
  onUpdated?: () => void;
  onSelectSubscription?: (subscriptionId: string) => void;
  onRecordPayment?: () => void;
};

type ActiveCoachingSub = Extract<Purchase, { kind: "coaching_subscription" }>;

type SwitchTarget = {
  subscription: ActiveCoachingSub;
  targetPlan: CoachingPlan;
  direction: "upgrade" | "downgrade";
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Keep in sync with COACHING_GRACE_DAYS on the backend.
const COACHING_GRACE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * For an ACTIVE row whose paid window has already ended: the athlete keeps
 * access for a short grace window. Returns how many grace days are left, or a
 * `pastGrace` flag if the row is stale and should already be expired.
 */
function overdueGraceInfo(sub: { status: string; expiresAt: string }) {
  if (sub.status !== "ACTIVE") return null;
  const expiresAt = new Date(sub.expiresAt).getTime();
  const now = Date.now();
  if (expiresAt >= now) return null; // still within paid window
  const graceEnd = expiresAt + COACHING_GRACE_DAYS * DAY_MS;
  const daysLeft = Math.ceil((graceEnd - now) / DAY_MS);
  return daysLeft > 0
    ? { daysLeft, pastGrace: false as const }
    : { daysLeft: 0, pastGrace: true as const };
}

function switchDialogTitle(direction: "upgrade" | "downgrade", toName: string) {
  return direction === "upgrade"
    ? `Upgrade to ${toName}?`
    : `Downgrade to ${toName}?`;
}

function manageableCoachingSubscriptions(purchases: Purchase[]) {
  return purchases
    .filter(
      (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
        p.kind === "coaching_subscription" &&
        (p.status === "ACTIVE" || p.status === "EXPIRED"),
    )
    .filter((p) => p.razorpayPaymentId !== null);
}

export function UserActiveCoachingPlansPanel({
  userId,
  purchases,
  primarySubscriptionId,
  onUpdated,
  onSelectSubscription,
  onRecordPayment,
}: Props) {
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    planName: string;
  } | null>(null);
  const [switchTarget, setSwitchTarget] = useState<SwitchTarget | null>(null);
  const [switchAmount, setSwitchAmount] = useState("");
  const [switchReason, setSwitchReason] = useState("");

  const { data: plans = [] } = useQuery({
    queryKey: ["coaching-plans"],
    queryFn: () => planService.getAll(),
  });

  const plansBySlug = useMemo(() => {
    const map = new Map<string, CoachingPlan>();
    for (const plan of plans) {
      if (plan.isActive) {
        map.set(plan.slug.trim().toLowerCase(), plan);
      }
    }
    return map;
  }, [plans]);

  const activePlans = orderedActiveCoachingSubscriptions(
    purchases,
    primarySubscriptionId,
  );
  const manageablePlans = manageableCoachingSubscriptions(purchases);
  const planById = useMemo(() => new Map(plans.map((p) => [p.id, p])), [plans]);
  const pinnedId =
    primarySubscriptionId &&
    manageablePlans.some((p) => p.id === primarySubscriptionId)
      ? primarySubscriptionId
      : (activePlans[0]?.id ?? manageablePlans[0]?.id);

  const primaryMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      coachingSubscriptionService.setPrimarySubscription(
        userId,
        subscriptionId,
      ),
    onSuccess: (_res, subscriptionId) => {
      toast.success("Primary coaching plan updated for athlete app");
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-purchases", userId],
      });
      onSelectSubscription?.(subscriptionId);
      onUpdated?.();
    },
    onError: () => toast.error("Failed to set primary plan"),
  });

  const cancelMutation = useMutation({
    mutationFn: (subscriptionId: string) =>
      coachingSubscriptionService.cancelSubscription(subscriptionId),
    onSuccess: () => {
      toast.success("Athlete removed from coaching plan");
      setCancelTarget(null);
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-purchases", userId],
      });
      onUpdated?.();
    },
    onError: () => toast.error("Failed to remove athlete from plan"),
  });

  const switchMutation = useMutation({
    mutationFn: () => {
      if (!switchTarget) throw new Error("No switch target");
      const amount = switchAmount.trim();
      const parsed = amount === "" ? undefined : Number.parseInt(amount, 10);
      if (parsed !== undefined && (!Number.isFinite(parsed) || parsed < 0)) {
        throw new Error("Settlement amount must be a non-negative number");
      }
      const reason = switchReason.trim();
      if (reason.length < 3) {
        throw new Error("Reason must be at least 3 characters");
      }
      return coachingSubscriptionService.switchPlan(
        switchTarget.subscription.id,
        {
          targetPlanId: switchTarget.targetPlan.id,
          totalAmount: parsed,
          reason,
        },
      );
    },
    onSuccess: () => {
      const label =
        switchTarget?.direction === "upgrade" ? "Upgraded" : "Downgraded";
      toast.success(
        `${label} to ${switchTarget?.targetPlan.name ?? "new plan"} — dates carried over`,
      );
      setSwitchTarget(null);
      setSwitchAmount("");
      setSwitchReason("");
      void queryClient.invalidateQueries({
        queryKey: ["admin-user-purchases", userId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["admin-user", userId],
      });
      onUpdated?.();
    },
    onError: (err: unknown) =>
      toast.error(apiErrorMessage(err, "Failed to switch plan")),
  });

  function openSwitch(sub: ActiveCoachingSub, targetPlan: CoachingPlan) {
    const direction = switchDirectionFor(sub.planSlug, targetPlan.slug);
    if (!direction) {
      toast.error("That plan switch is not allowed");
      return;
    }
    setSwitchTarget({ subscription: sub, targetPlan, direction });
    setSwitchAmount(String(targetPlan.price));
    setSwitchReason("");
  }

  if (manageablePlans.length === 0) {
    return null;
  }

  const multiple = manageablePlans.length > 1;

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800/60 dark:bg-indigo-900/10">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/40">
          <Crown className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Coaching subscriptions
            {multiple ? ` (${manageablePlans.length})` : ""}
          </h3>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            {multiple
              ? "Choose which plan drives the athlete app and program editor. Remove plans the athlete should no longer access."
              : "Manage this athlete's coaching access and payment continuity."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {manageablePlans.map((sub) => {
          const isPrimary = sub.id === pinnedId;
          const grace = overdueGraceInfo(sub);
          const switchTargets = allowedSwitchTargets(sub.planSlug)
            .map((slug) => plansBySlug.get(slug))
            .filter((plan): plan is CoachingPlan => plan != null);
          const configuredPlanFee = planById.get(sub.planId)?.price ?? null;
          const canMutateSubscription = sub.status === "ACTIVE";

          return (
            <div
              key={sub.id}
              className={cn(
                "rounded-lg border bg-white p-3 dark:bg-gray-900/40",
                isPrimary
                  ? "border-indigo-300 dark:border-indigo-700"
                  : "border-gray-200 dark:border-gray-700",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                      {sub.planName}
                    </p>
                    <StatusBadge status={sub.status} />
                    {grace &&
                      (grace.pastGrace ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          Overdue
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Overdue · grace · {grace.daysLeft}d left
                        </span>
                      ))}
                    {isPrimary && (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
                        Shown in app
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(sub.startDate)} – {formatDate(sub.expiresAt)} ·{" "}
                    {sub.planSlug}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    Renewal status:{" "}
                    {sub.status === "EXPIRED"
                      ? "expired"
                      : grace?.pastGrace
                        ? "past grace"
                        : grace
                          ? `grace (${grace.daysLeft}d left)`
                          : "active"}{" "}
                    · Payment:{" "}
                    {sub.razorpayPaymentId === null
                      ? "pending"
                      : `paid ${formatINR(sub.totalAmount)}`}
                    {configuredPlanFee != null ? (
                      <> · Configured fee {formatINR(configuredPlanFee)}</>
                    ) : null}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {multiple && (
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:border-gray-600 dark:text-gray-200">
                      <input
                        type="radio"
                        name={`primary-plan-${userId}`}
                        checked={isPrimary}
                        disabled={primaryMutation.isPending}
                        onChange={() => {
                          if (!isPrimary) primaryMutation.mutate(sub.id);
                        }}
                        className="h-3.5 w-3.5 text-indigo-600"
                      />
                      Show in app
                    </label>
                  )}
                  {switchTargets.length > 0 && canMutateSubscription && (
                    <>
                      {switchTargets.map((targetPlan) => (
                        <Button
                          key={targetPlan.id}
                          size="sm"
                          variant="secondary"
                          onClick={() => openSwitch(sub, targetPlan)}
                        >
                          <ArrowDownUp className="mr-1 h-3.5 w-3.5" />
                          {switchButtonLabel(sub.planSlug, targetPlan.slug)}
                        </Button>
                      ))}
                    </>
                  )}
                  {canMutateSubscription ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                      onClick={() =>
                        setCancelTarget({ id: sub.id, planName: sub.planName })
                      }
                    >
                      <UserMinus className="mr-1 h-3.5 w-3.5" />
                      Remove
                    </Button>
                  ) : null}
                  {onRecordPayment ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onRecordPayment()}
                    >
                      Record payment
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cancelTarget && (
        <ConfirmModal
          open
          title="Remove from coaching plan?"
          message={`Cancel "${cancelTarget.planName}" for this athlete? They will lose access when this subscription ends — status becomes CANCELLED.`}
          confirmLabel="Remove from plan"
          variant="danger"
          onConfirm={() => cancelMutation.mutate(cancelTarget.id)}
          onCancel={() => setCancelTarget(null)}
          isLoading={cancelMutation.isPending}
        />
      )}

      {switchTarget && (
        <Dialog
          open
          onOpenChange={(next) => {
            if (!next && !switchMutation.isPending) {
              setSwitchTarget(null);
              setSwitchAmount("");
              setSwitchReason("");
            }
          }}
        >
          <DialogContent className="max-w-md" showClose={false}>
            <DialogHeader>
              <DialogTitle>
                {switchDialogTitle(
                  switchTarget.direction,
                  planDisplayName(switchTarget.targetPlan.slug),
                )}
              </DialogTitle>
              <DialogDescription>
                Switch from {switchTarget.subscription.planName} to{" "}
                {switchTarget.targetPlan.name}. Start and expiry stay the same (
                {formatDate(switchTarget.subscription.startDate)} –{" "}
                {formatDate(switchTarget.subscription.expiresAt)}). The old plan
                is cancelled and this becomes the primary plan in the app.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Settlement amount (₹)
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={switchAmount}
                  onChange={(e) => setSwitchAmount(e.target.value)}
                  placeholder={String(switchTarget.targetPlan.price)}
                  disabled={switchMutation.isPending}
                />
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Default {formatINR(switchTarget.targetPlan.price)} (plan
                  price). Use 0 for a free switch.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Reason
                </label>
                <Textarea
                  value={switchReason}
                  onChange={(e) => setSwitchReason(e.target.value)}
                  placeholder="e.g. Athlete requested upgrade — UPI settlement on WhatsApp"
                  rows={3}
                  disabled={switchMutation.isPending}
                />
              </div>
            </div>

            <DialogFooter className="mt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setSwitchTarget(null);
                  setSwitchAmount("");
                  setSwitchReason("");
                }}
                disabled={switchMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => switchMutation.mutate()}
                isLoading={switchMutation.isPending}
                disabled={switchReason.trim().length < 3}
              >
                {switchTarget.direction === "upgrade"
                  ? "Confirm upgrade"
                  : "Confirm downgrade"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
