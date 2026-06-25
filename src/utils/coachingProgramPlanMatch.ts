import type { Purchase } from "@/types/user";
import { activeCoachingSubscriptions } from "@/utils/coachingCapabilities";

export type CoachingProgramPlanLink = {
  coachingPlanId?: string | null;
  createdAt: string | Date;
};

export type ActiveCoachingSubscriptionRef = {
  planId: string;
  startDate: string | Date;
};

export function coachingProgramMatchesSubscription(
  program: CoachingProgramPlanLink,
  subscription: ActiveCoachingSubscriptionRef | null | undefined,
): boolean {
  if (!subscription) return true;
  if (!program.coachingPlanId) return false;
  return program.coachingPlanId === subscription.planId;
}

export function primaryActiveCoachingSubscription(
  purchases: Purchase[],
): Extract<Purchase, { kind: "coaching_subscription" }> | undefined {
  return activeCoachingSubscriptions(purchases)[0];
}
