import { describe, it, expect } from "vitest";
import { redactPII, renderTranscript } from "../scripts/lib/transcript";

describe("transcript", () => {
  it("redacts emails and phone numbers", () => {
    const out = redactPII("escríbeme a ana@correo.com o al +57 300 123 4567");
    expect(out).toContain("[EMAIL]");
    expect(out).toContain("[TEL]");
    expect(out).not.toContain("ana@correo.com");
    expect(out).not.toContain("4567");
  });
  it("renders role-tagged, redacted, last-N turns", () => {
    const msgs = Array.from({ length: 50 }, (_, i) => ({
      direction: i % 2 ? ("outbound" as const) : ("inbound" as const),
      body: `m${i}`,
    }));
    const out = renderTranscript(msgs, { maxTurns: 10 });
    expect(out.split("\n")).toHaveLength(10);
    expect(out).toContain("Cliente:");
    expect(out).toContain("Tierra Madre:");
    expect(out).not.toContain("m0"); // trimmed to last 10
  });
});
