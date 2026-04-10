import api from "./api";
import type {
  Program,
  CreateProgramPayload,
  UpdateProgramPayload,
} from "@/types/program";

export const programService = {
  async getAll(includeInactive = true): Promise<Program[]> {
    const { data } = await api.get("/programs", {
      params: { includeInactive },
    });
    return data.data ?? data;
  },

  async getById(identifier: string): Promise<Program> {
    const { data } = await api.get(`/programs/${identifier}`);
    return data.data ?? data;
  },

  async getByLevel(level: string): Promise<Program[]> {
    const { data } = await api.get(`/programs/level/${level}`);
    return data.data ?? data;
  },

  async getByCategory(category: string): Promise<Program[]> {
    const { data } = await api.get(`/programs/category/${category}`);
    return data.data ?? data;
  },

  async create(payload: CreateProgramPayload): Promise<Program> {
    const { data } = await api.post("/admin/programs", payload);
    return data.data ?? data;
  },

  async update(id: string, payload: UpdateProgramPayload): Promise<Program> {
    const { data } = await api.patch(`/admin/programs/${id}`, payload);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/programs/${id}`);
  },
};
