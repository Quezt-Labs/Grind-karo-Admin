import api from "./api";
import type {
  Plan,
  CreatePlanPayload,
  UpdatePlanPayload,
  Subscription,
  SubscribePlanPayload,
} from "@/types/program";

export const planService = {
  // --- Plans ---

  async getForProgram(programId: string): Promise<Plan[]> {
    const { data } = await api.get(`/admin/programs/${programId}/plans`);
    return data.data ?? data;
  },

  async getById(planId: string): Promise<Plan> {
    const { data } = await api.get(`/plans/${planId}`);
    return data.data ?? data;
  },

  async create(payload: CreatePlanPayload): Promise<Plan> {
    const { data } = await api.post("/admin/plans", payload);
    return data.data ?? data;
  },

  async update(planId: string, payload: UpdatePlanPayload): Promise<Plan> {
    const { data } = await api.patch(`/admin/plans/${planId}`, payload);
    return data.data ?? data;
  },

  async remove(planId: string): Promise<void> {
    await api.delete(`/admin/plans/${planId}`);
  },

  // --- Subscriptions ---

  async subscribe(payload: SubscribePlanPayload): Promise<Subscription> {
    const { data } = await api.post("/plans/subscribe", payload);
    return data.data ?? data;
  },

  async getMySubscriptions(): Promise<Subscription[]> {
    const { data } = await api.get("/plans/my/subscriptions");
    return data.data ?? data;
  },

  async getMyActiveSubscription(): Promise<Subscription> {
    const { data } = await api.get("/plans/my/subscription/active");
    return data.data ?? data;
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await api.delete(`/plans/${subscriptionId}`);
  },

  // --- Admin Subscriptions ---

  async getAllSubscriptions(): Promise<Subscription[]> {
    const { data } = await api.get("/admin/plans/subscriptions");
    return data.data ?? data;
  },

  async getSubscriptionsByUser(userId: string): Promise<Subscription[]> {
    const { data } = await api.get(`/admin/plans/subscriptions/user/${userId}`);
    return data.data ?? data;
  },
};
