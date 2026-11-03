import { describe, expect, it } from "vitest";
import type { FormCheckActionQueueItem } from "@/services/formCheckActionQueueService";
import { groupFormCheckActionQueueByAthlete } from "@/utils/groupFormCheckActionQueue";

function item(
  overrides: Partial<FormCheckActionQueueItem> & { id: string },
): FormCheckActionQueueItem {
  return {
    athleteId: "athlete-a",
    athleteName: "Athlete A",
    athleteEmail: "a@example.com",
    videoReference: "Squat · Set 1",
    latestCommentPreview: "Preview",
    latestActivityAt: "2026-08-10T10:00:00.000Z",
    priority: "P2",
    state: "needs_reply",
    stateReason: null,
    threadType: "workout",
    videoId: "v1",
    commentId: "c1",
    messageId: null,
    overdueAt: null,
    unreadCount: 1,
    repliesRemaining: 1,
    replyBlocked: false,
    replyLockReason: null,
    uploadIncidentBlocking: null,
    uploadIncidentCount: null,
    uploadIncidentState: null,
    uploadIncidentHint: null,
    groupedCount: 1,
    ...overrides,
  };
}

describe("groupFormCheckActionQueueByAthlete", () => {
  it("merges threads under the same athlete", () => {
    const groups = groupFormCheckActionQueueByAthlete(
      [
        item({ id: "1", commentId: "c1" }),
        item({ id: "2", commentId: "c2" }),
        item({
          id: "3",
          athleteId: "athlete-b",
          athleteName: "Athlete B",
          athleteEmail: "b@example.com",
        }),
      ],
      "needs_reply",
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]?.items).toHaveLength(2);
  });

  it("prioritizes athletes with needs_reply threads", () => {
    const groups = groupFormCheckActionQueueByAthlete(
      [
        item({
          id: "1",
          athleteId: "quiet",
          athleteName: "Quiet",
          state: "resolved",
          latestActivityAt: "2026-08-12T10:00:00.000Z",
        }),
        item({
          id: "2",
          athleteId: "active",
          athleteName: "Active",
          latestActivityAt: "2026-08-09T10:00:00.000Z",
        }),
      ],
      "needs_reply",
    );
    expect(groups[0]?.athleteName).toBe("Active");
  });
});
