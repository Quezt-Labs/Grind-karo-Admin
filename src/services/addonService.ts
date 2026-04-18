import api from "./api";
import type {
  CoachingAddon,
  CreateCoachingAddonPayload,
  UpdateCoachingAddonPayload,
} from "@/types/program";

export const addonService = {
  async getAll(): Promise<CoachingAddon[]> {
    const { data } = await api.get("/admin/coaching/addons");
    return data.data ?? data;
  },

  async getById(addonId: string): Promise<CoachingAddon> {
    const { data } = await api.get(`/admin/coaching/addons/${addonId}`);
    return data.data ?? data;
  },

  async create(payload: CreateCoachingAddonPayload): Promise<CoachingAddon> {
    const { data } = await api.post("/admin/coaching/addons", payload);
    return data.data ?? data;
  },

  async update(
    addonId: string,
    payload: UpdateCoachingAddonPayload,
  ): Promise<CoachingAddon> {
    const { data } = await api.patch(
      `/admin/coaching/addons/${addonId}`,
      payload,
    );
    return data.data ?? data;
  },

  async remove(addonId: string, hard = false): Promise<void> {
    await api.delete(`/admin/coaching/addons/${addonId}`, {
      params: hard ? { hard: true } : undefined,
    });
  },
};
