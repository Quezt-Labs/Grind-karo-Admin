import api from "./api";
import type { DashboardOverviewResponse } from "@/types/dashboardOverview";

export const dashboardService = {
  async getOverview(): Promise<DashboardOverviewResponse> {
    const { data } = await api.get("/admin/dashboard/overview");
    return data.data ?? data;
  },
};
