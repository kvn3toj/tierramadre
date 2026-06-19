import { describe, it, expect } from "vitest";
import { decideWebhookOutcome } from "../api/_lib/mpWebhookLogic";

describe("decideWebhookOutcome", () => {
  it("rejects an invalid signature with 401", () => {
    expect(decideWebhookOutcome({ signatureValid: false })).toEqual({
      httpStatus: 401,
      outcome: "invalid-signature",
      fanOut: false,
    });
  });

  it("ignores a non-payment notification (200, no fan-out)", () => {
    const r = decideWebhookOutcome({
      signatureValid: true,
      type: "merchant_order",
      dataId: "1",
    });
    expect(r.httpStatus).toBe(200);
    expect(r.outcome).toBe("ignored");
    expect(r.fanOut).toBe(false);
  });

  it("ignores a missing data.id", () => {
    const r = decideWebhookOutcome({
      signatureValid: true,
      type: "payment",
      dataId: null,
    });
    expect(r.outcome).toBe("ignored");
  });

  it("ignores a non-approved payment", () => {
    const r = decideWebhookOutcome({
      signatureValid: true,
      type: "payment",
      dataId: "1",
      paymentApproved: false,
      externalReference: "VB-1",
    });
    expect(r.outcome).toBe("ignored");
    expect(r.reason).toBe("payment-not-approved");
  });

  it("ignores an approved payment with no external_reference", () => {
    const r = decideWebhookOutcome({
      signatureValid: true,
      type: "payment",
      dataId: "1",
      paymentApproved: true,
      externalReference: null,
    });
    expect(r.outcome).toBe("ignored");
    expect(r.reason).toBe("no-external-reference");
  });

  it("returns already-paid (no fan-out) when the sale was not updated (idempotent replay)", () => {
    const r = decideWebhookOutcome({
      signatureValid: true,
      type: "payment",
      dataId: "1",
      paymentApproved: true,
      externalReference: "VB-1",
      saleUpdated: false,
    });
    expect(r).toEqual({
      httpStatus: 200,
      outcome: "already-paid",
      fanOut: false,
    });
  });

  it("fans out to GHL when an approved payment flips a fresh sale to paid", () => {
    const r = decideWebhookOutcome({
      signatureValid: true,
      type: "payment",
      dataId: "1",
      paymentApproved: true,
      externalReference: "VB-1",
      saleUpdated: true,
    });
    expect(r).toEqual({ httpStatus: 200, outcome: "fan-out", fanOut: true });
  });
});
