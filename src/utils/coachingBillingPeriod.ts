/** Each stored fee period / validityMonths value is one 4-week coaching block. */
export const COACHING_WEEKS_PER_BILLING_PERIOD = 4;
export const COACHING_DAYS_PER_BILLING_PERIOD =
  COACHING_WEEKS_PER_BILLING_PERIOD * 7;

export function billingPeriodWeeks(periodCount: number): number {
  return periodCount * COACHING_WEEKS_PER_BILLING_PERIOD;
}

export function billingPeriodDays(periodCount: number): number {
  return periodCount * COACHING_DAYS_PER_BILLING_PERIOD;
}

export function formatBillingPeriodLabel(periodCount: number): string {
  const weeks = billingPeriodWeeks(periodCount);
  const days = billingPeriodDays(periodCount);
  return `${weeks} weeks (${days} days)`;
}
