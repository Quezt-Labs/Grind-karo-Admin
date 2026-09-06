import { describe, expect, it } from "vitest";
import { formatAdminPhone } from "./phoneStatus";

describe("formatAdminPhone", () => {
  it("shows Missing when the athlete has no number", () => {
    expect(formatAdminPhone(null)).toEqual({
      label: "Missing",
      missing: true,
    });
    expect(formatAdminPhone("")).toEqual({
      label: "Missing",
      missing: true,
    });
  });

  it("shows the stored E.164 number when present", () => {
    expect(formatAdminPhone("+919876543210")).toEqual({
      label: "+919876543210",
      missing: false,
    });
    expect(formatAdminPhone("+14155552671")).toEqual({
      label: "+14155552671",
      missing: false,
    });
  });
});
