// scripts/analyze-conversations.ts
//
// READ-ONLY. Mines the last 30 days of GHL conversations, extracts funnel
// signals via LLM, writes dataset.json + report.md. Imports ghl-read only —
// never the writer module. See docs/superpowers/specs/2026-07-02-ghl-conversation-analysis-backfill-design.md
//
// Usage:
//   npx tsx scripts/analyze-conversations.ts            # full 30-day window
//   npx tsx scripts/analyze-conversations.ts --limit 10 # sample
// Requires: GHL_TOKEN, GHL_LOCATION_ID in .env.local

import { mkdirSync, writeFileSync } from "node:fs";
import * as dotenv from "dotenv";
import {
  searchConversations,
  getConversationMessages,
  type GhlReadConfig,
} from "../api/_lib/ghl-read.js";
import { renderTranscript } from "./lib/transcript.js";
import { extractSignals } from "./lib/llm-extract.js";
import type { ExtractionRow } from "./lib/types.js";

dotenv.config({ path: ".env.local" });

const token = process.env.GHL_TOKEN;
const locationId = process.env.GHL_LOCATION_ID;
if (!token || !locationId)
  throw new Error("GHL_TOKEN and GHL_LOCATION_ID required in .env.local");
const cfg: GhlReadConfig = { token, locationId };

const args = process.argv.slice(2);
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const LIMIT = limitArg ? Number(limitArg) : Infinity;
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const RUNS_DIR = "scripts/.analysis-runs";

async function main() {
  const now = Date.now();
  console.log(
    `=== analyze-conversations (last 30d${Number.isFinite(LIMIT) ? `, limit ${LIMIT}` : ""}) ===`,
  );
  const convos = await searchConversations(cfg, {
    startDate: now - WINDOW_MS,
    endDate: now,
  });

  // Group conversations by contact.
  const byContact = new Map<string, { name?: string; ids: string[] }>();
  for (const c of convos) {
    const e = byContact.get(c.contactId) ?? { name: c.fullName, ids: [] };
    e.ids.push(c.id);
    if (!e.name) e.name = c.fullName;
    byContact.set(c.contactId, e);
  }

  const rows: ExtractionRow[] = [];
  let processed = 0;
  for (const [contactId, { name, ids }] of byContact) {
    if (processed >= LIMIT) break;
    try {
      const msgs = (
        await Promise.all(ids.map((id) => getConversationMessages(cfg, id)))
      )
        .flat()
        .sort((a, b) => (a.dateAdded < b.dateAdded ? -1 : 1));
      if (!msgs.length) continue;
      const transcript = renderTranscript(msgs);
      const signals = await extractSignals(transcript, {
        groqKey: process.env.GROQ_API_KEY ?? process.env.VITE_GROQ_API_KEY,
        gatewayKey: process.env.AI_GATEWAY_API_KEY,
      });
      rows.push({
        contactId,
        contactName: name,
        conversationId: ids[ids.length - 1],
        conversationIds: ids,
        channel: signals.__channel ?? "unknown",
        signals,
        tipo_interes_evidence: signals.__tipo_evidence,
      } as ExtractionRow);
      processed++;
      if (processed % 10 === 0)
        console.log(`  …${processed} contacts extracted`);
    } catch (err) {
      console.error(
        `  contact ${contactId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const ts = new Date(now).toISOString().replace(/[:.]/g, "-");
  const dir = `${RUNS_DIR}/${ts}`;
  mkdirSync(dir, { recursive: true });
  // Defense-in-depth: this tree holds real customer transcripts + PII
  // (Global Constraint: "Output dir scripts/.analysis-runs/<ts>/ is
  // gitignored"). Don't rely solely on the repo-root .gitignore entry —
  // drop a self-contained ignore-everything file so `git add -A`/`git add .`
  // can never sweep this up even if that entry is ever missing or reverted.
  writeFileSync(`${RUNS_DIR}/.gitignore`, "*\n");
  const dataset = {
    run: {
      window: "30d",
      generatedAt: new Date(now).toISOString(),
      model: "groq/llama-3.1-8b-instant",
      counts: { contacts: rows.length, conversations: convos.length },
    },
    rows,
  };
  writeFileSync(`${dir}/dataset.json`, JSON.stringify(dataset, null, 2));
  writeFileSync(`${dir}/report.md`, buildReport(dataset));
  console.log(
    `=== wrote ${dir}/dataset.json (${rows.length} rows) + report.md ===`,
  );
}

function buildReport(dataset: { rows: ExtractionRow[] }): string {
  const rows = dataset.rows;
  const dist = (pick: (r: ExtractionRow) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = pick(r) ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `- ${k}: ${n}`)
      .join("\n");
  };
  return [
    `# Conversation Analysis Report`,
    ``,
    `Contacts: ${rows.length}`,
    ``,
    `## tipo_interes`,
    dist((r) => r.signals.tipo_interes.value),
    ``,
    `## ocasión`,
    dist((r) => r.signals.ocasion.value),
    ``,
    `## canal`,
    dist((r) => r.channel),
    ``,
    `## outcome`,
    dist((r) => r.signals.outcome),
    ``,
    `## tipo_interes → categoría evidence`,
    ...rows
      .filter((r) => r.tipo_interes_evidence?.asked_for_plain)
      .map(
        (r) =>
          `- **${r.contactName ?? r.contactId}** (${r.signals.tipo_interes.value ?? "?"}): "${r.tipo_interes_evidence!.asked_for_plain}"`,
      ),
    ``,
    `## Low-confidence rows (review)`,
    ...rows
      .filter(
        (r) =>
          r.signals.tipo_interes.value &&
          r.signals.tipo_interes.confidence < 0.6,
      )
      .map(
        (r) =>
          `- ${r.contactName ?? r.contactId}: tipo_interes conf ${r.signals.tipo_interes.confidence}`,
      ),
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
