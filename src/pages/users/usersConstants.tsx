import { cn } from "@/utils/cn";
import type { Column } from "@/types/dashboard";

export function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export type PurchaserRow = {
  id: string;
  name: string;
  email: string;
  coachingSubs: string;
  programPurchases: string;
  totalSpent: string;
  lastPurchase: string;
};

export type Tab = "all" | "purchasers" | "coaching-setup";

export type CoachingSetupRow = {
  id: string;
  name: string;
  email: string;
  planName: string;
  city: string;
  state: string;
  setupStatus: string;
  subscribedAt: string;
  expiresAt: string;
};

export const userColumns: Column<UserRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  {
    key: "role",
    header: "Role",
    sortable: true,
    render: (value) => (
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
          value === "ADMIN"
            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
            : value === "ASSISTANT_COACH"
              ? "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
        )}
      >
        {value as string}
      </span>
    ),
  },
  { key: "createdAt", header: "Joined", sortable: true },
];

export const purchaserColumns: Column<PurchaserRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "coachingSubs", header: "Coaching", sortable: true },
  { key: "programPurchases", header: "Programs", sortable: true },
  { key: "totalSpent", header: "Total Spent", sortable: true },
  { key: "lastPurchase", header: "Last Purchase", sortable: true },
];
