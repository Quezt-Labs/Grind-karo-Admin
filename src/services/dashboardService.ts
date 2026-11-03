import api from "./api";
import type { DashboardOverviewResponse } from "@/types/dashboardOverview";
import type {
  PlanRevenueAnalyticsResponse,
  ProgramRevenueAnalyticsResponse,
} from "@/types/revenueAnalytics";

export const dashboardService = {
  async getOverview(): Promise<DashboardOverviewResponse> {
    const { data } = await api.get("/admin/dashboard/overview");
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
};
