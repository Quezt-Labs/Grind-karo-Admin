import { cn } from "@/utils/cn";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Column } from "@/types/dashboard";
import type { CouponScope } from "@/types/coupon";

export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export const SCOPE_COLORS: Record<string, string> = {
  ALL: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  PROGRAMS:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  COACHING_PLANS:
    "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  SPECIFIC:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

export type CouponRow = {
  id: string;
  code: string;
  discount: string;
  scope: string;
  usage: string;
  window: string;
  status: string;
};

export type ActiveFilter = "" | "true" | "false";
export type ScopeFilter = "" | CouponScope;

export const couponColumns: Column<CouponRow>[] = [
  { key: "code", header: "Code", sortable: true },
  { key: "discount", header: "Discount", sortable: true },
  {
    key: "scope",
    header: "Scope",
    sortable: true,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
          SCOPE_COLORS[value as string] ?? "",
        )}
      >
        {(value as string).replace("_", " ")}
      </span>
    ),
  },
  { key: "usage", header: "Usage", sortable: true },
  { key: "window", header: "Window", sortable: true },
  {
    key: "status",
    header: "Status",
    sortable: true,
    render: (value) => <StatusBadge status={value as string} />,
  },
];
