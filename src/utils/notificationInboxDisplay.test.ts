import { describe, expect, it } from "vitest";
import type { AdminNotification } from "@/types/user";
import { buildNotificationInboxModel } from "@/utils/notificationInboxDisplay";

function makeFormCheck(id: string, commentId: string): AdminNotification {
  return {
    id,
    type: "FORM_CHECK_ATHLETE_REPLY",
    title: "Form check",
    message: "Preview",
    createdAt: "2026-08-10T00:00:00.000Z",
    readAt: null,
    category: "form_check",
    priority: "critical",
    payload: {
      athleteId: "athlete-1",
      athleteName: "Rahul",
      commentId,
      preview: "Preview",
    },
  };
}

describe("buildNotificationInboxModel", () => {
  it("counts grouped form-check threads as one badge row", () => {
    const model = buildNotificationInboxModel([
      makeFormCheck("n1", "comment-1"),
      makeFormCheck("n2", "comment-1"),
      makeFormCheck("n3", "comment-1"),
    ]);

    expect(model.formCheckGroups).toHaveLength(1);
    expect(model.badgeCount).toBe(1);
  });

  it("excludes client error notifications from badge count", () => {
    const model = buildNotificationInboxModel([
      makeFormCheck("n1", "comment-1"),
      {
        id: "err-1",
        type: "CLIENT_ERROR",
        title: "Client error",
        message: "boom",
        createdAt: "2026-08-10T00:00:00.000Z",
        readAt: null,
        category: "system",
        priority: "high",
        payload: {},
      },
    ]);

    expect(model.badgeCount).toBe(1);
  });
});
