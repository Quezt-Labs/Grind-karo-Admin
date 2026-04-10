import type { ReactNode } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Activity,
} from "lucide-react";
import { cn } from "@/utils/cn";

const iconMap: Record<string, ReactNode> = {
  Users: <Users className="h-6 w-6" />,
  DollarSign: <DollarSign className="h-6 w-6" />,
  ShoppingCart: <ShoppingCart className="h-6 w-6" />,
  Activity: <Activity className="h-6 w-6" />,
};

interface StatsCardProps {
  title: string;
  value: string;
  change: number;
  changeType: "increase" | "decrease";
  icon: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType,
  icon,
}: StatsCardProps) {
  const isPositive = changeType === "increase";

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className="rounded-lg bg-primary-50 p-3 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
          {iconMap[icon] ?? <Activity className="h-6 w-6" />}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span
          className={cn(
            "text-sm font-medium",
            isPositive ? "text-green-500" : "text-red-500",
          )}
        >
          {change}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          vs last month
        </span>
      </div>
    </div>
  );
}
