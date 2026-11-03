import { RevenueChart } from "@/components/dashboard/RevenueChart";
import type { ProgramRevenueAnalyticsResponse } from "@/types/revenueAnalytics";
import { cn } from "@/utils/cn";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

interface ProgramRevenuePanelProps {
  data: ProgramRevenueAnalyticsResponse;
  className?: string;
}

export function ProgramRevenuePanel({
  data,
  className,
}: ProgramRevenuePanelProps) {
  const change = data.latestMonthChangePercent;

  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6",
        className,
      )}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue history
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last 12 months · program + add-on purchases
          </p>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatINR(data.totalRevenue)}{" "}
            <span className="font-normal text-gray-500">in window</span>
          </div>
          <div className="text-gray-500 dark:text-gray-400">
            {data.totalSalesCount} paid orders · latest month{" "}
            <span
              className={
                change >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              }
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>{" "}
            vs prior
          </div>
        </div>
      </div>
      <RevenueChart
        data={data.monthlyRevenue}
        caption="Calendar month when payment was recorded"
      />
    </div>
  );
}
