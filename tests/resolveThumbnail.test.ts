import { describe, it, expect } from "vitest";
import { resolveItemThumbnail } from "../src/pages/admin/Fotosintesis/utils/resolveThumbnail";

const BATCH = {
  32: { url: "/api/serve-drive-image?fileId=BATCH32" },
  45: { url: "/api/serve-drive-image?fileId=BATCH45" },
};

describe("resolveItemThumbnail", () => {
  it("prefers the item's own Drive fotoUrl, routed through the proxy", () => {
    const url = resolveItemThumbnail(
      "https://drive.google.com/file/d/FOTO_ID/view",
      "32",
      BATCH,
    );
    expect(url).toBe("/api/serve-drive-image?fileId=FOTO_ID");
  });

  it("passes a non-Drive fotoUrl through unchanged", () => {
    const url = resolveItemThumbnail(
      "https://cdn.example.com/x.jpg",
      "32",
      BATCH,
    );
    expect(url).toBe("https://cdn.example.com/x.jpg");
  });

  it("falls back to the batch thumbnail when fotoUrl is empty", () => {
    expect(resolveItemThumbnail(undefined, "32", BATCH)).toBe(BATCH[32].url);
    expect(resolveItemThumbnail("", "45", BATCH)).toBe(BATCH[45].url);
  });

  it("returns undefined when neither source has an image", () => {
    expect(resolveItemThumbnail(undefined, "999", BATCH)).toBeUndefined();
    expect(resolveItemThumbnail(undefined, "32", undefined)).toBeUndefined();
  });

  it("ignores non-numeric item ids for the batch lookup", () => {
    expect(resolveItemThumbnail(undefined, "B-008-1", BATCH)).toBeUndefined();
    expect(resolveItemThumbnail(undefined, "abc", BATCH)).toBeUndefined();
  });
});
