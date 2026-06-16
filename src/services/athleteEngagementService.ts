import api from "./api";
import type {
  AdminBigLiftPrUserSummary,
  BigLiftPrCheckin,
  CreateMotivationQuoteInput,
  CreateVideoLibraryItemInput,
  MotivationQuote,
  UpdateMotivationQuoteInput,
  UpdateVideoLibraryItemInput,
  VideoLibraryItem,
} from "@/types/athleteEngagement";

export const athleteEngagementService = {
  listBigLiftPrSummaries: async (): Promise<AdminBigLiftPrUserSummary[]> => {
    const { data } = await api.get("/admin/big-lift-pr");
    return data.data ?? data;
  },

  getUserBigLiftPrHistory: async (
    userId: string,
    limit = 20,
  ): Promise<BigLiftPrCheckin[]> => {
    const { data } = await api.get(`/admin/big-lift-pr/${userId}`, {
      params: { limit },
    });
    return data.data ?? data;
  },

  listQuotes: async (): Promise<MotivationQuote[]> => {
    const { data } = await api.get("/admin/motivation-quotes");
    return data.data ?? data;
  },

  createQuote: async (
    payload: CreateMotivationQuoteInput,
  ): Promise<MotivationQuote> => {
    const { data } = await api.post("/admin/motivation-quotes", payload);
    return data.data ?? data;
  },

  updateQuote: async (
    id: string,
    payload: UpdateMotivationQuoteInput,
  ): Promise<MotivationQuote> => {
    const { data } = await api.patch(`/admin/motivation-quotes/${id}`, payload);
    return data.data ?? data;
  },

  deleteQuote: async (id: string): Promise<void> => {
    await api.delete(`/admin/motivation-quotes/${id}`);
  },

  listVideos: async (): Promise<VideoLibraryItem[]> => {
    const { data } = await api.get("/admin/video-library");
    return data.data ?? data;
  },

  createVideo: async (
    payload: CreateVideoLibraryItemInput,
  ): Promise<VideoLibraryItem> => {
    const { data } = await api.post("/admin/video-library", payload);
    return data.data ?? data;
  },

  updateVideo: async (
    id: string,
    payload: UpdateVideoLibraryItemInput,
  ): Promise<VideoLibraryItem> => {
    const { data } = await api.patch(`/admin/video-library/${id}`, payload);
    return data.data ?? data;
  },

  deleteVideo: async (id: string): Promise<void> => {
    await api.delete(`/admin/video-library/${id}`);
  },
};
