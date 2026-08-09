import { useMemo } from "react";
import type { CoachingAddonStatus, Purchase } from "@/types/user";
import type { CoachingPlan } from "@/types/program";
import { cn } from "@/utils/cn";

type AddonStatus =
  | "active"
  | "purchased"
  | "not_purchased"
  | "expired"
  | "inactive";

type AddonRow = {
  key: string;
  name: string;
  slug?: string | null;
  status: AddonStatus;
  sourcePlans: string[];
  price?: number | null;
  expiresAt?: string | null;
};

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function statusPriority(status: AddonStatus): number {
  switch (status) {
    case "active":
      return 5;
    case "purchased":
      return 4;
    case "not_purchased":
      return 3;
    case "expired":
      return 2;
    default:
      return 1;
  }
}

function mergeStatus(current: AddonStatus, next: AddonStatus): AddonStatus {
  return statusPriority(next) > statusPriority(current) ? next : current;
}

function mapSnapshotStatus(
  rawStatus: string | undefined,
  activeFlag: boolean | undefined,
  subscriptionStatus: "ACTIVE" | "EXPIRED" | "CANCELLED",
): AddonStatus {
  const normalized = rawStatus?.trim().toUpperCase();
  if (normalized === "ACTIVE") return "active";
  if (normalized === "NOT_PURCHASED") return "not_purchased";
  if (normalized === "EXPIRED") return "expired";
  if (normalized === "INACTIVE") return "inactive";
  if (activeFlag === true) return "active";
  if (activeFlag === false) return "inactive";
  if (subscriptionStatus === "ACTIVE") return "active";
  if (subscriptionStatus === "EXPIRED") return "expired";
  return "inactive";
}

function isCoachingPurchase(
  purchase: Purchase,
): purchase is Extract<Purchase, { kind: "coaching_subscription" }> {
  return purchase.kind === "coaching_subscription";
}

export function AddonEntitlementsPanel({
  purchases,
  planCatalog = [],
  addonStatuses = [],
  compact = false,
}: {
  purchases: Purchase[];
  planCatalog?: CoachingPlan[];
  addonStatuses?: CoachingAddonStatus[];
  compact?: boolean;
}) {
  const rows = useMemo(() => {
    if (addonStatuses.length > 0) {
      const fromApi = addonStatuses.map((item) => {
        const state = item.state.toLowerCase();
        const status: AddonStatus =
          state === "active"
            ? "active"
            : state === "purchased"
              ? "purchased"
              : state === "expired"
                ? "expired"
                : "inactive";
        return {
          key: item.addonId?.trim() || item.slug?.trim() || item.name.toLowerCase(),
          name: item.name,
          slug: item.slug ?? null,
          status,
          sourcePlans: [
            item.sourcePlanName?.trim() || item.planName?.trim() || "Coaching",
          ],
          price: item.price ?? null,
          expiresAt: item.expiresAt ?? null,
        } satisfies AddonRow;
      });
      return fromApi.sort((a, b) => {
        const statusDelta = statusPriority(b.status) - statusPriority(a.status);
        if (statusDelta !== 0) return statusDelta;
        return a.name.localeCompare(b.name);
      });
    }

    const map = new Map<string, AddonRow>();
    const coachingSubs = purchases
      .filter(isCoachingPurchase)
      .filter((sub) => sub.status === "ACTIVE" || sub.status === "EXPIRED");

    for (const sub of coachingSubs) {
      for (const snap of sub.addonsSnapshot ?? []) {
        const key =
          snap.addonId?.trim() ||
          snap.slug?.trim() ||
          snap.name.trim().toLowerCase();
        if (!key) continue;
        const status = mapSnapshotStatus(snap.status, snap.active, sub.status);
        const prev = map.get(key);
        if (!prev) {
          map.set(key, {
            key,
            name: snap.name,
            slug: snap.slug ?? null,
            status,
            sourcePlans: [sub.planName],
            price: snap.pricePaid ?? null,
            expiresAt: snap.expiresAt ?? null,
          });
          continue;
        }
        prev.status = mergeStatus(prev.status, status);
        if (!prev.sourcePlans.includes(sub.planName)) {
          prev.sourcePlans.push(sub.planName);
        }
        if (prev.price == null && snap.pricePaid != null) {
          prev.price = snap.pricePaid;
        }
        if (!prev.expiresAt && snap.expiresAt) {
          prev.expiresAt = snap.expiresAt;
        }
      }
    }

    const activePlanIds = new Set(
      coachingSubs.filter((s) => s.status === "ACTIVE").map((s) => s.planId),
    );
    const relevantPlans = planCatalog.filter((p) => activePlanIds.has(p.id));
    for (const plan of relevantPlans) {
      for (const addon of plan.availableAddons ?? []) {
        const key = addon.id || addon.slug || addon.name.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          if (!existing.sourcePlans.includes(plan.name)) {
            existing.sourcePlans.push(plan.name);
          }
          continue;
        }
        map.set(key, {
          key,
          name: addon.name,
          slug: addon.slug,
          status: "not_purchased",
          sourcePlans: [plan.name],
          price: addon.price,
          expiresAt: null,
        });
      }
    }

    return [...map.values()].sort((a, b) => {
      const statusDelta = statusPriority(b.status) - statusPriority(a.status);
      if (statusDelta !== 0) return statusDelta;
      return a.name.localeCompare(b.name);
    });
  }, [addonStatuses, purchases, planCatalog]);

  const tone = (status: AddonStatus): string => {
    if (status === "active") {
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
    }
    if (status === "purchased") {
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
    }
    if (status === "not_purchased") {
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    }
    if (status === "expired") {
      return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
    }
    return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  };

  const label = (status: AddonStatus): string => {
    if (status === "active") return "Active";
    if (status === "purchased") return "Purchased";
    if (status === "not_purchased") return "Not purchased";
    if (status === "expired") return "Expired";
    return "Inactive";
  };

  if (rows.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400">
        No add-on entitlement snapshots yet.
      </p>
    );
  }

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/70 px-2.5 py-2 dark:border-gray-700 dark:bg-gray-900/30"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
              {row.name}
            </p>
            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
              {row.sourcePlans.join(" · ")}
              {row.price != null ? ` · ${formatINR(row.price)}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {row.expiresAt && row.status === "expired" ? (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Ended {new Date(row.expiresAt).toLocaleDateString("en-IN")}
              </span>
            ) : null}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                tone(row.status),
              )}
            >
              {label(row.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
