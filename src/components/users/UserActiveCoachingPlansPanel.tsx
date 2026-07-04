import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, UserMinus } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { coachingSubscriptionService } from "@/services/coachingSubscriptionService";
import {
  activeCoachingSubscriptions,
  orderedActiveCoachingSubscriptions,
} from "@/utils/coachingCapabilities";
import type { Purchase } from "@/types/user";
import { cn } from "@/utils/cn";

type Props = {
  userId: string;
  purchases: Purchase[];
  primarySubscriptionId?: string | null;
  onUpdated?: () => void;
  onSelectSubscription?: (subscriptionId: string) => void;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function UserActiveCoachingPlansPanel({
  userId,
  purchases,
  primarySubscriptionId,
  onUpdated,
  onSelectSubscription,
}: Props) {
  const queryClient = useQueryClient();
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    planName: string;
  } | null>(null);

  const activePlans = orderedActiveCoachingSubscriptions(
    purchases,
    primarySubscriptionId,
  );
  const pinnedId =
    primarySubscriptionId &&
    activePlans.some((p) => p.id === primarySubscriptionId)
      ? primarySubscriptionId
      : activePlans[0]?.id;

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

  if (activeCoachingSubscriptions(purchases).length === 0) {
    return null;
  }

  const multiple = activePlans.length > 1;

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800/60 dark:bg-indigo-900/10">
      <div className="mb-3 flex items-start gap-3">
        <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/40">
          <Crown className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Active coaching plans
            {multiple ? ` (${activePlans.length})` : ""}
          </h3>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
            {multiple
              ? "Choose which plan drives the athlete app and program editor. Remove plans the athlete should no longer access."
              : "Manage this athlete's coaching access."}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {activePlans.map((sub) => {
          const isPrimary = sub.id === pinnedId;

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
    </section>
  );
}
