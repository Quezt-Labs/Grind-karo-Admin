const MINI_PLAN_SLUG = "mini";

export function normalizeCoachingPlanSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** MEGA / ULTRA include form-check video; MINI does not. */
export function planGrantsFormCheck(slug: string): boolean {
  return normalizeCoachingPlanSlug(slug) !== MINI_PLAN_SLUG;
}
