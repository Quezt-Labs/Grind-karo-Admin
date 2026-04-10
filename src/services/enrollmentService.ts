import api from "./api";
import type { Subscription } from "@/types/program";

export const enrollmentService = {
  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data } = await api.get("/admin/plans/subscriptions");
    return data.data ?? data;
  },

  async getMySubscriptions(): Promise<Subscription[]> {
    const { data } = await api.get("/plans/my/subscriptions");
    return data.data ?? data;
  },

  async getMyActiveSubscription(): Promise<Subscription | null> {
    try {
      const { data } = await api.get("/plans/my/subscription/active");
      return data.data ?? data;
    } catch {
      return null;
    }
  },
};
