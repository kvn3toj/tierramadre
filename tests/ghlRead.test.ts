import { describe, it, expect, vi } from "vitest";
import {
  getConversationMessages,
  searchConversations,
  getContact,
  getCustomFieldDefs,
  getPipelines,
  findContactOpportunity,
  type GhlReadConfig,
} from "../api/_lib/ghl-read";

function fakeFetch(jsonBody: unknown = {}, ok = true, status = 200) {
  return vi.fn(async (_url: string, _init?: any) => ({
    ok,
    status,
    json: async () => jsonBody,
  }));
}
const cfg = (fetchImpl: any): GhlReadConfig => ({
  token: "pit-t",
  locationId: "t3tOZBrR05jUoLqnDn4I",
  fetchImpl,
});

describe("ghl-read", () => {
  it("getConversationMessages GETs the messages endpoint with auth+version and returns the message array", async () => {
    const f = fakeFetch({
      messages: {
        messages: [
          {
            id: "m1",
            type: "TYPE_WHATSAPP",
            direction: "inbound",
            body: "hola",
            dateAdded: "2026-06-10",
          },
        ],
        nextPage: false,
      },
    });
    const msgs = await getConversationMessages(cfg(f), "cv-1");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].body).toBe("hola");
    const [url, init] = f.mock.calls[0];
    expect(url).toContain(
      "https://services.leadconnectorhq.com/conversations/cv-1/messages",
    );
    expect(init.method).toBe("GET");
    expect(init.headers.Authorization).toBe("Bearer pit-t");
    expect(init.headers.Version).toBe("2021-07-28");
  });

  it("searchConversations passes locationId + date window and returns summaries", async () => {
    const f = fakeFetch({
      conversations: [{ id: "cv-1", contactId: "c-1", fullName: "Kevin" }],
    });
    const out = await searchConversations(cfg(f), {
      startDate: 1000,
      endDate: 2000,
    });
    expect(out[0].contactId).toBe("c-1");
    const [url] = f.mock.calls[0];
    expect(url).toContain("locationId=t3tOZBrR05jUoLqnDn4I");
    expect(url).toContain("startDate=1000");
    expect(url).toContain("endDate=2000");
  });

  it("paginates via startAfterDate until a short page, concatenating results", async () => {
    // Page 1 is FULL (== limit) and carries a cursor date on its last item;
    // page 2 is SHORT (< limit) → loop stops after two fetches.
    const page1 = {
      conversations: [
        { id: "cv-1", contactId: "c-1", fullName: "A", lastMessageDate: 1000 },
        { id: "cv-2", contactId: "c-2", fullName: "B", lastMessageDate: 2000 },
      ],
    };
    const page2 = {
      conversations: [
        { id: "cv-3", contactId: "c-3", fullName: "C", lastMessageDate: 3000 },
      ],
    };
    const responses = [page1, page2];
    let call = 0;
    const f = vi.fn(async (_url: string, _init?: any) => ({
      ok: true,
      status: 200,
      json: async () => responses[call++],
    }));
    const out = await searchConversations(cfg(f), {
      limit: 2,
      startDate: 1,
      endDate: 9,
    });
    expect(f).toHaveBeenCalledTimes(2);
    expect(out.map((c) => c.id)).toEqual(["cv-1", "cv-2", "cv-3"]);
    // 1st request must NOT carry a cursor; 2nd advances via the page-1 cursor.
    expect(f.mock.calls[0][0]).not.toContain("startAfterDate");
    expect(f.mock.calls[1][0]).toContain("startAfterDate=2000");
  });

  it("stops after exactly one fetch when the first page is short", async () => {
    const f = fakeFetch({
      conversations: [{ id: "cv-1", contactId: "c-1", fullName: "Solo" }],
    });
    const out = await searchConversations(cfg(f), { limit: 100 });
    expect(f).toHaveBeenCalledTimes(1);
    expect(out).toHaveLength(1);
  });

  it("defaults limit to 100 when the caller passes none", async () => {
    const f = fakeFetch({
      conversations: [{ id: "cv-1", contactId: "c-1", fullName: "Kevin" }],
    });
    await searchConversations(cfg(f), { startDate: 1000, endDate: 2000 });
    expect(f.mock.calls[0][0]).toContain("limit=100");
  });

  it("getContact returns id, customFields (read shape: id+value), and tags", async () => {
    const f = fakeFetch({
      contact: {
        id: "c-1",
        customFields: [{ id: "fid-tipo", value: "anillo" }],
        tags: ["lead-nuevo"],
      },
    });
    const c = await getContact(cfg(f), "c-1");
    expect(c.customFields[0]).toEqual({ id: "fid-tipo", value: "anillo" });
    expect(c.tags).toEqual(["lead-nuevo"]);
  });

  it("getCustomFieldDefs strips the contact. prefix from fieldKey", async () => {
    const f = fakeFetch({
      customFields: [
        {
          id: "fid-tipo",
          fieldKey: "contact.tipo_interes",
          name: "Tipo de interés",
        },
      ],
    });
    const defs = await getCustomFieldDefs(cfg(f));
    expect(defs[0]).toEqual({
      id: "fid-tipo",
      fieldKey: "tipo_interes",
      name: "Tipo de interés",
    });
  });

  it("getPipelines returns pipelines with stages", async () => {
    const f = fakeFetch({
      pipelines: [
        {
          id: "u4MPXH2HdEFmU3vVqNdd",
          name: "Ventas Tierra Madre",
          stages: [{ id: "s1", name: "Nuevo Lead" }],
        },
      ],
    });
    const p = await getPipelines(cfg(f));
    expect(p[0].stages[0].name).toBe("Nuevo Lead");
  });

  it("findContactOpportunity returns the opp in the given pipeline, most-recent if several, else null", async () => {
    const f = fakeFetch({
      opportunities: [
        {
          id: "o-old",
          pipelineId: "u4MPXH2HdEFmU3vVqNdd",
          pipelineStageId: "s1",
          updatedAt: "2026-06-01",
        },
        {
          id: "o-new",
          pipelineId: "u4MPXH2HdEFmU3vVqNdd",
          pipelineStageId: "s2",
          updatedAt: "2026-06-20",
        },
        {
          id: "o-other",
          pipelineId: "OTHER",
          pipelineStageId: "x",
          updatedAt: "2026-06-30",
        },
      ],
    });
    const opp = await findContactOpportunity(
      cfg(f),
      "c-1",
      "u4MPXH2HdEFmU3vVqNdd",
    );
    expect(opp?.id).toBe("o-new");
    const none = await findContactOpportunity(
      cfg(fakeFetch({ opportunities: [] })),
      "c-1",
      "u4MPXH2HdEFmU3vVqNdd",
    );
    expect(none).toBeNull();
  });

  it("throws on a non-ok response", async () => {
    await expect(
      getContact(cfg(fakeFetch({}, false, 401)), "c-1"),
    ).rejects.toThrow(/401/);
  });
});
