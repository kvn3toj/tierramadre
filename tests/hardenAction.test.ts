import { describe, it, expect } from "vitest";
import {
  hardenAction,
  isActionKind,
  looksLikeConvexId,
  buildActionCatalogText,
} from "../src/pages/admin/Fotosintesis/copilot/flowSchemas";

describe("hardenAction — server hardening of a proposed action", () => {
  it("rejects an unknown kind or non-object", () => {
    expect(hardenAction(null, "admin")).toBeNull();
    expect(
      hardenAction({ kind: "totally.fake", args: {} }, "admin"),
    ).toBeNull();
  });

  it("gates by role (defense in depth): a guest cannot reach admin actions", () => {
    expect(
      hardenAction({ kind: "lot.publish", args: { loteId: "B-008" } }, "guest"),
    ).toBeNull();
    expect(
      hardenAction({ kind: "lot.publish", args: { loteId: "B-008" } }, "admin"),
    ).not.toBeNull();
  });

  it("C3: strips preponderancia (and costoBaseCOP) from item.editFields", () => {
    const a = hardenAction(
      {
        kind: "item.editFields",
        args: {
          itemHint: "Chivor",
          preponderancia: 5,
          costoBaseCOP: 999,
          color: "Verde",
        },
      },
      "admin",
    );
    expect(a).not.toBeNull();
    expect(a!.args).not.toHaveProperty("preponderancia");
    expect(a!.args).not.toHaveProperty("costoBaseCOP");
    // a legitimate edit field survives
    expect(a!.args.color).toBeTruthy();
  });

  it("preponderancia edits flow only through the dedicated kind", () => {
    const a = hardenAction(
      {
        kind: "item.editPreponderancia",
        args: { itemHint: "Chivor", preponderancia: 12 },
      },
      "admin",
    );
    expect(a).not.toBeNull();
    expect(a!.args.preponderancia).toBe(12);
    expect(a!.ready).toBe(true);
  });

  it("captures a name hint as a ref to resolve and strips a smuggled fake Id", () => {
    const a = hardenAction(
      {
        kind: "lot.create",
        args: {
          sede: "B",
          providerName: "Pedro Esmeraldas",
          providerId: "not a real id",
          costoTotalCOP: 3000000,
          unidadesDeclaradas: 10,
          formaPago: "contado",
        },
      },
      "admin",
    );
    expect(a).not.toBeNull();
    expect(a!.needsRefs).toEqual([
      { field: "providerId", refKind: "provider", hint: "Pedro Esmeraldas" },
    ]);
    // the fabricated providerId must not survive
    expect(a!.args.providerId).toBeUndefined();
    expect(a!.ready).toBe(true);
  });

  it("keeps a real-looking Convex Id without flagging a ref", () => {
    const realId = "k1739abcd0000zzzz1111yyyy";
    expect(looksLikeConvexId(realId)).toBe(true);
    const a = hardenAction(
      { kind: "lot.publish", args: { id: realId } },
      "admin",
    );
    expect(a).not.toBeNull();
    // ref already satisfied by a real id → no hint needed, not missing
    expect(a!.needsRefs.length).toBe(0);
  });

  it("recomputes missing for an incomplete create and marks it not ready", () => {
    const a = hardenAction(
      { kind: "item.createGema", args: { nombre: "Esmeralda" } },
      "admin",
    );
    expect(a).not.toBeNull();
    expect(a!.ready).toBe(false);
    // peso + preponderancia are still required
    expect(a!.missing).toEqual(
      expect.arrayContaining(["peso", "preponderancia"]),
    );
  });

  it("flags destructive kinds for the two-step gesture", () => {
    const a = hardenAction(
      { kind: "lot.cancel", args: { loteId: "B-008", reason: "duplicado" } },
      "admin",
    );
    expect(a).not.toBeNull();
    expect(a!.destructive).toBe(true);
    expect(a!.twoStep).toBe(true);
  });

  it("marks display-only kinds as not syncing to Sheets", () => {
    const a = hardenAction(
      {
        kind: "lot.setDisplay",
        args: { loteId: "B-008", mostrarComoLote: true },
      },
      "admin",
    );
    expect(a!.syncsToSheet).toBe(false);
  });

  it("authors a non-empty human summary and a valid kind", () => {
    const a = hardenAction(
      {
        kind: "provider.create",
        args: {
          nombreORazonSocial: "Minas SAS",
          tipo: "gemas",
          documento: "900123",
        },
      },
      "admin",
    );
    expect(a).not.toBeNull();
    expect(isActionKind(a!.kind)).toBe(true);
    expect(a!.summary.length).toBeGreaterThan(0);
  });

  it("builds an action catalog the model can read", () => {
    const text = buildActionCatalogText("admin");
    expect(text).toContain("item.createGema");
    expect(text).toContain("lot.publish");
    // guests get nothing actionable
    expect(buildActionCatalogText("guest")).not.toContain("lot.publish");
  });
});
