import { describe, expect, it } from "vitest";
import { formCheckQueueRefetchInterval } from "@/utils/formCheckQueue";

describe("formCheckQueueRefetchInterval", () => {
  it("returns poll interval when visible and not paused", () => {
    expect(
      formCheckQueueRefetchInterval({
        pollMs: 20_000,
        visibilityState: "visible",
        paused: false,
      }),
    ).toBe(20_000);
  });

  it("pauses polling while the reply composer is active", () => {
    expect(
      formCheckQueueRefetchInterval({
        pollMs: 20_000,
        visibilityState: "visible",
        paused: true,
      }),
    ).toBe(false);
  });

  it("pauses polling when tab is not visible", () => {
    expect(
      formCheckQueueRefetchInterval({
        pollMs: 20_000,
        visibilityState: "hidden",
        paused: false,
      }),
    ).toBe(false);
  });
});
