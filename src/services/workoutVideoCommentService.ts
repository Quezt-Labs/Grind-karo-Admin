import api from "./api";
import axios from "axios";

export interface UpsertVideoCommentPayload {
  exerciseLogId: string;
  setNumber: number;
  comment: string;
}

export interface ReplyVideoCommentPayload {
  reply: string;
}

export type FormCheckThreadType = "workout" | "sheets";

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
  videoUrl: string | null;
}

export interface FormCheckThreadVideoContext {
  videoUrl: string | null;
}

export type FormCheckThreadContextStatus =
  | "resolved"
  | "forbidden"
  | "invalid_context"
  | "unavailable";

export interface FormCheckThreadContextResolution {
  status: FormCheckThreadContextStatus;
  threadType: FormCheckThreadType;
  userId: string | null;
  videoId: string | null;
  videoUrl: string | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return null;
}

function pickUrlString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("/") ||
      trimmed.startsWith("blob:")
    ) {
      return trimmed;
    }
  }
  return null;
}

function extractVideoUrl(payload: Record<string, unknown>): string | null {
  const video = asRecord(payload.video);
  const workoutSetVideo = asRecord(payload.workoutSetVideo);
  const sheetsSetVideo = asRecord(payload.sheetsSetVideo);
  const comment = asRecord(payload.comment);
  const target = asRecord(payload.target);

  return pickUrlString(
    payload.videoUrl,
    payload.video_url,
    payload.mediaUrl,
    payload.media_url,
    payload.uploadUrl,
    payload.upload_url,
    payload.fileUrl,
    payload.file_url,
    payload.url,
    video?.url,
    video?.videoUrl,
    video?.video_url,
    video?.mediaUrl,
    video?.media_url,
    video?.uploadUrl,
    workoutSetVideo?.videoUrl,
    workoutSetVideo?.video_url,
    workoutSetVideo?.uploadUrl,
    workoutSetVideo?.upload_url,
    workoutSetVideo?.mediaUrl,
    workoutSetVideo?.media_url,
    sheetsSetVideo?.videoUrl,
    sheetsSetVideo?.video_url,
    sheetsSetVideo?.uploadUrl,
    sheetsSetVideo?.upload_url,
    sheetsSetVideo?.mediaUrl,
    sheetsSetVideo?.media_url,
    comment?.videoUrl,
    comment?.video_url,
    comment?.uploadUrl,
    comment?.upload_url,
    target?.videoUrl,
    target?.video_url,
  );
}

function extractThreadContext(payload: Record<string, unknown>): {
  userId: string | null;
  videoId: string | null;
  videoUrl: string | null;
} {
  const athlete = asRecord(payload.athlete);
  const user = asRecord(payload.user);
  const target = asRecord(payload.target);
  const comment = asRecord(payload.comment);
  const deepLink =
    asRecord(payload.deepLink) ??
    asRecord(payload.deep_link) ??
    asRecord(payload.link) ??
    asRecord(payload.deeplink);

  return {
    userId: pickString(
      payload.athleteId,
      payload.athlete_id,
      athlete?.id,
      target?.athleteId,
      target?.athlete_id,
      deepLink?.athleteId,
      deepLink?.athlete_id,
      deepLink?.userId,
      deepLink?.user_id,
      payload.targetUserId,
      payload.target_user_id,
      payload.userId,
      payload.user_id,
      user?.id,
      comment?.athleteId,
      comment?.athlete_id,
      comment?.userId,
      comment?.user_id,
    ),
    videoId: pickString(
      payload.videoId,
      payload.video_id,
      payload.workoutSetVideoId,
      payload.workout_set_video_id,
      payload.sheetsSetVideoId,
      payload.sheets_set_video_id,
      deepLink?.videoId,
      deepLink?.video_id,
      target?.videoId,
      target?.video_id,
      comment?.videoId,
      comment?.video_id,
    ),
    videoUrl: extractVideoUrl(payload),
  };
}

function contextProbeEndpoints(
  threadType: FormCheckThreadType,
  commentId: string,
): string[] {
  if (threadType === "sheets") {
    return [
      `/admin/sheets-set-video-comments/${commentId}`,
      `/admin/sheets-set-video-comments/${commentId}/context`,
      `/admin/sheets-set-video-comments/${commentId}/thread`,
      `/admin/form-check/comments/${commentId}`,
    ];
  }
  return [
    `/admin/workout-set-video-comments/${commentId}`,
    `/admin/workout-set-video-comments/${commentId}/context`,
    `/admin/workout-set-video-comments/${commentId}/thread`,
    `/admin/form-check/comments/${commentId}`,
  ];
}

type ThreadProbeFlags = {
  forbidden: boolean;
  invalidContext: boolean;
  unavailable: boolean;
};

function mergeProbeFlags(left: ThreadProbeFlags, right: ThreadProbeFlags): ThreadProbeFlags {
  return {
    forbidden: left.forbidden || right.forbidden,
    invalidContext: left.invalidContext || right.invalidContext,
    unavailable: left.unavailable || right.unavailable,
  };
}

function statusFromProbeFlags(flags: ThreadProbeFlags): FormCheckThreadContextStatus {
  if (flags.forbidden) return "forbidden";
  if (flags.invalidContext) return "invalid_context";
  if (flags.unavailable) return "unavailable";
  return "unavailable";
}

async function probeThreadContext(
  threadType: FormCheckThreadType,
  commentId: string,
): Promise<{
  context: { userId: string | null; videoId: string | null; videoUrl: string | null } | null;
  flags: ThreadProbeFlags;
}> {
  const flags: ThreadProbeFlags = {
    forbidden: false,
    invalidContext: false,
    unavailable: false,
  };

  for (const endpoint of contextProbeEndpoints(threadType, commentId)) {
    const response = await api.get(endpoint, {
      validateStatus: (status) =>
        (status >= 200 && status < 300) ||
        status === 400 ||
        status === 403 ||
        status === 404 ||
        status === 405 ||
        status === 422,
    });
    if (response.status >= 200 && response.status < 300) {
      const payload = asRecord(response.data?.data ?? response.data);
      if (!payload) continue;
      const context = extractThreadContext(payload);
      if (context.userId || context.videoId || context.videoUrl) {
        return { context, flags };
      }
      continue;
    }
    if (response.status === 403) flags.forbidden = true;
    else if (response.status === 405) flags.unavailable = true;
    else if (
      response.status === 400 ||
      response.status === 404 ||
      response.status === 422
    ) {
      flags.invalidContext = true;
    }
  }

  return { context: null, flags };
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
    videoUrl: extractVideoUrl(payload),
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

  async getThreadVideoContext(
    threadType: FormCheckThreadType,
    commentId: string,
  ): Promise<FormCheckThreadVideoContext> {
    const resolution = await this.resolveThreadContext(threadType, commentId);
    if (resolution.videoUrl) {
      return { videoUrl: resolution.videoUrl };
    }
    return { videoUrl: null };
  },

  async resolveThreadContext(
    threadType: FormCheckThreadType,
    commentId: string,
  ): Promise<FormCheckThreadContextResolution> {
    const primary = await probeThreadContext(threadType, commentId);
    if (primary.context) {
      return {
        status: "resolved",
        threadType,
        userId: primary.context.userId,
        videoId: primary.context.videoId,
        videoUrl: primary.context.videoUrl,
      };
    }

    const alternateType: FormCheckThreadType =
      threadType === "sheets" ? "workout" : "sheets";
    const alternate = await probeThreadContext(alternateType, commentId);
    if (alternate.context) {
      return {
        status: "resolved",
        threadType: alternateType,
        userId: alternate.context.userId,
        videoId: alternate.context.videoId,
        videoUrl: alternate.context.videoUrl,
      };
    }

    const flags = mergeProbeFlags(primary.flags, alternate.flags);
    return {
      status: statusFromProbeFlags(flags),
      threadType,
      userId: null,
      videoId: null,
      videoUrl: null,
    };
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

  async replyThread(
    threadType: FormCheckThreadType,
    commentId: string,
    payload: ReplyVideoCommentPayload,
  ): Promise<VideoCommentResponse> {
    const sendReply =
      threadType === "sheets"
        ? this.replySheets.bind(this)
        : this.replyWorkout.bind(this);
    try {
      return await sendReply(commentId, payload);
    } catch (error) {
      if (
        axios.isAxiosError(error) &&
        [400, 403, 404, 405, 422].includes(error.response?.status ?? 0)
      ) {
        const resolved = await this.resolveThreadContext(threadType, commentId);
        if (resolved.status === "resolved" && resolved.threadType !== threadType) {
          try {
            return resolved.threadType === "sheets"
              ? await this.replySheets(commentId, payload)
              : await this.replyWorkout(commentId, payload);
          } catch (retryError) {
            if (
              axios.isAxiosError(retryError) &&
              [403, 404, 405].includes(retryError.response?.status ?? 0)
            ) {
              return this.replyLegacy(commentId, { comment: payload.reply });
            }
            throw retryError;
          }
        }
        // Fall back to the legacy endpoint during rollout/mixed deployments.
        if ([403, 404, 405].includes(error.response?.status ?? 0)) {
          return this.replyLegacy(commentId, { comment: payload.reply });
        }
      }
      throw error;
    }
  },
};
