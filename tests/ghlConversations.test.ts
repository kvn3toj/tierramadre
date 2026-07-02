import { describe, it, expect, vi } from "vitest";
import {
  getLatestConversation,
  isInactiveConversation,
  addContactTags,
  parseLastMessageMs,
  type GhlConvConfig,
  type GhlConversationSummary,
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

describe("ghlConversations · getLatestConversation", () => {
  it("GETs /conversations/search with contactId+locationId and Bearer/Version headers", async () => {
    const f = fakeFetch({
      conversations: [
        { id: "cv-1", lastMessageDate: NOW, lastMessageDirection: "outbound" },
      ],
    });
    const convo = await getLatestConversation(baseCfg(f), "c-123");
    expect(convo?.id).toBe("cv-1");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(
      "https://services.leadconnectorhq.com/conversations/search" +
        "?locationId=t3tOZBrR05jUoLqnDn4I&contactId=c-123",
    );
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer pit-test-token");
    expect(init.headers.Version).toBe("2021-07-28");
  });

  it("returns null when the contact has no conversation history", async () => {
    const f = fakeFetch({ conversations: [] });
    expect(await getLatestConversation(baseCfg(f), "c-123")).toBeNull();
  });

  it("returns null when the response omits the conversations array", async () => {
    const f = fakeFetch({});
    expect(await getLatestConversation(baseCfg(f), "c-123")).toBeNull();
  });

  it("picks the freshest conversation when several are returned out of order", async () => {
    const f = fakeFetch({
      conversations: [
        { id: "old", lastMessageDate: NOW - 30 * DAY },
        { id: "new", lastMessageDate: NOW - 1 * DAY },
        { id: "mid", lastMessageDate: NOW - 10 * DAY },
      ],
    });
    const convo = await getLatestConversation(baseCfg(f), "c-123");
    expect(convo?.id).toBe("new");
  });

  it("throws on a non-ok GHL response", async () => {
    const f = fakeFetch({}, false, 401);
    await expect(getLatestConversation(baseCfg(f), "c-1")).rejects.toThrow(
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

describe("ghlConversations · parseLastMessageMs", () => {
  it("passes through an epoch-ms number", () => {
    expect(parseLastMessageMs({ lastMessageDate: NOW })).toBe(NOW);
  });
  it("parses an ISO-8601 string", () => {
    expect(
      parseLastMessageMs({ lastMessageDate: "2026-07-02T12:00:00.000Z" }),
    ).toBe(NOW);
  });
  it("returns 0 for missing/garbage dates", () => {
    expect(parseLastMessageMs({})).toBe(0);
    expect(parseLastMessageMs({ lastMessageDate: "not-a-date" })).toBe(0);
  });
});

describe("ghlConversations · isInactiveConversation (the tagging decision)", () => {
  it("TAGS a stale outbound-last message (>7d, from us, no reply since)", () => {
    const stale: GhlConversationSummary = {
      lastMessageDate: NOW - 8 * DAY,
      lastMessageDirection: "outbound",
    };
    expect(isInactiveConversation(stale, NOW, 7)).toBe(true);
  });

  it("does NOT tag when the contact replied recently (last message inbound)", () => {
    const replied: GhlConversationSummary = {
      lastMessageDate: NOW - 20 * DAY, // old, but it's THEIR message
      lastMessageDirection: "inbound",
    };
    expect(isInactiveConversation(replied, NOW, 7)).toBe(false);
  });

  it("does NOT tag an outbound message that is still within the window (<7d)", () => {
    const fresh: GhlConversationSummary = {
      lastMessageDate: NOW - 3 * DAY,
      lastMessageDirection: "outbound",
    };
    expect(isInactiveConversation(fresh, NOW, 7)).toBe(false);
  });

  it("treats a null summary (no history) as not-inactive (skipped upstream)", () => {
    expect(isInactiveConversation(null, NOW, 7)).toBe(false);
  });

  it("does NOT tag when the direction is unknown/absent", () => {
    expect(
      isInactiveConversation({ lastMessageDate: NOW - 30 * DAY }, NOW, 7),
    ).toBe(false);
  });

  it("does NOT tag when the date is unparseable (avoids false positives)", () => {
    expect(
      isInactiveConversation(
        { lastMessageDate: "garbage", lastMessageDirection: "outbound" },
        NOW,
        7,
      ),
    ).toBe(false);
  });

  it("is case-insensitive on direction and tolerant of ISO dates", () => {
    expect(
      isInactiveConversation(
        {
          lastMessageDate: "2026-06-20T00:00:00.000Z", // ~12d before NOW
          lastMessageDirection: "OUTBOUND",
        },
        NOW,
        7,
      ),
    ).toBe(true);
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
    let skippedNoHistory = 0;
    let errored = 0;
    for (const id of contactIds) {
      try {
        const convo = await getLatestConversation(cfg, id);
        if (!convo) {
          skippedNoHistory++;
          continue;
        }
        if (isInactiveConversation(convo, now, 7)) {
          await addContactTags(cfg, id, ["sin-respuesta-7d"]);
          tagged++;
        }
      } catch {
        errored++;
      }
    }
    return { tagged, skippedNoHistory, errored };
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
          json: async () => ({
            conversations: [
              { lastMessageDate: NOW - 9 * DAY, lastMessageDirection: "outbound" },
            ],
          }),
        };
      }
      if (url.includes("contactId=replied")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            conversations: [
              { lastMessageDate: NOW - 1 * DAY, lastMessageDirection: "inbound" },
            ],
          }),
        };
      }
      if (url.includes("contactId=nohistory")) {
        return { ok: true, status: 200, json: async () => ({ conversations: [] }) };
      }
      if (url.includes("contactId=boom")) {
        return { ok: false, status: 500, json: async () => ({}) }; // API error
      }
      return { ok: true, status: 200, json: async () => ({ conversations: [] }) };
    });

    const out = await scanBatch(
      baseCfg(f),
      ["stale", "replied", "nohistory", "boom"],
      NOW,
    );
    expect(out).toEqual({ tagged: 1, skippedNoHistory: 1, errored: 1 });
    // The tag POST fired exactly once (for `stale`).
    const tagCalls = f.mock.calls.filter(
      ([u, i]) => i?.method === "POST" && String(u).endsWith("/tags"),
    );
    expect(tagCalls).toHaveLength(1);
    expect(String(tagCalls[0][0])).toContain("/contacts/stale/tags");
  });
});
