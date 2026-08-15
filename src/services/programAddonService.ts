import api from "./api";
import type {
  CreateProgramAddonPayload,
  ProgramAddon,
  UpdateProgramAddonPayload,
} from "@/types/program";

export const programAddonService = {
  async getAll(): Promise<ProgramAddon[]> {
    const { data } = await api.get("/admin/program-addons");
    return data.data ?? data;
  },

  async getById(addonId: string): Promise<ProgramAddon> {
    const { data } = await api.get(`/admin/program-addons/${addonId}`);
    return data.data ?? data;
  },

  async create(payload: CreateProgramAddonPayload): Promise<ProgramAddon> {
    const { data } = await api.post("/admin/program-addons", payload);
    return data.data ?? data;
  },

  async update(
    addonId: string,
    payload: UpdateProgramAddonPayload,
  ): Promise<ProgramAddon> {
    const { data } = await api.patch(
      `/admin/program-addons/${addonId}`,
      payload,
    );
    return data.data ?? data;
  },

  async remove(addonId: string): Promise<void> {
    await api.delete(`/admin/program-addons/${addonId}`);
  },

  async listForProgram(programId: string): Promise<
    Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      price: number;
      grantsFormCheck: boolean;
    }>
  > {
    const { data } = await api.get(`/admin/programs/${programId}/addons`);
    return (data.data ?? data) as Array<{
      id: string;
      slug: string;
      name: string;
      description: string | null;
      price: number;
      grantsFormCheck: boolean;
    }>;
  },

  async linkAddon(
    programId: string,
    addonId: string,
    priceOverride?: number | null,
  ) {
    const { data } = await api.post(`/admin/programs/${programId}/addons`, {
      addonId,
      priceOverride: priceOverride ?? undefined,
    });
    return data.data ?? data;
  },

  async unlinkAddon(programId: string, addonId: string) {
    await api.delete(`/admin/programs/${programId}/addons/${addonId}`);
  },
};
