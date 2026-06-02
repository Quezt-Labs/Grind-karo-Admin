import api from "./api";

export interface UpsertVideoCommentPayload {
  exerciseLogId: string;
  setNumber: number;
  comment: string;
}

export interface VideoCommentResponse {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export const workoutVideoCommentService = {
  async upsert(
    payload: UpsertVideoCommentPayload,
  ): Promise<VideoCommentResponse> {
    const { data } = await api.post(
      "/admin/workout-set-video-comments",
      payload,
    );
    return data.data ?? data;
  },

  async remove(commentId: string): Promise<void> {
    await api.delete(`/admin/workout-set-video-comments/${commentId}`);
  },
};
