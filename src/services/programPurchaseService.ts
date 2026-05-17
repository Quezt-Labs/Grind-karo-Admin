import api from "./api";
import type { ProgramPurchase } from "@/types/programs";

export interface ProgramPurchaseFilters {
  status?: string;
  userId?: string;
  programId?: string;
}

export const programPurchaseService = {
  async getAll(filters?: ProgramPurchaseFilters): Promise<ProgramPurchase[]> {
    const { data } = await api.get("/admin/program-purchases", {
      params: filters,
    });
    return data.data ?? data;
  },

  async getById(id: string): Promise<ProgramPurchase> {
    const { data } = await api.get(`/admin/program-purchases/${id}`);
    return data.data ?? data;
  },

  async refund(id: string): Promise<ProgramPurchase> {
    const { data } = await api.post(`/admin/program-purchases/${id}/refund`);
    return data.data ?? data;
  },

  async patchSpreadsheetId(
    id: string,
    spreadsheetId: string | null,
  ): Promise<ProgramPurchase> {
    const { data } = await api.patch(
      `/admin/program-purchases/${id}/spreadsheet-id`,
      { spreadsheetId },
    );
    return data.data ?? data;
  },
};
