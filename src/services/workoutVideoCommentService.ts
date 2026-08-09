import api from "./api";

export interface UpsertVideoCommentPayload {
  exerciseLogId: string;
  setNumber: number;
  comment: string;
}

export interface ReplyVideoCommentPayload {
  reply: string;
}

export interface VideoCommentResponse {
  id: string;
  exerciseLogId: string;
  setNumber: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormCheckCommentThreadMessage {
  id: string;
  role: string;
  message: string;
  createdAt: string | null;
}

export interface FormCheckCommentThread {
  messages: FormCheckCommentThreadMessage[];
  replyLimit: number | null;
  repliesUsed: number | null;
  repliesRemaining: number | null;
  canAthleteReply: boolean | null;
  replyLockReason: string | null;
}

function normalizeThread(payload: Record<string, unknown>): FormCheckCommentThread {
  const rawMessages =
    (payload.messages as unknown[] | undefined) ??
    (payload.thread as unknown[] | undefined) ??
    [];
  const messages = rawMessages.map((message, index) => {
    const row = message as Record<string, unknown>;
    return {
    id: (row.id as string | undefined) ?? `thread-message-${index + 1}`,
    role:
      (row.role as string | undefined) ??
      (row.sender as string | undefined) ??
      "coach",
    message:
      (row.message as string | undefined) ??
      (row.content as string | undefined) ??
      (row.reply as string | undefined) ??
      "",
      createdAt:
        (row.createdAt as string | null | undefined) ??
        (row.created_at as string | null | undefined) ??
        null,
    };
  });
  return {
    messages,
    replyLimit:
      (payload.replyLimit as number | null | undefined) ??
      (payload.reply_limit as number | null | undefined) ??
      null,
    repliesUsed:
      (payload.repliesUsed as number | null | undefined) ??
      (payload.replies_used as number | null | undefined) ??
      null,
    repliesRemaining:
      (payload.repliesRemaining as number | null | undefined) ??
      (payload.replies_remaining as number | null | undefined) ??
      null,
    canAthleteReply:
      (payload.canAthleteReply as boolean | null | undefined) ??
      (payload.can_athlete_reply as boolean | null | undefined) ??
      null,
    replyLockReason:
      (payload.replyLockReason as string | null | undefined) ??
      (payload.reply_lock_reason as string | null | undefined) ??
      null,
  };
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

  async getWorkoutThread(commentId: string): Promise<FormCheckCommentThread> {
    const { data } = await api.get(
      `/admin/workout-set-video-comments/${commentId}/thread`,
    );
    return normalizeThread((data.data ?? data) as Record<string, unknown>);
  },

  async replyWorkout(
    commentId: string,
    payload: ReplyVideoCommentPayload,
  ): Promise<VideoCommentResponse> {
    const { data } = await api.post(
      `/admin/workout-set-video-comments/${commentId}/replies`,
      payload,
    );
    return data.data ?? data;
  },

  async getSheetsThread(commentId: string): Promise<FormCheckCommentThread> {
    const { data } = await api.get(
      `/admin/sheets-set-video-comments/${commentId}/thread`,
    );
    return normalizeThread((data.data ?? data) as Record<string, unknown>);
  },

  async replySheets(
    commentId: string,
    payload: ReplyVideoCommentPayload,
  ): Promise<VideoCommentResponse> {
    const { data } = await api.post(
      `/admin/sheets-set-video-comments/${commentId}/replies`,
      payload,
    );
    return data.data ?? data;
  },

  async replyLegacy(
    commentId: string,
    payload: { comment: string },
  ): Promise<VideoCommentResponse> {
    const { data } = await api.post(
      `/form-check/comments/${commentId}/reply`,
      payload,
    );
    return data.data ?? data;
  },
};
