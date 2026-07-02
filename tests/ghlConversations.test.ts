import { describe, it, expect, vi } from "vitest";
import {
  isContactInactive,
  addContactTags,
  type GhlConvConfig,
} from "../convex/_lib/ghlConversations";

const NOW = Date.parse("2026-07-02T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

/** A fetch stub that returns a canned JSON response and records its calls. */
function fakeFetch(jsonBody: unknown = {}, ok = true, status = 200) {
  return vi.fn(async (_url: string, _init?: any) => ({
    ok,
    status,
    json: async () => jsonBody,
  }));
}

const baseCfg = (fetchImpl: any): GhlConvConfig => ({
  token: "pit-test-token",
  locationId: "t3tOZBrR05jUoLqnDn4I",
  fetchImpl,
});

describe("ghlConversations · isContactInactive", () => {
  it("GETs /conversations/search with the server-side filters (contactId, locationId, lastMessageDirection=outbound, endDate cutoff, limit=1)", async () => {
    const f = fakeFetch({ conversations: [{ id: "cv-1" }], total: 1 });
    const inactive = await isContactInactive(baseCfg(f), "c-123", NOW, 7);
    expect(inactive).toBe(true);
    const [url, init] = f.mock.calls[0];
    const cutoffMs = NOW - 7 * DAY;
    expect(url).toBe(
      "https://services.leadconnectorhq.com/conversations/search" +
        "?locationId=t3tOZBrR05jUoLqnDn4I&contactId=c-123" +
        `&lastMessageDirection=outbound&endDate=${cutoffMs}&limit=1`,
    );
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer pit-test-token");
    expect(init.headers.Version).toBe("2021-07-28");
  });

  it("returns false when no conversation matches the filters (no history, or last message isn't a stale outbound)", async () => {
    const f = fakeFetch({ conversations: [], total: 0 });
    expect(await isContactInactive(baseCfg(f), "c-123", NOW, 7)).toBe(false);
  });

  it("returns false when the response omits the conversations array", async () => {
    const f = fakeFetch({});
    expect(await isContactInactive(baseCfg(f), "c-123", NOW, 7)).toBe(false);
  });

  it("computes the endDate cutoff from nowMs and thresholdDays", async () => {
    const f = fakeFetch({ conversations: [] });
    await isContactInactive(baseCfg(f), "c-123", NOW, 30);
    const [url] = f.mock.calls[0];
    expect(url).toContain(`endDate=${NOW - 30 * DAY}`);
  });

  it("throws on a non-ok GHL response", async () => {
    const f = fakeFetch({}, false, 401);
    await expect(isContactInactive(baseCfg(f), "c-1", NOW, 7)).rejects.toThrow(
      /401/,
    );
  });
});

describe("ghlConversations · addContactTags", () => {
  it("POSTs to the additive /contacts/{id}/tags endpoint", async () => {
    const f = fakeFetch({ tags: ["sin-respuesta-7d"] });
    await addContactTags(baseCfg(f), "c-123", ["sin-respuesta-7d"]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(
      "https://services.leadconnectorhq.com/contacts/c-123/tags",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ tags: ["sin-respuesta-7d"] });
  });

  it("throws on a non-ok GHL response", async () => {
    const f = fakeFetch({}, false, 422);
    await expect(addContactTags(baseCfg(f), "c-1", ["x"])).rejects.toThrow(
      /422/,
    );
  });
});

/**
 * Batch resilience — the cron's contract that "one contact's API error doesn't
 * crash the whole batch". Modelled here as the loop the internalAction runs,
 * over the same helper functions, so it's exercised without the Convex harness.
 */
describe("ghlConversations · batch scan resilience", () => {
  async function scanBatch(
    cfg: GhlConvConfig,
    contactIds: string[],
    now: number,
  ) {
    let tagged = 0;
    let notInactive = 0;
    let errored = 0;
    for (const id of contactIds) {
      try {
        const inactive = await isContactInactive(cfg, id, now, 7);
        if (inactive) {
          await addContactTags(cfg, id, ["sin-respuesta-7d"]);
          tagged++;
        } else {
          notInactive++;
        }
      } catch {
        errored++;
      }
    }
    return { tagged, notInactive, errored };
  }

  it("tags the stale one, skips the replied + no-history, and one API error doesn't abort the rest", async () => {
    // Per-contact routing so a single fetch stub can serve the whole batch.
    const f = vi.fn(async (url: string, init?: any) => {
      // Tag POSTs always succeed.
      if (init?.method === "POST" && url.endsWith("/tags")) {
        return { ok: true, status: 200, json: async () => ({}) };
      }
      if (url.includes("contactId=stale")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ conversations: [{ id: "cv-stale" }], total: 1 }),
        };
      }
      if (url.includes("contactId=replied")) {
        // Last message isn't a stale outbound → server-side filter excludes it.
        return {
          ok: true,
          status: 200,
          json: async () => ({ conversations: [], total: 0 }),
        };
      }
      if (url.includes("contactId=nohistory")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ conversations: [], total: 0 }),
        };
      }
      if (url.includes("contactId=boom")) {
        return { ok: false, status: 500, json: async () => ({}) }; // API error
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ conversations: [] }),
      };
    });

    const out = await scanBatch(
      baseCfg(f),
      ["stale", "replied", "nohistory", "boom"],
      NOW,
    );
    expect(out).toEqual({ tagged: 1, notInactive: 2, errored: 1 });
    // The tag POST fired exactly once (for `stale`).
    const tagCalls = f.mock.calls.filter(
      ([u, i]) => i?.method === "POST" && String(u).endsWith("/tags"),
    );
    expect(tagCalls).toHaveLength(1);
    expect(String(tagCalls[0][0])).toContain("/contacts/stale/tags");
  });
});
