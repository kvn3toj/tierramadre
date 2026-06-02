import { describe, it, expect } from "vitest";
import {
  planAsesorUpsert,
  normalizeAsesorName,
  type ExistingAsesorClient,
} from "../convex/_lib/asesorSync";

const existing = (
  partial: Partial<ExistingAsesorClient> & { _id: string; nombre: string },
): ExistingAsesorClient => ({ ...partial });

describe("normalizeAsesorName", () => {
  it("is accent / case / punctuation insensitive", () => {
    expect(normalizeAsesorName("Álvaro Peláez")).toBe(
      normalizeAsesorName("alvaro pelaez"),
    );
    expect(normalizeAsesorName("José Ignacio  Florez")).toBe(
      "joseignacioflorez",
    );
  });
  it("is empty for a blank name", () => {
    expect(normalizeAsesorName("   ")).toBe("");
    expect(normalizeAsesorName("")).toBe("");
  });
});

describe("planAsesorUpsert", () => {
  it("inserts a brand-new asesor", () => {
    const plan = planAsesorUpsert(
      [
        {
          nombre: "Nueva Asesora",
          email: "n@x.com",
          asesorId: "nueva-asesora",
        },
      ],
      [],
    );
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0]).toMatchObject({
      nombre: "Nueva Asesora",
      email: "n@x.com",
      asesorId: "nueva-asesora",
    });
    expect(plan.toUpdate).toHaveLength(0);
  });

  it("updates only the changed contact field on a known asesor", () => {
    const plan = planAsesorUpsert(
      [{ nombre: "Ana María Peláez", email: "new@x.com", telefono: "300" }],
      [
        existing({
          _id: "c1",
          nombre: "Ana Maria Pelaez",
          email: "old@x.com",
          telefono: "300",
        }),
      ],
    );
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toEqual([
      { id: "c1", patch: { email: "new@x.com" } },
    ]);
  });

  it("leaves an unchanged asesor alone", () => {
    const plan = planAsesorUpsert(
      [{ nombre: "Kevin Pineda", email: "k@x.com" }],
      [existing({ _id: "c2", nombre: "Kevin Pineda", email: "k@x.com" })],
    );
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it("never erases a stored value when the sheet cell is empty", () => {
    const plan = planAsesorUpsert(
      [{ nombre: "Kevin Pineda", email: "", telefono: "   " }],
      [
        existing({
          _id: "c2",
          nombre: "Kevin Pineda",
          email: "k@x.com",
          telefono: "300",
        }),
      ],
    );
    expect(plan.toUpdate).toHaveLength(0);
    expect(plan.unchanged).toBe(1);
  });

  it("matches existing by normalized name despite accents/case", () => {
    const plan = planAsesorUpsert(
      [{ nombre: "ÁLVARO PELÁEZ", asesorId: "alvaro-pelaez" }],
      [existing({ _id: "c3", nombre: "Álvaro Pelaéz" })],
    );
    expect(plan.toInsert).toHaveLength(0);
    expect(plan.toUpdate).toEqual([
      { id: "c3", patch: { asesorId: "alvaro-pelaez" } },
    ]);
  });

  it("dedupes by normalized name within the sheet (first wins)", () => {
    const plan = planAsesorUpsert(
      [
        { nombre: "Diana Suárez", email: "first@x.com" },
        { nombre: "Diana Suarez", email: "second@x.com" },
      ],
      [],
    );
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].email).toBe("first@x.com");
  });

  it("skips rows whose name is empty after normalize", () => {
    const plan = planAsesorUpsert(
      [{ nombre: "  " }, { nombre: "Real Name" }],
      [],
    );
    expect(plan.skipped).toBe(1);
    expect(plan.toInsert).toHaveLength(1);
  });
});
