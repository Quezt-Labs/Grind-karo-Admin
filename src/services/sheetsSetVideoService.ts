import api from "./api";

export interface AdminSheetsSetVideo {
  id: string;
  tabName: string;
  weekNumber: number;
  dayNumber: number;
  sortOrder: number;
  setNumber: number;
  exerciseName: string;
  videoUrl: string;
  createdAt: string;
  coachComment?: string | null;
  coachCommentId?: string | null;
  coachCommentUpdatedAt?: string | null;
}

export interface UpsertSheetsVideoCommentPayload {
  sheetsSetVideoId: string;
  comment: string;
}

export const sheetsSetVideoService = {
  async listForUser(userId: string): Promise<AdminSheetsSetVideo[]> {
    const { data } = await api.get(`/sheets/admin/users/${userId}/set-videos`);
    return data.data ?? data;
  },
};

export const sheetsSetVideoCommentService = {
  async upsert(payload: UpsertSheetsVideoCommentPayload) {
    const { data } = await api.post(
      "/admin/sheets-set-video-comments",
      payload,
    );
    return data.data ?? data;
  },

  async remove(commentId: string): Promise<void> {
    await api.delete(`/admin/sheets-set-video-comments/${commentId}`);
  },
};
