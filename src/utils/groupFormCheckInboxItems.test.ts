import { describe, expect, it } from "vitest";
import type { FormCheckInboxItem } from "@/services/formCheckInboxService";
import {
  dedupeFormCheckInboxItems,
  formCheckExerciseGroupKey,
  groupFormCheckInboxItems,
} from "@/utils/groupFormCheckInboxItems";

function programItem(
  overrides: Partial<FormCheckInboxItem> & Pick<FormCheckInboxItem, "id">,
): FormCheckInboxItem {
  return {
    source: "program",
    userId: "user-1",
    userName: "Athlete",
    userEmail: "a@test.com",
    tabName: null,
    weekNumber: 1,
    dayNumber: 1,
    setNumber: 1,
    exerciseName: "Squat",
    videoUrl: "https://cdn.example/v1.mp4",
    createdAt: "2026-07-01T10:00:00.000Z",
    coachComment: null,
    coachCommentId: null,
    reviewed: false,
    programId: "prog-1",
    programExerciseId: "pe-1",
    exerciseLogId: "log-a",
    ...overrides,
  };
}

describe("dedupeFormCheckInboxItems", () => {
  it("keeps the latest row when the same exercise set was re-logged", () => {
    const items = [
      programItem({
        id: "log-a:1",
        exerciseLogId: "log-a",
        createdAt: "2026-07-01T10:00:00.000Z",
      }),
      programItem({
        id: "log-b:1",
        exerciseLogId: "log-b",
        createdAt: "2026-07-02T10:00:00.000Z",
      }),
    ];

    const deduped = dedupeFormCheckInboxItems(items);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.exerciseLogId).toBe("log-b");
  });
});

describe("groupFormCheckInboxItems", () => {
  it("groups re-logged sets under one exercise card", () => {
    const items = [
      programItem({
        id: "log-a:1",
        exerciseLogId: "log-a",
        setNumber: 1,
      }),
      programItem({
        id: "log-b:1",
        exerciseLogId: "log-b",
        setNumber: 1,
        createdAt: "2026-07-02T10:00:00.000Z",
      }),
      programItem({
        id: "log-b:2",
        exerciseLogId: "log-b",
        setNumber: 2,
        videoUrl: "https://cdn.example/v2.mp4",
        createdAt: "2026-07-02T10:05:00.000Z",
      }),
    ];

    const groups = groupFormCheckInboxItems(items);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.videos).toHaveLength(2);
    expect(groups[0]?.videos.map((v) => v.setNumber)).toEqual([1, 2]);
  });

  it("uses program day fallback when programExerciseId is missing", () => {
    const a = programItem({
      id: "log-a:1",
      programExerciseId: undefined,
      exerciseLogId: "log-a",
    });
    const b = programItem({
      id: "log-b:1",
      programExerciseId: undefined,
      exerciseLogId: "log-b",
      createdAt: "2026-07-02T10:00:00.000Z",
    });

    expect(formCheckExerciseGroupKey(a)).toBe(formCheckExerciseGroupKey(b));

    const groups = groupFormCheckInboxItems([a, b]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.videos).toHaveLength(1);
  });
});
