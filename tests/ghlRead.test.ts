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
