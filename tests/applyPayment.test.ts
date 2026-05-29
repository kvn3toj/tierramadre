import { describe, it, expect } from "vitest";
import { applyPaymentToSale } from "../convex/_lib/applyPayment";

const NOW = "2026-05-28T12:00:00.000Z";

describe("applyPaymentToSale", () => {
  it("flips a reservada sale to confirmada on an approved payment", () => {
    const r = applyPaymentToSale(
      { estado: "reservada" },
      { id: "mp-999", status: "approved" },
      NOW,
    );
    expect(r.changed).toBe(true);
    if (r.changed) {
      expect(r.patch).toEqual({
        estado: "confirmada",
        paidAt: NOW,
        mpPaymentId: "mp-999",
        mpStatus: "approved",
      });
    }
  });

  it("is idempotent: an already-confirmada sale does not change (replay guard)", () => {
    const r = applyPaymentToSale(
      { estado: "confirmada" },
      { id: "mp-999", status: "approved" },
      NOW,
    );
    expect(r).toEqual({ changed: false, reason: "already-paid" });
  });

  it("never revives a cancelada sale from a late webhook", () => {
    const r = applyPaymentToSale(
      { estado: "cancelada" },
      { id: "mp-999", status: "approved" },
      NOW,
    );
    expect(r).toEqual({ changed: false, reason: "cancelled" });
  });

  it("ignores a non-approved payment (pending/rejected)", () => {
    expect(
      applyPaymentToSale(
        { estado: "reservada" },
        { id: "mp-1", status: "pending" },
        NOW,
      ),
    ).toEqual({ changed: false, reason: "not-approved" });
    expect(
      applyPaymentToSale(
        { estado: "reservada" },
        { id: "mp-1", status: "rejected" },
        NOW,
      ),
    ).toEqual({ changed: false, reason: "not-approved" });
  });
});
