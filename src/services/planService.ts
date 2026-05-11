import api from "./api";
import type {
  CoachingPlan,
  CreateCoachingPlanPayload,
  UpdateCoachingPlanPayload,
  PlanAddonLink,
  LinkAddonPayload,
  UpdateAddonLinkPayload,
} from "@/types/program";
import type { ListPlanUsersResponse, PlanUserStatusFilter } from "@/types/user";

export const planService = {
  async getAll(): Promise<CoachingPlan[]> {
    const { data } = await api.get("/admin/coaching/plans");
    return data.data ?? data;
  },

  async getById(planId: string): Promise<CoachingPlan> {
    const { data } = await api.get(`/admin/coaching/plans/${planId}`);
    return data.data ?? data;
  },

  async create(payload: CreateCoachingPlanPayload): Promise<CoachingPlan> {
    const { data } = await api.post("/admin/coaching/plans", payload);
    return data.data ?? data;
  },

  async update(
    planId: string,
    payload: UpdateCoachingPlanPayload,
  ): Promise<CoachingPlan> {
    const { data } = await api.patch(
      `/admin/coaching/plans/${planId}`,
      payload,
    );
    return data.data ?? data;
  },

  async remove(planId: string, hard = false): Promise<void> {
    await api.delete(`/admin/coaching/plans/${planId}`, {
      params: hard ? { hard: true } : undefined,
    });
  },

  // --- Plan ↔ Add-on links ---

  async linkAddon(
    planId: string,
    payload: LinkAddonPayload,
  ): Promise<PlanAddonLink> {
    const { data } = await api.post(
      `/admin/coaching/plans/${planId}/addons`,
      payload,
    );
    return data.data ?? data;
  },

  async updateAddonLink(
    planId: string,
    addonId: string,
    payload: UpdateAddonLinkPayload,
  ): Promise<PlanAddonLink> {
    const { data } = await api.patch(
      `/admin/coaching/plans/${planId}/addons/${addonId}`,
      payload,
    );
    return data.data ?? data;
  },

  async unlinkAddon(planId: string, addonId: string): Promise<void> {
    await api.delete(`/admin/coaching/plans/${planId}/addons/${addonId}`);
  },

  // --- Plan subscribers ---

  async getUsersByPlan(
    planId: string,
    params?: {
      status?: PlanUserStatusFilter;
      limit?: number;
      offset?: number;
    },
  ): Promise<ListPlanUsersResponse> {
    const { data } = await api.get(`/admin/users/by-plan/${planId}`, {
      params,
    });
    return data.data ?? data;
  },
};
