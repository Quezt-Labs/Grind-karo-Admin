import { Link } from "react-router-dom";
import type { MonthlyRevenuePoint } from "@/types/dashboardOverview";
import { cn } from "@/utils/cn";

function formatINR(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

function formatINRCompact(rupees: number): string {
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(1)}k`;
  return formatINR(rupees);
}

function monthHeaderLabel(monthKey: string): string {
  const d = new Date(`${monthKey}-01T00:00:00.000Z`);
  return d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
}

export type RevenueComparisonRow = {
  id: string;
  name: string;
  href: string;
  stats: {
    monthly: MonthlyRevenuePoint[];
    totalRevenue: number;
    totalSalesCount: number;
    latestMonthChangePercent: number;
  };
};

interface RevenueComparisonTableProps {
  monthKeys: string[];
  rows: RevenueComparisonRow[];
  nameColumn?: string;
  caption: string;
  className?: string;
  hideZeroRows?: boolean;
}

export function RevenueComparisonTable({
  monthKeys,
  rows,
  nameColumn = "Product",
  caption,
  className,
  hideZeroRows = false,
}: RevenueComparisonTableProps) {
  const visibleRows = hideZeroRows
    ? rows.filter((r) => r.stats.totalRevenue > 0)
    : rows;

  if (visibleRows.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No paid sales in this window.
      </p>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="sticky left-0 z-10 bg-white py-2 pr-4 font-semibold text-gray-900 dark:bg-gray-800 dark:text-white">
              {nameColumn}
            </th>
            {monthKeys.map((key) => (
              <th
                key={key}
                className="px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-300"
              >
                {monthHeaderLabel(key)}
              </th>
            ))}
            <th className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">
              Total
            </th>
            <th className="px-2 py-2 text-right font-medium text-gray-600 dark:text-gray-300">
              MoM
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const byMonth = new Map(row.stats.monthly.map((p) => [p.month, p]));
            const change = row.stats.latestMonthChangePercent;
            return (
              <tr
                key={row.id}
                className="border-b border-gray-100 dark:border-gray-700/80"
              >
                <td className="sticky left-0 z-10 bg-white py-2 pr-4 dark:bg-gray-800">
                  <Link
                    to={row.href}
                    className="font-medium text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {row.name}
                  </Link>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {row.stats.totalSalesCount} sales in window
                  </div>
                </td>
                {monthKeys.map((key) => {
                  const point = byMonth.get(key);
                  const revenue = point?.revenue ?? 0;
                  const sales = point?.salesCount ?? 0;
                  return (
                    <td
                      key={key}
                      className="px-2 py-2 text-right tabular-nums text-gray-800 dark:text-gray-200"
                      title={`${formatINR(revenue)} · ${sales} sale(s)`}
                    >
                      {revenue > 0 ? formatINRCompact(revenue) : "—"}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-right font-medium tabular-nums text-gray-900 dark:text-white">
                  {formatINRCompact(row.stats.totalRevenue)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      change > 0 && "text-emerald-600 dark:text-emerald-400",
                      change < 0 && "text-red-600 dark:text-red-400",
                      change === 0 && "text-gray-500",
                    )}
                  >
                    {change > 0 ? "+" : ""}
                    {change}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{caption}</p>
    </div>
  );
}
