import { describe, expect, it } from "vitest";
import { buildFormCheckThreadRoute } from "@/utils/formCheckRoutes";

describe("buildFormCheckThreadRoute", () => {
  it("builds a canonical deep-link with thread context and reply action", () => {
    const route = buildFormCheckThreadRoute(
      {
        userId: "user-1",
        videoId: "video-1",
        commentId: "comment-1",
        messageId: "message-1",
        threadType: "workout",
      },
      "reply",
    );

    expect(route).toContain("/form-checks?");
    expect(route).toContain("userId=user-1");
    expect(route).toContain("review=all");
    expect(route).toContain("videoId=video-1");
    expect(route).toContain("commentId=comment-1");
    expect(route).toContain("messageId=message-1");
    expect(route).toContain("threadType=workout");
    expect(route).toContain("action=reply");
  });

  it("falls back safely when userId is missing", () => {
    expect(
      buildFormCheckThreadRoute({
        userId: null,
        videoId: "video-1",
        commentId: "comment-1",
        messageId: null,
        threadType: "sheets",
      }),
    ).toBe("/form-checks");
  });

  it("omits action when not provided", () => {
    const route = buildFormCheckThreadRoute({
      userId: "user-2",
      videoId: null,
      commentId: "comment-2",
      messageId: null,
      threadType: "sheets",
    });

    expect(route).toContain("userId=user-2");
    expect(route).toContain("threadType=sheets");
    expect(route).not.toContain("action=");
  });
});
