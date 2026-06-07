import type { MonthlyRevenuePoint } from "@/types/dashboardOverview";
import { cn } from "@/utils/cn";

const BAR_AREA_PX = 160;

function formatINRShort(rupees: number): string {
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}k`;
  return `₹${rupees}`;
}

interface RevenueChartProps {
  data: MonthlyRevenuePoint[];
  className?: string;
  caption?: string;
}

export function RevenueChart({
  data,
  className,
  caption = "Last 6 months · paid coaching, programs & books",
}: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-2 sm:gap-3">
        {data.map((point) => {
          const barPx =
            point.revenue > 0
              ? Math.max(
                  4,
                  Math.round((point.revenue / maxRevenue) * BAR_AREA_PX),
                )
              : 0;

          return (
            <div
              key={point.month}
              className="flex min-w-0 flex-1 flex-col items-center"
            >
              <div
                className="flex w-full flex-col items-center justify-end"
                style={{ height: BAR_AREA_PX }}
              >
                <span
                  className="mb-1 text-center text-[10px] font-medium tabular-nums text-gray-500 dark:text-gray-400"
                  title={`${point.revenue.toLocaleString("en-IN")} · ${point.salesCount} sales`}
                >
                  {point.revenue > 0 ? formatINRShort(point.revenue) : "—"}
                </span>
                <div
                  className={cn(
                    "w-full rounded-t-md transition-all",
                    barPx > 0
                      ? "bg-emerald-500 dark:bg-emerald-600"
                      : "bg-gray-200 dark:bg-gray-700",
                  )}
                  style={{ height: barPx }}
                  title={`${point.label}: ₹${point.revenue.toLocaleString("en-IN")} (${point.salesCount} sales)`}
                />
              </div>
              <span className="mt-2 truncate text-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                {point.label.replace(/\s\d{4}$/, "")}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{caption}</p>
    </div>
  );
}
