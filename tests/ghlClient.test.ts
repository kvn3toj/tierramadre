import { describe, it, expect, vi } from "vitest";
import {
  upsertContact,
  addTags,
  addToWorkflow,
  updateContactFields,
  type GhlConfig,
} from "../api/_lib/ghl-client";

/** Capture the last fetch call and return a canned JSON response. */
function fakeFetch(jsonBody: unknown = {}) {
  return vi.fn(async (_url: string, _init?: any) => ({
    ok: true,
    status: 200,
    json: async () => jsonBody,
  }));
}

const baseCfg = (fetchImpl: any): GhlConfig => ({
  token: "pit-test-token",
  locationId: "t3tOZBrR05jUoLqnDn4I",
  fetchImpl,
});

describe("ghl-client", () => {
  it("upsertContact POSTs to /contacts/upsert with auth + Version headers and locationId", async () => {
    const f = fakeFetch({ contact: { id: "c-123" }, new: true });
    const { contactId, isNew } = await upsertContact(baseCfg(f), {
      phone: "+573001112222",
      email: "a@b.co",
      tags: ["compra-mercadopago"],
      customFields: [{ key: "total_comprado_cop", field_value: 500000 }],
    });

    expect(contactId).toBe("c-123");
    expect(isNew).toBe(true);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://services.leadconnectorhq.com/contacts/upsert");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer pit-test-token");
    expect(init.headers.Version).toBe("2021-07-28");
    const body = JSON.parse(init.body);
    expect(body.locationId).toBe("t3tOZBrR05jUoLqnDn4I");
    // Custom-field write value uses `field_value` (not `value`).
    expect(body.customFields[0]).toEqual({
      key: "total_comprado_cop",
      field_value: 500000,
    });
  });

  it("addTags POSTs to the dedicated additive tags endpoint", async () => {
    const f = fakeFetch({ tags: ["cliente-pago-confirmado"] });
    await addTags(baseCfg(f), "c-123", ["cliente-pago-confirmado"]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(
      "https://services.leadconnectorhq.com/contacts/c-123/tags",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      tags: ["cliente-pago-confirmado"],
    });
  });

  it("addToWorkflow POSTs to /contacts/{id}/workflow/{wfId}", async () => {
    const f = fakeFetch({});
    await addToWorkflow(baseCfg(f), "c-123", "wf-postventa");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(
      "https://services.leadconnectorhq.com/contacts/c-123/workflow/wf-postventa",
    );
    expect(init.method).toBe("POST");
  });

  it("updateContactFields PUTs customFields with field_value", async () => {
    const f = fakeFetch({});
    await updateContactFields(baseCfg(f), "c-123", [
      { key: "ultima_compra_fecha", field_value: "2026-05-28" },
    ]);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://services.leadconnectorhq.com/contacts/c-123");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body).customFields[0].field_value).toBe(
      "2026-05-28",
    );
  });

  it("throws on a non-ok GHL response", async () => {
    const f = vi.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({}),
    }));
    await expect(addTags(baseCfg(f), "c-1", ["x"])).rejects.toThrow(/422/);
  });
});
