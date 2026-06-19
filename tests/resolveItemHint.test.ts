import { describe, it, expect } from "vitest";
import {
  resolveItemHint,
  hintMissMessage,
  type HintCandidate,
} from "../src/pages/admin/Fotosintesis/copilot/resolveItemHint";

/**
 * Contract for guided-edit itemHint resolution (bug #3 polish).
 *
 * Fotosynthia extracts an `itemHint` ("la esmeralda de Chivor" -> "Chivor") and
 * the client resolves it against the snapshot's candidate items (capped to the
 * 300 most-recent items that have a loteId). Previously a miss silently picked
 * the first substring match or dead-ended with a generic message. This helper
 * makes the match accent/case-insensitive, refuses to guess when ambiguous, and
 * classifies WHY a hint failed so the panel can show a recoverable message that
 * distinguishes "fell off the recent-items cap" from "no such item".
 */
const CAP = 300;
const cand = (
  itemId: string,
  nombre?: string,
  loteId?: string,
): HintCandidate => ({ itemId, nombre, loteId });

describe("resolveItemHint", () => {
  it("resolves an exact itemId match and exposes its loteId for routing", () => {
    const r = resolveItemHint(
      "k57",
      [cand("k57", "Esmeralda A", "B-001")],
      CAP,
    );
    expect(r.status).toBe("resolved");
    if (r.status === "resolved") expect(r.item.loteId).toBe("B-001");
  });

  it("matches a name accent- and case-insensitively", () => {
    const r = resolveItemHint(
      "gachala",
      [cand("1", "Esmeralda de Gachalá", "B-002")],
      CAP,
    );
    expect(r.status).toBe("resolved");
    if (r.status === "resolved") expect(r.item.itemId).toBe("1");
  });

  it("matches a substring of the name", () => {
    const r = resolveItemHint(
      "Chivor",
      [cand("1", "La gran Chivor verde", "B-003")],
      CAP,
    );
    expect(r.status).toBe("resolved");
  });

  it("reports ambiguous (without guessing) when more than one name matches", () => {
    const r = resolveItemHint(
      "chivor",
      [cand("1", "Chivor uno", "B-1"), cand("2", "Chivor dos", "B-2")],
      CAP,
    );
    expect(r.status).toBe("ambiguous");
    if (r.status === "ambiguous") expect(r.matches).toHaveLength(2);
  });

  it("reports not-found with catalogComplete when the catalog fits under the cap", () => {
    const r = resolveItemHint("Muzo", [cand("1", "Coscuez", "B-1")], CAP);
    expect(r).toEqual({ status: "not-found", catalogComplete: true });
  });

  it("reports not-found with catalogComplete=false when candidates saturate the cap", () => {
    const many = Array.from({ length: CAP }, (_, i) =>
      cand(String(i), `Item ${i}`, "B-1"),
    );
    const r = resolveItemHint("Muzo", many, CAP);
    expect(r).toEqual({ status: "not-found", catalogComplete: false });
  });

  it("reports no-data when candidates are undefined (Convex offline)", () => {
    expect(resolveItemHint("Chivor", undefined, CAP)).toEqual({
      status: "no-data",
    });
  });

  it("prefers an exact itemId match over a name substring", () => {
    const r = resolveItemHint(
      "10",
      [
        cand("10", "Otra", "B-1"),
        cand("99", "contiene 10 en el nombre", "B-2"),
      ],
      CAP,
    );
    expect(r.status).toBe("resolved");
    if (r.status === "resolved") expect(r.item.itemId).toBe("10");
  });
});

describe("hintMissMessage", () => {
  it("distinguishes 'older lot' (cap saturated) from 'not found' (complete catalog)", () => {
    const older = hintMissMessage("Chivor", {
      status: "not-found",
      catalogComplete: false,
    });
    const gone = hintMissMessage("Chivor", {
      status: "not-found",
      catalogComplete: true,
    });
    expect(older).toMatch(/lote más antiguo|recientes/i);
    expect(gone).toMatch(/no encontré|revisá/i);
    expect(older).not.toBe(gone);
  });

  it("names the ambiguous matches so the operator can disambiguate", () => {
    const msg = hintMissMessage("chivor", {
      status: "ambiguous",
      matches: [
        { itemId: "1", nombre: "Chivor uno" },
        { itemId: "2", nombre: "Chivor dos" },
      ],
    });
    expect(msg).toMatch(/varios/i);
    expect(msg).toContain("Chivor uno");
  });

  it("explains an offline inventory lookup", () => {
    const msg = hintMissMessage("Chivor", { status: "no-data" });
    expect(msg).toMatch(/no puedo consultar|inventario/i);
  });
});
