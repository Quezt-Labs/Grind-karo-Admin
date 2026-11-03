import type { MonthlyRevenuePoint } from "./dashboardOverview";

export interface PlanRevenueAnalyticsItem {
  planId: string;
  slug: string;
  name: string;
  stats: {
    monthly: MonthlyRevenuePoint[];
    totalRevenue: number;
    totalSalesCount: number;
    latestMonthChangePercent: number;
  };
}

export interface PlanRevenueAnalyticsResponse {
  monthKeys: string[];
  plans: PlanRevenueAnalyticsItem[];
}

export interface ProgramRevenueAnalyticsResponse {
  programId: string;
  programName: string;
  monthlyRevenue: MonthlyRevenuePoint[];
  totalRevenue: number;
  totalSalesCount: number;
  latestMonthChangePercent: number;
}
