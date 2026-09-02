import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import {
  formCheckKeys,
  patchFormCheckVideoComments,
} from "@/hooks/formCheckQueryKeys";
import type {
  FormCheckInboxItem,
  FormCheckInboxResponse,
} from "@/services/formCheckInboxService";

function item(
  overrides: Partial<FormCheckInboxItem> &
    Pick<FormCheckInboxItem, "id" | "exerciseLogId" | "setNumber">,
): FormCheckInboxItem {
  return {
    source: "program",
    userId: "u1",
    userName: "A",
    userEmail: "a@x.com",
    tabName: null,
    weekNumber: 1,
    dayNumber: 1,
    videoUrl: "https://example.com/v.mp4",
    createdAt: "2026-09-01T00:00:00.000Z",
    coachComment: null,
    coachCommentId: null,
    reviewed: false,
    exerciseName: "Squat",
    ...overrides,
  };
}

function inbox(
  items: FormCheckInboxItem[],
  extra?: Partial<FormCheckInboxResponse>,
): FormCheckInboxResponse {
  return {
    total: items.length,
    pendingCount: items.filter((i) => !i.coachComment).length,
    limit: 100,
    offset: 0,
    items,
    ...extra,
  };
}

describe("patchFormCheckVideoComments", () => {
  it("removes the commented video from pending inbox caches", () => {
    const queryClient = new QueryClient();
    const keep = item({
      id: "keep",
      exerciseLogId: "log-keep",
      setNumber: 1,
    });
    const gone = item({
      id: "gone",
      exerciseLogId: "log-gone",
      setNumber: 2,
    });

    queryClient.setQueryData(
      formCheckKeys.videos("pending", "u1"),
      inbox([keep, gone]),
    );
    queryClient.setQueryData(
      formCheckKeys.athleteDetail("pending", "u1"),
      inbox([keep, gone]),
    );

    patchFormCheckVideoComments(queryClient, [
      {
        exerciseLogId: "log-gone",
        setNumber: 2,
        comment: "Nice depth",
      },
    ]);

    expect(
      queryClient
        .getQueryData<FormCheckInboxResponse>(
          formCheckKeys.videos("pending", "u1"),
        )
        ?.items.map((i) => i.id),
    ).toEqual(["keep"]);
    expect(
      queryClient
        .getQueryData<FormCheckInboxResponse>(
          formCheckKeys.athleteDetail("pending", "u1"),
        )
        ?.items.map((i) => i.id),
    ).toEqual(["keep"]);
  });

  it("keeps the commented video on all/reviewed caches with feedback", () => {
    const queryClient = new QueryClient();
    const video = item({
      id: "v1",
      exerciseLogId: "log-1",
      setNumber: 1,
    });
    queryClient.setQueryData(formCheckKeys.videos("all", "u1"), inbox([video]));

    patchFormCheckVideoComments(queryClient, [
      {
        exerciseLogId: "log-1",
        setNumber: 1,
        comment: "Chest up",
        coachCommentId: "c1",
      },
    ]);

    const next = queryClient.getQueryData<FormCheckInboxResponse>(
      formCheckKeys.videos("all", "u1"),
    );
    expect(next?.items).toHaveLength(1);
    expect(next?.items[0]?.coachComment).toBe("Chest up");
    expect(next?.items[0]?.reviewed).toBe(true);
  });
});
