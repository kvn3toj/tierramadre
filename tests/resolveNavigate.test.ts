import { describe, it, expect } from "vitest";
import {
  resolveNavigate,
  buildNavCatalogText,
} from "../src/pages/admin/Fotosintesis/copilot/flowSchemas";

describe("resolveNavigate — validation + role gate", () => {
  it("resolves a static admin route to a full path", () => {
    const r = resolveNavigate({ routeId: "admin.analytics" }, "admin");
    expect(r).toMatchObject({
      routeId: "admin.analytics",
      path: "/admin/analytics",
    });
    expect(r?.needsParam).toBeUndefined();
  });

  it("drops a hallucinated routeId", () => {
    expect(resolveNavigate({ routeId: "totally.fake" }, "admin")).toBeNull();
  });

  it("drops navigation a role cannot access", () => {
    // admin-only route, requested by an embajador → refused
    expect(
      resolveNavigate({ routeId: "admin.analytics" }, "embajador"),
    ).toBeNull();
  });

  it("allows a staff route for a staff role", () => {
    const r = resolveNavigate({ routeId: "cuentas.hub" }, "embajador");
    expect(r?.path).toBe("/cuentas");
  });

  it("returns null for missing/garbage input", () => {
    expect(resolveNavigate(undefined, "admin")).toBeNull();
    expect(resolveNavigate({}, "admin")).toBeNull();
    expect(resolveNavigate({ routeId: 42 }, "admin")).toBeNull();
  });

  it("fills a direct-fill param (loteId) from the model hint", () => {
    const r = resolveNavigate(
      { routeId: "fotosintesis.lote", params: { loteId: "B-001" } },
      "admin",
    );
    expect(r?.path).toBe("/admin/fotosintesis/lots/B-001");
    expect(r?.needsParam).toBeUndefined();
  });

  it("leaves a name→ID param (itemId) for the client and flags needsParam", () => {
    const r = resolveNavigate(
      { routeId: "admin.analytics.item", params: { itemId: "Chivor" } },
      "admin",
    );
    // server does NOT fill a client-resolve param; path stays a template
    expect(r?.path).toContain(":itemId");
    expect(r?.needsParam?.name).toBe("itemId");
    // the hint is carried so the client can resolve it
    expect(r?.params?.itemId).toBe("Chivor");
  });

  it("lets authoritative resolvedParams win over hints", () => {
    const r = resolveNavigate(
      { routeId: "fotosintesis.lote", params: { loteId: "B-999" } },
      "admin",
      { loteId: "B-007" },
    );
    expect(r?.path).toBe("/admin/fotosintesis/lots/B-007");
  });

  it("carries a sanitized reason", () => {
    const r = resolveNavigate(
      { routeId: "admin.analytics", reason: "para ver métricas" },
      "admin",
    );
    expect(r?.reason).toBe("para ver métricas");
  });
});

describe("buildNavCatalogText — role scoping", () => {
  it("includes admin routes for admin", () => {
    const cat = buildNavCatalogText("admin");
    expect(cat).toContain("admin.analytics");
    expect(cat).toContain("fotosintesis.lote");
  });

  it("hides admin-only routes from a non-admin staff role", () => {
    const cat = buildNavCatalogText("embajador");
    expect(cat).not.toContain("admin.analytics");
    // but staff routes remain
    expect(cat).toContain("cuentas.hub");
    expect(cat).toContain("perfil");
  });

  it("a guest sees no admin/staff routes", () => {
    const cat = buildNavCatalogText("guest");
    expect(cat).not.toContain("admin.analytics");
    expect(cat).not.toContain("cuentas.hub");
  });
});
