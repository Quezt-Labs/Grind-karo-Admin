import api from "./api";
import type { DashboardOverviewResponse } from "@/types/dashboardOverview";
import type {
  BooksRevenueAnalyticsResponse,
  PlanRevenueAnalyticsResponse,
  ProgramRevenueAnalyticsResponse,
  ProgramsRevenueAnalyticsResponse,
} from "@/types/revenueAnalytics";

export const dashboardService = {
  async getOverview(months = 6): Promise<DashboardOverviewResponse> {
    const { data } = await api.get("/admin/dashboard/overview", {
      params: { months },
    });
    return data.data ?? data;
  },

  async getPlanRevenue(months = 6): Promise<PlanRevenueAnalyticsResponse> {
    const { data } = await api.get("/admin/dashboard/plan-revenue", {
      params: { months },
    });
    return data.data ?? data;
  },

  async getProgramRevenue(
    programId: string,
    months = 12,
  ): Promise<ProgramRevenueAnalyticsResponse> {
    const { data } = await api.get(
      `/admin/dashboard/program-revenue/${programId}`,
      { params: { months } },
    );
    return data.data ?? data;
  },

  async getProgramsRevenue(
    months = 6,
  ): Promise<ProgramsRevenueAnalyticsResponse> {
    const { data } = await api.get("/admin/dashboard/programs-revenue", {
      params: { months },
    });
    return data.data ?? data;
  },

  async getBooksRevenue(months = 6): Promise<BooksRevenueAnalyticsResponse> {
    const { data } = await api.get("/admin/dashboard/books-revenue", {
      params: { months },
    });
    return data.data ?? data;
  },
};
