import api from "./api";
import type {
  Review,
  CreateReviewPayload,
  ReviewsResponse,
} from "@/types/program";

export const reviewService = {
  async create(payload: CreateReviewPayload): Promise<Review> {
    const { data } = await api.post("/reviews", payload);
    return data.data ?? data;
  },

  async getForProgram(programId: string): Promise<ReviewsResponse> {
    const { data } = await api.get(`/reviews/program/${programId}`);
    return data.data ?? data;
  },
};
