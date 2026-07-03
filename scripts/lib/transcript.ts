// scripts/lib/transcript.ts
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// 7+ digit runs allowing spaces / + / - / parens — catches CO mobile & landline forms.
// NOTE: "." is intentionally EXCLUDED from the class. Colombian prices use dots as
// thousand-separators ("4.500.000", "$5.000.000"); phones use spaces/dashes/+/parens.
// Including "." gutted budget extraction by redacting prices as [TEL] before the LLM.
const PHONE_RE = /(\+?\d[\d\s()-]{6,}\d)/g;

export function redactPII(text: string): string {
  return text.replace(EMAIL_RE, "[EMAIL]").replace(PHONE_RE, "[TEL]");
}

export function renderTranscript(
  messages: { direction: "inbound" | "outbound"; body: string }[],
  opts: { maxTurns?: number } = {},
): string {
  const maxTurns = opts.maxTurns ?? 40;
  return messages
    .slice(-maxTurns)
    .map(
      (m) =>
        `${m.direction === "inbound" ? "Cliente" : "Tierra Madre"}: ${redactPII(m.body ?? "").trim()}`,
    )
    .join("\n");
}
