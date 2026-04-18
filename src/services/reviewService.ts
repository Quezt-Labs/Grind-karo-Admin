import api from "./api";
import type { CoachingReview } from "@/types/program";

export interface ReviewFilters {
  planId?: string;
  limit?: number;
  offset?: number;
}

export const reviewService = {
  async getAll(filters?: ReviewFilters): Promise<CoachingReview[]> {
    const { data } = await api.get("/admin/coaching/reviews", {
      params: filters,
    });
    return data.data ?? data;
  },

  async remove(reviewId: string): Promise<void> {
    await api.delete(`/admin/coaching/reviews/${reviewId}`);
  },
};
