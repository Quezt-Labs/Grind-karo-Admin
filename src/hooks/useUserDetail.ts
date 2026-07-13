import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/userService";
import { coachingProgramService } from "@/services/coachingProgramService";
import type { CoachingSetupStatus } from "@/types/user";
import {
  hasPersonalCoachingSubscription,
  paidProgramPurchases,
  primaryCoachingSubscription,
} from "@/utils/coachingCapabilities";
import { coachingProgramMatchesSubscription } from "@/utils/coachingProgramPlanMatch";
import { hasCoachingAthleteContext } from "@/components/users/athleteActivitySections";
import { formCheckInboxService } from "@/services/formCheckInboxService";

export type UserDetailTab = "activity" | "coaching" | "purchases";

export function useUserDetail(
  userId: string | undefined,
  subscriptionId?: string,
) {
  const {
    data: purchasesData,
    isLoading: purchasesLoading,
    isError: purchasesError,
  } = useQuery({
    queryKey: ["admin-user-purchases", userId, subscriptionId ?? "all"],
    queryFn: () =>
      userService.getPurchases(userId!, {
        subscriptionId,
      }),
    enabled: !!userId,
  });

  const purchases = useMemo(
    () => purchasesData?.purchases ?? [],
    [purchasesData?.purchases],
  );

  const hasActiveCoaching = purchases.some(
    (p) => p.kind === "coaching_subscription" && p.status === "ACTIVE",
  );

  const hasPersonalCoaching = useMemo(
    () => hasPersonalCoachingSubscription(purchases),
    [purchases],
  );

  const hasPaidPrograms = paidProgramPurchases(purchases).length > 0;
  const primaryCoachingSub = primaryCoachingSubscription(
    purchases,
    purchasesData?.user?.primaryCoachingSubscriptionId,
  );

  const {
    data: intakeData,
    isError: intakeMissing,
    isLoading: intakeLoading,
  } = useQuery({
    queryKey: ["admin-user-info", userId],
    queryFn: () => userService.getUserInfo(userId!),
    enabled: !!userId && !!purchasesData && hasActiveCoaching,
    retry: false,
  });

  const {
    data: coachingProgramData,
    isLoading: coachingProgramLoading,
    isError: coachingProgramError,
  } = useQuery({
    queryKey: ["coaching-program", userId],
    queryFn: () => coachingProgramService.getForUser(userId!),
    enabled: !!userId && hasPersonalCoaching,
  });

  const coachingSetupStatus = useMemo((): CoachingSetupStatus | null => {
    if (!hasPersonalCoaching || !purchasesData) return null;
    if (intakeLoading) return null;
    if (intakeMissing || !intakeData) return "needs_intake";
    if (!coachingProgramData?.program) return "awaiting_program";

    const primarySub = primaryCoachingSubscription(
      purchases,
      purchasesData?.user?.primaryCoachingSubscriptionId,
    );
    if (
      primarySub &&
      !(
        coachingProgramData.programMatchesActivePlan ??
        coachingProgramMatchesSubscription(
          {
            coachingPlanId: coachingProgramData.program.coachingPlanId,
            createdAt:
              coachingProgramData.program.createdAt ??
              new Date(0).toISOString(),
          },
          { planId: primarySub.planId, startDate: primarySub.startDate },
        )
      )
    ) {
      return "awaiting_program";
    }
    return "ready";
  }, [
    hasPersonalCoaching,
    purchasesData,
    intakeData,
    intakeMissing,
    intakeLoading,
    coachingProgramData,
    purchases,
  ]);

  const showCoachingActivity = hasCoachingAthleteContext(purchases);
  const scopeKey = subscriptionId ?? "all";

  const { data: pendingFormCheckData } = useQuery({
    queryKey: ["form-check-inbox-pending-user", userId, scopeKey],
    queryFn: () =>
      formCheckInboxService.list({
        userId: userId!,
        uncommentedOnly: true,
        limit: 100,
      }),
    enabled: !!userId && showCoachingActivity,
  });

  const pendingVideoCount = pendingFormCheckData?.total ?? 0;

  const purchaseStats = useMemo(() => {
    if (!purchasesData) return null;
    const coaching = purchases.filter(
      (p) => p.kind === "coaching_subscription",
    );
    const programs = purchases.filter((p) => p.kind === "program_purchase");
    const books = purchases.filter((p) => p.kind === "book_purchase");
    const totalSpent = purchases.reduce((sum, p) => {
      if (p.kind === "coaching_subscription") return sum + p.totalAmount;
      if (p.kind === "program_purchase" && p.status === "PAID")
        return sum + p.amount;
      if (p.kind === "book_purchase" && p.status === "PAID")
        return sum + p.amount;
      return sum;
    }, 0);
    return {
      coachingCount: coaching.length,
      programCount: programs.length,
      bookCount: books.length,
      totalSpent,
    };
  }, [purchasesData, purchases]);

  return {
    user: purchasesData?.user,
    purchases,
    purchasesData,
    purchasesLoading,
    purchasesError,
    intakeData,
    intakeLoading,
    intakeMissing,
    coachingProgramData,
    coachingProgramLoading,
    coachingProgramError,
    hasActiveCoaching,
    hasPersonalCoaching,
    hasPaidPrograms,
    primaryCoachingSub,
    coachingSetupStatus,
    showCoachingActivity,
    pendingVideoCount,
    purchaseStats,
  };
}
