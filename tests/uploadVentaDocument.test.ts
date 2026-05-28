import { describe, it, expect, vi, afterEach } from "vitest";
import { uploadVentaDocument } from "../src/pages/admin/Fotosintesis/utils/uploadItemMedia";

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
