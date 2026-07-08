import type { Purchase } from "@/types/user";

export const MINI_PLAN_SLUG = "mini";

/** MEGA / ULTRA — per-athlete coaching program built in admin. MINI is retail program-only. */
export function requiresPersonalCoachingProgram(planSlug: string): boolean {
  return planSlug.trim().toLowerCase() !== MINI_PLAN_SLUG;
}

export function activeCoachingSubscriptions(purchases: Purchase[]) {
  return purchases.filter(
    (p): p is Extract<Purchase, { kind: "coaching_subscription" }> =>
      p.kind === "coaching_subscription" &&
      p.status === "ACTIVE" &&
      // Exclude pending/incomplete checkouts: an ACTIVE row with no payment id
      // is an abandoned Razorpay attempt, not a live plan. `undefined` (older
      // payloads / pre-deploy) is treated as paid so nothing disappears.
      p.razorpayPaymentId !== null,
  );
}

/** Primary subscription first — matches athlete app when admin has pinned one. */
export function orderedActiveCoachingSubscriptions(
  purchases: Purchase[],
  primarySubscriptionId?: string | null,
) {
  const active = activeCoachingSubscriptions(purchases);
  if (!primarySubscriptionId) return active;
  const primary = active.find((s) => s.id === primarySubscriptionId);
  if (!primary) return active;
  return [primary, ...active.filter((s) => s.id !== primary.id)];
}

export function primaryCoachingSubscription(
  purchases: Purchase[],
  primarySubscriptionId?: string | null,
) {
  return orderedActiveCoachingSubscriptions(
    purchases,
    primarySubscriptionId,
  )[0];
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
