import type { Purchase } from "@/types/user";

export const MINI_PLAN_SLUG = "mini";

/** MEGA / ULTRA — per-athlete coaching program built in admin. MINI is retail program-only. */
export function requiresPersonalCoachingProgram(planSlug: string): boolean {
  return planSlug.trim().toLowerCase() !== MINI_PLAN_SLUG;
}

export function activeCoachingSubscriptions(purchases: Purchase[]) {
  return purchases.filter(
    (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
      p.kind === "coaching_subscription" && p.status === "ACTIVE",
  );
}

export function hasPersonalCoachingSubscription(
  purchases: Purchase[],
): boolean {
  return activeCoachingSubscriptions(purchases).some((p) =>
    requiresPersonalCoachingProgram(p.planSlug),
  );
}

export function paidProgramPurchases(purchases: Purchase[]) {
  return purchases.filter(
    (p): p is Extract<Purchase, { kind: "program_purchase" }> =>
      p.kind === "program_purchase" && p.status === "PAID",
  );
}
