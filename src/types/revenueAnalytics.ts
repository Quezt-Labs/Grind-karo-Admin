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

export interface ProductRevenueAnalyticsItem {
  id: string;
  slug: string;
  name: string;
  stats: PlanRevenueAnalyticsItem["stats"];
}

export interface ProgramsRevenueAnalyticsResponse {
  monthKeys: string[];
  programs: ProductRevenueAnalyticsItem[];
}

export interface BooksRevenueAnalyticsResponse {
  monthKeys: string[];
  books: ProductRevenueAnalyticsItem[];
}

export interface ProgramRevenueAnalyticsResponse {
  programId: string;
  programName: string;
  monthlyRevenue: MonthlyRevenuePoint[];
  totalRevenue: number;
  totalSalesCount: number;
  latestMonthChangePercent: number;
}
