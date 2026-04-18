import api from "./api";
import type { CoachingSubscription } from "@/types/program";

export interface SubscriptionFilters {
  status?: string;
  userId?: string;
  planId?: string;
}

export const enrollmentService = {
  async getAll(filters?: SubscriptionFilters): Promise<CoachingSubscription[]> {
    const { data } = await api.get("/admin/coaching/subscriptions", {
      params: filters,
    });
    return data.data ?? data;
  },

  async getById(id: string): Promise<CoachingSubscription> {
    const { data } = await api.get(`/admin/coaching/subscriptions/${id}`);
    return data.data ?? data;
  },

  async cancel(id: string): Promise<CoachingSubscription> {
    const { data } = await api.post(
      `/admin/coaching/subscriptions/${id}/cancel`,
    );
    return data.data ?? data;
  },
};
