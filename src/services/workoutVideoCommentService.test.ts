import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import api from "./api";
import { workoutVideoCommentService } from "./workoutVideoCommentService";

vi.mock("./api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: Mock;
  post: Mock;
};

describe("workoutVideoCommentService thread context resolution", () => {
  beforeEach(() => {
    mockedApi.get.mockReset();
    mockedApi.post.mockReset();
  });

  it("prefers athleteId/deep-link user context over generic userId", async () => {
    mockedApi.get.mockResolvedValueOnce({
      status: 200,
      data: {
        data: {
          userId: "coach-user-1",
          athleteId: "athlete-user-1",
          deepLink: { userId: "athlete-user-2", videoId: "video-2" },
          videoId: "video-1",
        },
      },
    });

    const resolved = await workoutVideoCommentService.resolveThreadContext(
      "workout",
      "comment-1",
    );

    expect(resolved.status).toBe("resolved");
    expect(resolved.userId).toBe("athlete-user-1");
    expect(resolved.videoId).toBe("video-1");
  });

  it("retries reply on alternate thread source when hinted threadType is wrong", async () => {
    mockedApi.post
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 404 },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            id: "reply-1",
            exerciseLogId: "log-1",
            setNumber: 1,
            comment: "ok",
            createdAt: "2026-08-12T00:00:00.000Z",
            updatedAt: "2026-08-12T00:00:00.000Z",
          },
        },
      });

    mockedApi.get.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/admin/sheets-set-video-comments/")) {
        return {
          status: 200,
          data: { data: { athleteId: "athlete-1", videoId: "video-1" } },
        };
      }
      return { status: 404, data: {} };
    });

    await workoutVideoCommentService.replyThread("workout", "comment-1", {
      reply: "ok",
    });

    expect(mockedApi.post).toHaveBeenNthCalledWith(
      1,
      "/admin/workout-set-video-comments/comment-1/replies",
      { reply: "ok" },
    );
    expect(mockedApi.post).toHaveBeenNthCalledWith(
      2,
      "/admin/sheets-set-video-comments/comment-1/replies",
      { reply: "ok" },
    );
  });
});
