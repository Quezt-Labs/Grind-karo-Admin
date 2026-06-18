import api from "./api";
import type {
  ClientErrorReport,
  ClientErrorsQuery,
  ClientErrorsResponse,
} from "@/types/clientError";

export const clientErrorService = {
  async getAll(params?: ClientErrorsQuery): Promise<ClientErrorsResponse> {
    const { data } = await api.get("/admin/client-errors", { params });
    return data.data ?? data;
  },

  async getById(id: string): Promise<ClientErrorReport> {
    const { data } = await api.get(`/admin/client-errors/${id}`);
    return data.data ?? data;
  },

  async markRead(id: string): Promise<ClientErrorReport> {
    const { data } = await api.post(`/admin/client-errors/${id}/read`);
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/client-errors/${id}`);
  },

  async removeMany(ids: string[]): Promise<number> {
    const { data } = await api.post("/admin/client-errors/bulk-delete", {
      ids,
    });
    const payload = data.data ?? data;
    return payload.deletedCount ?? 0;
  },
};
