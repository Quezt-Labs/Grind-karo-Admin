import { Link } from "react-router-dom";
import { CreditCard, IndianRupee } from "lucide-react";
import type { Plan } from "@/types/program";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

interface PlansSummaryCardProps {
  programId: string;
  plans: Plan[] | undefined;
}

export function PlansSummaryCard({ programId, plans }: PlansSummaryCardProps) {
  const activePlans = plans?.filter((p) => p.isActive) ?? [];
  const totalPlans = plans?.length ?? 0;
  const prices = plans?.map((p) => p.price).sort((a, b) => a - b) ?? [];
  const priceRange =
    prices.length === 0
      ? "No plans"
      : prices.length === 1
        ? formatPrice(prices[0])
        : `${formatPrice(prices[0])} – ${formatPrice(prices[prices.length - 1])}`;

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <CreditCard className="h-4 w-4" />
          Plans Overview
        </h3>
        <Link
          to={`/programs/${programId}/plans`}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Manage &rarr;
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {totalPlans}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Total Plans
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {activePlans.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Active Plans
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <IndianRupee className="h-4 w-4 text-gray-400" />
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {prices.length > 0 ? priceRange : "—"}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Price Range
          </p>
        </div>
      </div>
    </div>
  );
}
