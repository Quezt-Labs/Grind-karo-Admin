import { describe, expect, it } from "vitest";
import { isHeicLike, looksLikeImageUpload } from "./compressImage";

describe("looksLikeImageUpload", () => {
  it("detects typed JPEG", () => {
    expect(
      looksLikeImageUpload(new File(["x"], "a.jpg", { type: "image/jpeg" })),
    ).toBe(true);
  });

  it("detects iOS gallery picks with empty MIME", () => {
    expect(
      looksLikeImageUpload(new File(["x"], "IMG_1234.HEIC", { type: "" })),
    ).toBe(true);
  });

  it("excludes SVG uploads", () => {
    expect(
      looksLikeImageUpload(
        new File(["x"], "icon.svg", { type: "image/svg+xml" }),
      ),
    ).toBe(false);
  });
});

describe("isHeicLike", () => {
  it("detects HEIC by type and extension", () => {
    expect(isHeicLike(new File(["x"], "x.heic", { type: "image/heic" }))).toBe(
      true,
    );
    expect(isHeicLike(new File(["x"], "IMG_1.HEIC", { type: "" }))).toBe(true);
  });
});
