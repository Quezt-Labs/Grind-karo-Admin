import type { MonthlyRevenuePoint } from "@/types/dashboardOverview";
import { cn } from "@/utils/cn";

function formatINRShort(rupees: number): string {
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}k`;
  return `₹${rupees}`;
}

interface RevenueChartProps {
  data: MonthlyRevenuePoint[];
  className?: string;
}

export function RevenueChart({ data, className }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex h-48 items-end gap-2 sm:gap-3">
        {data.map((point) => {
          const heightPct = Math.max(
            4,
            Math.round((point.revenue / maxRevenue) * 100),
          );
          return (
            <div
              key={point.month}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <div className="flex h-full w-full flex-col justify-end">
                <span
                  className="mb-1 text-center text-[10px] font-medium tabular-nums text-gray-500 dark:text-gray-400"
                  title={`${point.revenue.toLocaleString("en-IN")} · ${point.salesCount} sales`}
                >
                  {point.revenue > 0 ? formatINRShort(point.revenue) : "—"}
                </span>
                <div
                  className="w-full rounded-t-md bg-emerald-500 transition-all dark:bg-emerald-600"
                  style={{ height: `${heightPct}%` }}
                  title={`${point.label}: ₹${point.revenue.toLocaleString("en-IN")} (${point.salesCount} sales)`}
                />
              </div>
              <span className="truncate text-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                {point.label.replace(/\s\d{4}$/, "")}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Last 6 months · paid coaching, programs & books
      </p>
    </div>
  );
}
