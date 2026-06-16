import api from "./api";
import type {
  AdminBigLiftPrUserSummary,
  Announcement,
  BigLiftPrCheckin,
  CreateAnnouncementInput,
  CreateVideoLibraryItemInput,
  UpdateAnnouncementInput,
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

  listAnnouncements: async (): Promise<Announcement[]> => {
    const { data } = await api.get("/admin/announcements");
    return data.data ?? data;
  },

  createAnnouncement: async (
    payload: CreateAnnouncementInput,
  ): Promise<Announcement> => {
    const { data } = await api.post("/admin/announcements", payload);
    return data.data ?? data;
  },

  updateAnnouncement: async (
    id: string,
    payload: UpdateAnnouncementInput,
  ): Promise<Announcement> => {
    const { data } = await api.patch(`/admin/announcements/${id}`, payload);
    return data.data ?? data;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    await api.delete(`/admin/announcements/${id}`);
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
