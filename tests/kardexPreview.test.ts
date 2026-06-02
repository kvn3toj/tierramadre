import { describe, it, expect, afterEach } from "vitest";
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";

// KardexPreview is pure presentational (only MUI Box + design-system tokens) —
// no Convex, no hooks — so it renders directly with no provider/mocks. This
// pins the Bug-2 fix: the carnet must show EVERY sale item (it used to render
// only the first), with a totals block, while the single-item layout keeps its
// premium specs grid. Written with createElement to stay a `.test.ts` file
// (vitest include is tests/**/*.test.ts), matching tests/fotosintesis-phone.test.ts.
import {
  KardexPreview,
  type KardexLineItem,
} from "../src/pages/admin/Fotosintesis/components/KardexPreview";

afterEach(cleanup);

const ITEMS: KardexLineItem[] = [
  {
    itemId: "101",
    nombre: "Esmeralda Uno",
    color: "Verde",
    calidad: "AAA",
    peso: "2.5 ct",
    precioCop: 800_000,
  },
  {
    itemId: "102",
    nombre: "Esmeralda Dos",
    color: "Verde claro",
    calidad: "AA",
    peso: "1.2 ct",
    precioCop: 500_000,
  },
  { itemId: "103", nombre: "Esmeralda Tres", precioCop: 300_000 },
];

const SALE = {
  id: "VB-0042",
  precioCop: 1_600_000,
  formaPago: "contado",
  metodoContado: "efectivo",
};
const BUYER = { nombre: "Ana Pelaez", cedula: "123456", tipo: "final" };
const LOT = { loteId: "L-7" };
const PROVIDER = { nombreORazonSocial: "Minas XYZ" };

function renderKardex(overrides: {
  items?: KardexLineItem[];
  privacyOn?: boolean;
  subtotalCop?: number;
  descuentoCop?: number;
}) {
  return render(
    createElement(KardexPreview, {
      items: overrides.items ?? ITEMS,
      lot: LOT,
      provider: PROVIDER,
      buyer: BUYER,
      sale: SALE,
      privacyOn: overrides.privacyOn ?? false,
      subtotalCop: overrides.subtotalCop,
      descuentoCop: overrides.descuentoCop,
    }),
  );
}

describe("KardexPreview — multi-item carnet (Bug 2)", () => {
  it("renders EVERY item in a multi-item sale, not just the first", () => {
    renderKardex({ items: ITEMS, subtotalCop: 1_600_000 });
    expect(screen.getByText("Esmeralda Uno")).toBeTruthy();
    expect(screen.getByText("Esmeralda Dos")).toBeTruthy();
    expect(screen.getByText("Esmeralda Tres")).toBeTruthy();
    // The carnet id always renders.
    expect(screen.getByText("VB-0042")).toBeTruthy();
  });

  it("shows the totals block (Subtotal + Total) for multi-item sales", () => {
    renderKardex({ items: ITEMS, subtotalCop: 1_600_000 });
    expect(screen.getByText("Resumen de montos")).toBeTruthy();
    expect(screen.getByText("Subtotal")).toBeTruthy();
    expect(screen.getByText("Total")).toBeTruthy();
  });

  it("renders a Descuento line only when descuentoCop > 0", () => {
    const { rerender } = renderKardex({ items: ITEMS, subtotalCop: 1_600_000 });
    expect(screen.queryByText("Descuento")).toBeNull();
    rerender(
      createElement(KardexPreview, {
        items: ITEMS,
        lot: LOT,
        provider: PROVIDER,
        buyer: BUYER,
        sale: SALE,
        privacyOn: false,
        subtotalCop: 1_600_000,
        descuentoCop: 100_000,
      }),
    );
    expect(screen.getByText("Descuento")).toBeTruthy();
  });

  it("masks the buyer when privacyOn, in the multi-item layout", () => {
    renderKardex({ items: ITEMS, privacyOn: true });
    expect(screen.queryByText(/Ana Pelaez/)).toBeNull();
    expect(screen.getByText(/oculta en versión pública/)).toBeTruthy();
  });
});

describe("KardexPreview — single & empty layouts", () => {
  it("keeps the premium specs grid for a single-item sale (no totals block)", () => {
    renderKardex({ items: [ITEMS[0]] });
    expect(screen.getByText("Esmeralda Uno")).toBeTruthy();
    // Specs grid labels are unique to the single layout.
    expect(screen.getByText("Peso")).toBeTruthy();
    expect(screen.getByText("Forma de pago")).toBeTruthy();
    // The multi-item totals block must NOT appear for a single item.
    expect(screen.queryByText("Resumen de montos")).toBeNull();
  });

  it("shows a placeholder when there are no items", () => {
    renderKardex({ items: [] });
    expect(screen.getByText("Sin ítems")).toBeTruthy();
  });
});
