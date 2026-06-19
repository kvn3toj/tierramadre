import { describe, it, expect, vi, afterEach } from "vitest";
import {
  uploadVentaDocument,
  ventasSubPath,
  driveDocViewUrl,
} from "../src/pages/admin/Fotosintesis/utils/uploadItemMedia";

function makeFile(name = "kardex.pdf") {
  return new File([new Uint8Array([1, 2, 3])], name, {
    type: "application/pdf",
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("uploadVentaDocument", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the first uploaded URL on success", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, urls: ["https://drive/doc"] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const url = await uploadVentaDocument(makeFile());
    expect(url).toBe("https://drive/doc");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/media-upload",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("defaults the subPath to ventas/YYYY/MM (zero-padded)", async () => {
    let body: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        body = init.body as FormData;
        return jsonResponse({ success: true, urls: ["u"] });
      }),
    );
    await uploadVentaDocument(makeFile());
    expect(String(body?.get("subPath"))).toMatch(/^ventas\/\d{4}\/\d{2}$/);
  });

  it("honors an explicit subPath override", async () => {
    let body: FormData | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: RequestInit) => {
        body = init.body as FormData;
        return jsonResponse({ success: true, urls: ["u"] });
      }),
    );
    await uploadVentaDocument(makeFile(), { subPath: "ventas/2024/01" });
    expect(body?.get("subPath")).toBe("ventas/2024/01");
  });

  it("throws on a non-OK HTTP response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500 })),
    );
    await expect(uploadVentaDocument(makeFile())).rejects.toThrow(/HTTP 500/);
  });

  it("throws the server error message when success is false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: false, error: "Drive lleno" })),
    );
    await expect(uploadVentaDocument(makeFile())).rejects.toThrow(
      "Drive lleno",
    );
  });

  it("throws when the response carries no URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ success: true, urls: [] })),
    );
    await expect(uploadVentaDocument(makeFile())).rejects.toThrow(/sin URL/);
  });
});

describe("ventasSubPath", () => {
  it("files a sale under the month of its OWN date, zero-padded", () => {
    // March (month index 2) → "03"; regenerating an old sale must not drift to
    // the current month.
    expect(ventasSubPath(new Date("2025-03-09T12:00:00Z"))).toBe(
      "ventas/2025/03",
    );
    expect(ventasSubPath(new Date("2026-12-31T23:59:59Z"))).toBe(
      "ventas/2026/12",
    );
  });

  it("falls back to a valid current-month path for an invalid date", () => {
    expect(ventasSubPath(new Date("not-a-date"))).toMatch(
      /^ventas\/\d{4}\/\d{2}$/,
    );
  });

  it("defaults to the current month when called with no argument", () => {
    expect(ventasSubPath()).toMatch(/^ventas\/\d{4}\/\d{2}$/);
  });
});

describe("driveDocViewUrl", () => {
  it("rewrites a legacy uc?export=view document URL to the PDF viewer", () => {
    expect(
      driveDocViewUrl("https://drive.google.com/uc?export=view&id=ABC123_x-9"),
    ).toBe("https://drive.google.com/file/d/ABC123_x-9/view");
  });

  it("handles reversed query params (id before export)", () => {
    expect(
      driveDocViewUrl("https://drive.google.com/uc?id=XYZ&export=view"),
    ).toBe("https://drive.google.com/file/d/XYZ/view");
  });

  it("leaves an already-viewer URL untouched", () => {
    const viewer = "https://drive.google.com/file/d/ABC/view";
    expect(driveDocViewUrl(viewer)).toBe(viewer);
  });

  it("passes through non-Drive URLs and undefined", () => {
    expect(driveDocViewUrl("https://example.com/doc.pdf")).toBe(
      "https://example.com/doc.pdf",
    );
    expect(driveDocViewUrl(undefined)).toBeUndefined();
  });
});
