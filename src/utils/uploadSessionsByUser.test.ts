import { describe, expect, it } from "vitest";
import type { AdminUploadSessionItem } from "@/services/uploadSessionsService";
import { groupUploadSessionsByUser } from "./uploadSessionsByUser";

function session(
  overrides: Partial<AdminUploadSessionItem> & { uploadSessionId: string },
): AdminUploadSessionItem {
  const now = new Date().toISOString();
  return {
    userId: "user-1",
    purpose: "form_check",
    filename: "a.mp4",
    contentType: "video/mp4",
    totalBytes: 1,
    state: "FAILED",
    correlationId: "corr",
    uploadedPartCount: 0,
    createdAt: now,
    updatedAt: now,
    userName: "Riya Sharma",
    userEmail: "riya@example.com",
    ...overrides,
  };
}

describe("groupUploadSessionsByUser", () => {
  it("aggregates state and failure code counts per athlete", () => {
    const groups = groupUploadSessionsByUser([
      session({
        uploadSessionId: "1",
        state: "FAILED",
        failureCode: "STALE_MULTIPART_ABORTED",
      }),
      session({
        uploadSessionId: "2",
        state: "COMPLETED",
        failureCode: null,
      }),
      session({
        uploadSessionId: "3",
        state: "FAILED",
        failureCode: "STALE_MULTIPART_ABORTED",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.byState).toEqual({ FAILED: 2, COMPLETED: 1 });
    expect(groups[0]?.failuresByCode).toEqual({
      STALE_MULTIPART_ABORTED: 2,
    });
  });
});
