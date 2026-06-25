import type { CoachingPurchase, Purchase } from "@/types/user";

export type SubscriptionDateRange = {
  start: Date;
  end: Date;
};

export type UserActivityScope =
  | { mode: "all" }
  | {
      mode: "subscription";
      subscription: CoachingPurchase;
      subscriptionId: string;
      range: SubscriptionDateRange;
    };

export function subscriptionDateRange(
  subscription: Pick<CoachingPurchase, "startDate" | "expiresAt">,
): SubscriptionDateRange {
  return {
    start: new Date(subscription.startDate),
    end: new Date(subscription.expiresAt),
  };
}

export function isWithinSubscriptionRange(
  iso: string,
  range: SubscriptionDateRange,
): boolean {
  const at = new Date(iso).getTime();
  return at >= range.start.getTime() && at <= range.end.getTime();
}

export function weekRangeOverlapsSubscription(
  weekStart: string,
  weekEnd: string,
  range: SubscriptionDateRange,
): boolean {
  const start = new Date(`${weekStart}T00:00:00`).getTime();
  const end = new Date(`${weekEnd}T23:59:59.999`).getTime();
  return end >= range.start.getTime() && start <= range.end.getTime();
}

export function resolveUserActivityScope(
  purchases: Purchase[],
  subscriptionId: string | null,
  planId: string | null,
): UserActivityScope {
  if (subscriptionId) {
    const subscription = purchases.find(
      (p): p is CoachingPurchase =>
        p.kind === "coaching_subscription" && p.id === subscriptionId,
    );
    if (subscription) {
      return {
        mode: "subscription",
        subscription,
        subscriptionId,
        range: subscriptionDateRange(subscription),
      };
    }
  }

  if (planId) {
    const subscription = purchases.find(
      (p): p is CoachingPurchase =>
        p.kind === "coaching_subscription" && p.planId === planId,
    );
    if (subscription) {
      return {
        mode: "subscription",
        subscription,
        subscriptionId: subscription.id,
        range: subscriptionDateRange(subscription),
      };
    }
  }

  return { mode: "all" };
}

export function activityScopeKey(scope: UserActivityScope): string {
  return scope.mode === "subscription" ? scope.subscriptionId : "all";
}
