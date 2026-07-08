import { describe, it, expect } from "vitest";
import { safeInternalPath } from "../src/pages/InvitationPage";

describe("safeInternalPath — open-redirect guard", () => {
  it("accepts a plain internal path", () => {
    expect(safeInternalPath("/treasure")).toBe("/treasure");
    expect(safeInternalPath("/treasure/123?ref=x")).toBe("/treasure/123?ref=x");
  });

  it("rejects protocol-relative hosts", () => {
    expect(safeInternalPath("//evil.com")).toBe("/treasure");
  });

  it("rejects absolute URLs with a scheme", () => {
    expect(safeInternalPath("https://evil.com")).toBe("/treasure");
    expect(safeInternalPath("javascript://alert(1)")).toBe("/treasure");
  });

  it("rejects paths that don't start with a slash", () => {
    expect(safeInternalPath("treasure")).toBe("/treasure");
    expect(safeInternalPath("evil.com")).toBe("/treasure");
  });

  it("falls back to the default for missing/empty values", () => {
    expect(safeInternalPath(null)).toBe("/treasure");
    expect(safeInternalPath("")).toBe("/treasure");
  });
});
