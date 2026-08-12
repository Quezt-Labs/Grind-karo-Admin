import { describe, expect, it } from "vitest";
import { deriveFormCheckThreadAccessState } from "@/utils/formCheckThreadAccessState";

describe("deriveFormCheckThreadAccessState", () => {
  it("returns neutral state when userId is present but athlete is missing without forbidden signal", () => {
    const state = deriveFormCheckThreadAccessState({
      hasCommentId: false,
      hasVideoId: false,
      hasThreadType: false,
      resolving: false,
      resolutionStatus: null,
    });

    expect(state.tone).toBe("neutral");
    expect(state.message).toMatch(/not in the current filter or list/i);
  });

  it("returns deny state only for explicit forbidden signal", () => {
    const state = deriveFormCheckThreadAccessState({
      hasCommentId: true,
      hasVideoId: false,
      hasThreadType: true,
      resolving: false,
      resolutionStatus: "forbidden",
    });

    expect(state.tone).toBe("deny");
    expect(state.message).toMatch(/don’t have access/i);
  });

  it("returns neutral fallback for incomplete thread context", () => {
    const state = deriveFormCheckThreadAccessState({
      hasCommentId: false,
      hasVideoId: false,
      hasThreadType: true,
      resolving: false,
      resolutionStatus: null,
    });

    expect(state.tone).toBe("neutral");
    expect(state.message).toMatch(/incomplete thread context/i);
  });
});
