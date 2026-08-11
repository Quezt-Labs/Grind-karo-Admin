import { describe, expect, it } from "vitest";
import {
  incidentAgeSeconds,
  isUploadIncidentBusyError,
  nextUploadIncidentPollInterval,
  uploadIncidentRefetchInterval,
} from "@/utils/uploadIncidentMonitor";
import type { UploadIncidentItem } from "@/services/uploadIncidentService";

function makeIncident(overrides: Partial<UploadIncidentItem> = {}): UploadIncidentItem {
  return {
    id: "incident-1",
    athleteId: "athlete-1",
    athleteName: "Rahul",
    athleteEmail: "rahul@example.com",
    fileName: "set-1.mp4",
    sizeBytes: 1024,
    state: "failed",
    severity: "hard_failed",
    retryable: false,
    attempts: 2,
    pipelineStage: "associate",
    failureReason: "Association failed",
    correlationId: "corr-1",
    uploadSessionId: "session-1",
    firstFailedAt: new Date(Date.now() - 120_000).toISOString(),
    lastRetryAt: null,
    nextRetryAt: null,
    stuckDurationSeconds: null,
    lastCheckpointAt: new Date(Date.now() - 60_000).toISOString(),
    latestActivityAt: new Date(Date.now() - 30_000).toISOString(),
    videoId: "video-1",
    commentId: "comment-1",
    messageId: "message-1",
    threadType: "workout",
    queueBlocked: null,
    queueHint: null,
    groupedCount: 1,
    ...overrides,
  };
}

describe("upload incident polling helpers", () => {
  it("backs off poll interval and caps it", () => {
    expect(nextUploadIncidentPollInterval(20_000, 0)).toBe(20_000);
    expect(nextUploadIncidentPollInterval(20_000, 1)).toBe(30_000);
    expect(nextUploadIncidentPollInterval(20_000, 4)).toBe(101_250);
    expect(nextUploadIncidentPollInterval(20_000, 6)).toBe(120_000);
  });

  it("gates polling on visibility", () => {
    expect(uploadIncidentRefetchInterval(20_000, "visible")).toBe(20_000);
    expect(uploadIncidentRefetchInterval(20_000, "hidden")).toBe(false);
    expect(uploadIncidentRefetchInterval(20_000, null)).toBe(false);
  });

  it("detects busy error contract from generic objects", () => {
    expect(isUploadIncidentBusyError({ busy: true })).toBe(true);
    expect(isUploadIncidentBusyError({ status: 429 })).toBe(true);
    expect(isUploadIncidentBusyError({ status: 503 })).toBe(true);
    expect(isUploadIncidentBusyError({ status: 404 })).toBe(false);
  });

  it("derives incident age from stuckDuration and timestamps", () => {
    expect(incidentAgeSeconds(makeIncident({ stuckDurationSeconds: 90 }))).toBe(90);
    const derived = incidentAgeSeconds(makeIncident({ stuckDurationSeconds: null }));
    expect(typeof derived).toBe("number");
    expect((derived ?? 0) > 0).toBe(true);
  });
});
