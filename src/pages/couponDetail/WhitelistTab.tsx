import { memo } from "react";
import { Plus, X, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { couponService } from "@/services/couponService";
import { planService } from "@/services/planService";
import { programService } from "@/services/programService";
import type { Coupon } from "@/types/coupon";

interface WhitelistTabProps {
  coupon: Coupon;
}

export const WhitelistTab = memo(function WhitelistTab({
  coupon,
}: WhitelistTabProps) {
  const queryClient = useQueryClient();

  const { data: coachingPlans } = useQuery({
    queryKey: ["plans-all"],
    queryFn: () => planService.getAll(),
    enabled: coupon.scope === "SPECIFIC",
  });

  const { data: programs } = useQuery({
    queryKey: ["programs-all-list"],
    queryFn: () => programService.getAll(),
    enabled: coupon.scope === "SPECIFIC",
  });

  const linkProgram = useMutation({
    mutationFn: (programId: string) =>
      couponService.linkProgram(coupon.id, programId),
    onSuccess: () => {
      toast.success("Program linked");
      queryClient.invalidateQueries({ queryKey: ["coupon", coupon.id] });
    },
  });

  const unlinkProgram = useMutation({
    mutationFn: (programId: string) =>
      couponService.unlinkProgram(coupon.id, programId),
    onSuccess: () => {
      toast.success("Program unlinked");
      queryClient.invalidateQueries({ queryKey: ["coupon", coupon.id] });
    },
  });

  const linkPlan = useMutation({
    mutationFn: (planId: string) =>
      couponService.linkCoachingPlan(coupon.id, planId),
    onSuccess: () => {
      toast.success("Coaching plan linked");
      queryClient.invalidateQueries({ queryKey: ["coupon", coupon.id] });
    },
  });

  const unlinkPlan = useMutation({
    mutationFn: (planId: string) =>
      couponService.unlinkCoachingPlan(coupon.id, planId),
    onSuccess: () => {
      toast.success("Coaching plan unlinked");
      queryClient.invalidateQueries({ queryKey: ["coupon", coupon.id] });
    },
  });

  if (coupon.scope !== "SPECIFIC") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 dark:border-gray-600 dark:bg-gray-800/50">
        <ShieldCheck className="h-6 w-6 text-gray-400" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Whitelist management is only available for coupons with
          <span className="mx-1 font-medium">SPECIFIC</span> scope. This coupon
          applies to{" "}
          <span className="font-medium">
            {coupon.scope.replace("_", " ").toLowerCase()}
          </span>
          .
        </p>
      </div>
    );
  }

  const linkedPrograms = programs?.filter((p) =>
    coupon.programIds.includes(p.id),
  );
  const availablePrograms = programs?.filter(
    (p) => !coupon.programIds.includes(p.id),
  );
  const linkedPlans = coachingPlans?.filter((p) =>
    coupon.coachingPlanIds.includes(p.id),
  );
  const availablePlans = coachingPlans?.filter(
    (p) => !coupon.coachingPlanIds.includes(p.id),
  );

  return (
    <div className="space-y-6">
      {/* Programs whitelist */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Linked Programs ({coupon.programIds.length})
        </h3>
        {linkedPrograms && linkedPrograms.length > 0 ? (
          <div className="space-y-2">
            {linkedPrograms.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {p.name}
                </span>
                <button
                  onClick={() => unlinkProgram.mutate(p.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No programs linked.</p>
        )}
        {availablePrograms && availablePrograms.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availablePrograms.map((p) => (
              <button
                key={p.id}
                onClick={() => linkProgram.mutate(p.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <Plus className="h-3 w-3" />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Coaching plans whitelist */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Linked Coaching Plans ({coupon.coachingPlanIds.length})
        </h3>
        {linkedPlans && linkedPlans.length > 0 ? (
          <div className="space-y-2">
            {linkedPlans.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="text-sm text-gray-800 dark:text-gray-200">
                  {p.name}
                </span>
                <button
                  onClick={() => unlinkPlan.mutate(p.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No coaching plans linked.</p>
        )}
        {availablePlans && availablePlans.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availablePlans.map((p) => (
              <button
                key={p.id}
                onClick={() => linkPlan.mutate(p.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-600 hover:border-primary-400 hover:text-primary-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <Plus className="h-3 w-3" />
                {p.name}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
