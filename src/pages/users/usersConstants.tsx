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
  setupStatus: string;
  subscribedAt: string;
  expiresAt: string;
};

export const coachingSetupStatusLabel: Record<string, string> = {
  needs_intake: "Needs intake",
  awaiting_sheet: "Awaiting sheet",
  ready: "Ready",
};

export function CoachingSetupStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "ready" &&
          "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        status === "awaiting_sheet" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
        status === "needs_intake" &&
          "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      )}
    >
      {coachingSetupStatusLabel[status] ?? status}
    </span>
  );
}

export const coachingSetupColumns: Column<CoachingSetupRow>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "email", header: "Email", sortable: true },
  { key: "planName", header: "Plan", sortable: true },
  {
    key: "setupStatus",
    header: "Status",
    sortable: true,
    render: (value) => <CoachingSetupStatusBadge status={value as string} />,
  },
  { key: "subscribedAt", header: "Subscribed", sortable: true },
  { key: "expiresAt", header: "Expires", sortable: true },
];

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
