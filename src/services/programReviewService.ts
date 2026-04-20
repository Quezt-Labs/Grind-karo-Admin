import api from "./api";
import type { ProgramReview } from "@/types/programs";

export interface ProgramReviewFilters {
  programId?: string;
  limit?: number;
  offset?: number;
}

export const programReviewService = {
  async getAll(filters?: ProgramReviewFilters): Promise<ProgramReview[]> {
    const { data } = await api.get("/admin/program-reviews", {
      params: filters,
    });
    return data.data ?? data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/admin/program-reviews/${id}`);
  },
};
