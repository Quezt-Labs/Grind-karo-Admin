/** Keep in sync with grindkaro-svc coaching-plan-switch.util.ts */
export const ALLOWED_PLAN_SWITCHES: Readonly<
  Record<string, readonly string[]>
> = {
  mini: ["mega"],
  mega: ["mini", "ultra"],
  ultra: ["mega"],
};

const PLAN_TIER: Readonly<Record<string, number>> = {
  mini: 0,
  mega: 1,
  ultra: 2,
};

export function normalizePlanSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function allowedSwitchTargets(fromSlug: string): string[] {
  const from = normalizePlanSlug(fromSlug);
  return [...(ALLOWED_PLAN_SWITCHES[from] ?? [])];
}

export function switchDirectionFor(
  fromSlug: string,
  toSlug: string,
): "upgrade" | "downgrade" | null {
  const from = normalizePlanSlug(fromSlug);
  const to = normalizePlanSlug(toSlug);
  const allowed = ALLOWED_PLAN_SWITCHES[from];
  if (!allowed?.includes(to)) return null;
  const fromTier = PLAN_TIER[from];
  const toTier = PLAN_TIER[to];
  if (fromTier == null || toTier == null) return null;
  return toTier > fromTier ? "upgrade" : "downgrade";
}

export function planDisplayName(slug: string): string {
  const key = normalizePlanSlug(slug);
  if (key === "ultra") return "Ultra";
  if (key === "mega") return "Mega";
  if (key === "mini") return "Mini";
  return slug;
}

export function switchButtonLabel(fromSlug: string, toSlug: string): string {
  const direction = switchDirectionFor(fromSlug, toSlug);
  const targetName = planDisplayName(toSlug);
  if (!direction) return `Switch to ${targetName}`;
  return direction === "upgrade"
    ? `Upgrade to ${targetName}`
    : `Downgrade to ${targetName}`;
}
