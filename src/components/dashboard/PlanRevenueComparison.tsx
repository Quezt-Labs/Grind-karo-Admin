import type { PlanRevenueAnalyticsResponse } from "@/types/revenueAnalytics";
import {
  RevenueComparisonTable,
  type RevenueComparisonRow,
} from "@/components/dashboard/RevenueComparisonTable";

interface PlanRevenueComparisonProps {
  data: PlanRevenueAnalyticsResponse;
}

export function PlanRevenueComparison({ data }: PlanRevenueComparisonProps) {
  const rows: RevenueComparisonRow[] = data.plans.map((plan) => ({
    id: plan.planId,
    name: plan.name,
    href: `/plans/${plan.planId}`,
    stats: plan.stats,
  }));

  return (
    <RevenueComparisonTable
      monthKeys={data.monthKeys}
      rows={rows}
      nameColumn="Plan"
      caption="Coaching plans · Razorpay, admin grants, and offline renewal payments"
    />
  );
}
