import { describe, it, expect, vi, afterEach } from "vitest";
import { postToVercel } from "../convex/_lib/sheetSync";

/**
 * Regression: a redirecting APP_URL (e.g. a *.vercel.app alias that 301s to the
 * custom domain) must NOT break Sheets writes. WHATWG fetch downgrades POST→GET
 * on a 301/302/303, which made every push arrive as GET and get 405'd — the
 * exact production failure on 2026-06-30. postToVercel follows redirects
 * manually, re-issuing the SAME method + body at each hop.
 */

type Call = { url: string; method?: string; body?: string };

function mockFetchSequence(responses: Array<() => Response>) {
  const calls: Call[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      body: init?.body as string | undefined,
    });
    const make = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return make();
  });
  // @ts-expect-error — install our stub as the global fetch for the test
  globalThis.fetch = fn;
  return calls;
}

const redirect = (location: string, status = 301) =>
  new Response(null, { status, headers: { location } });

afterEach(() => {
  vi.restoreAllMocks();
});

describe("postToVercel", () => {
  it("follows a 301 by RE-POSTING to the target (never downgrades to GET)", async () => {
    const calls = mockFetchSequence([
      () => redirect("https://tierramadre.app/api/admin-table-update", 301),
      () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    ]);

    const res = await postToVercel(
      "https://tierra-madre-studio.vercel.app/api/admin-table-update",
      { headers: { "content-type": "application/json" }, body: '{"a":1}' },
    );

    expect(res.status).toBe(200);
    expect(calls).toHaveLength(2);
    // The redirect was followed to the custom domain…
    expect(calls[1].url).toBe("https://tierramadre.app/api/admin-table-update");
    // …and CRUCIALLY every hop stayed POST with the body intact.
    expect(calls.every((c) => c.method === "POST")).toBe(true);
    expect(calls.every((c) => c.body === '{"a":1}')).toBe(true);
  });

  it("resolves a relative Location against the current target", async () => {
    const calls = mockFetchSequence([
      () => redirect("/api/admin-product-update", 308),
      () => new Response("{}", { status: 401 }),
    ]);

    await postToVercel("https://tierramadre.app/api/admin-product-update", {
      headers: {},
      body: "{}",
    });

    expect(calls[1].url).toBe(
      "https://tierramadre.app/api/admin-product-update",
    );
  });

  it("returns a non-redirect response directly (single call)", async () => {
    const calls = mockFetchSequence([
      () => new Response("{}", { status: 401 }),
    ]);

    const res = await postToVercel("https://tierramadre.app/api/x", {
      headers: {},
      body: "{}",
    });

    expect(res.status).toBe(401);
    expect(calls).toHaveLength(1);
  });

  it("gives up after too many redirect hops", async () => {
    mockFetchSequence([() => redirect("https://loop.example/again", 302)]);

    await expect(
      postToVercel("https://loop.example/start", { headers: {}, body: "{}" }),
    ).rejects.toThrow(/Too many redirects/);
  });
});
