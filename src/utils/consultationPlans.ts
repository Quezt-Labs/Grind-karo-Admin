import type { CoachingPlan } from "@/types/program";

const CONSULTATION_PLAN_SLUGS = new Set([
  "general-strength-ultra",
  "hybrid-ultra",
]);

export function isConsultationPlan(
  plan: Pick<CoachingPlan, "slug" | "consultationBookingUrl">,
): boolean {
  return (
    Boolean(plan.consultationBookingUrl) ||
    CONSULTATION_PLAN_SLUGS.has(plan.slug)
  );
}
