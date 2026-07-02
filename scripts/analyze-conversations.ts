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
import { coerceExtractionRow } from "./lib/normalize.js";
import {
  MIN_CONFIDENCE,
  type ExtractionRow,
  type Signal,
} from "./lib/types.js";

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
      // Validate/coerce the raw LLM `any` against live enums (spec step 6).
      // The coercer owns channel + tipo_evidence handling and never throws on a
      // malformed row.
      rows.push(
        coerceExtractionRow(signals, {
          contactId,
          contactName: name,
          conversationId: ids[ids.length - 1],
          conversationIds: ids,
        }),
      );
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
  // Every access below is defensive (?.) — a coerced row is always well-formed,
  // but the report must never be the thing that crashes a completed, paid run.
  const dist = (pick: (r: ExtractionRow) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = pick(r) ?? "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return (
      [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `- ${k}: ${n}`)
        .join("\n") || "- (sin datos)"
    );
  };

  const conf = (c: number | null | undefined) => (c ?? 0) >= MIN_CONFIDENCE;

  // Budget distribution, bucketed (COP).
  const budgetBucket = (v: number | null | undefined): string => {
    if (v == null) return "sin dato";
    if (v < 2_000_000) return "<2M";
    if (v < 5_000_000) return "2–5M";
    if (v < 10_000_000) return "5–10M";
    return ">10M";
  };

  // Funnel-state summary. `qualifiable` mirrors deriveTargetStageName's
  // "Calificado por IA" predicate exactly.
  const qualifiable = rows.filter((r) => {
    const s = r.signals;
    return (
      s?.tipo_interes?.value != null &&
      conf(s.tipo_interes.confidence) &&
      ((s?.presupuesto_cop?.value != null &&
        conf(s.presupuesto_cop.confidence)) ||
        (s?.ocasion?.value != null && conf(s.ocasion.confidence)))
    );
  }).length;
  const ghosted = rows.filter((r) => r.signals?.outcome === "fantasma").length;
  const askedForHuman = rows.filter(
    (r) => r.signals?.outcome === "pidio-humano",
  ).length;

  // Low-confidence review across ALL graded signals (was tipo_interes-only):
  // any graded signal with a non-null value but confidence < MIN_CONFIDENCE.
  const GRADED = [
    "tipo_interes",
    "presupuesto_cop",
    "ocasion",
    "ciudad",
    "conocimiento",
    "urgencia",
    "sentiment",
  ] as const;
  const lowConf = rows.flatMap((r) =>
    GRADED.flatMap((k) => {
      const sig = (r.signals as Record<string, Signal<unknown> | undefined>)?.[
        k
      ];
      return sig && sig.value != null && (sig.confidence ?? 0) < MIN_CONFIDENCE
        ? [`- ${r.contactName ?? r.contactId}: ${k} conf ${sig.confidence}`]
        : [];
    }),
  );

  return [
    `# Conversation Analysis Report`,
    ``,
    `Contacts: ${rows.length}`,
    ``,
    `## Funnel state`,
    `- Calificable por IA: ${qualifiable}`,
    `- Fantasma (ghosted): ${ghosted}`,
    `- Pidió humano (sin atender): ${askedForHuman}`,
    ``,
    `## tipo_interes`,
    dist((r) => r.signals?.tipo_interes?.value),
    ``,
    `## ocasión`,
    dist((r) => r.signals?.ocasion?.value),
    ``,
    `## presupuesto (COP)`,
    dist((r) => budgetBucket(r.signals?.presupuesto_cop?.value)),
    ``,
    `## sentiment`,
    dist((r) => r.signals?.sentiment?.value),
    ``,
    `## canal`,
    dist((r) => r.channel),
    ``,
    `## outcome`,
    dist((r) => r.signals?.outcome),
    ``,
    `## tipo_interes → categoría evidence`,
    ...rows
      .filter((r) => r.tipo_interes_evidence?.asked_for_plain)
      .map(
        (r) =>
          `- **${r.contactName ?? r.contactId}** (${r.signals?.tipo_interes?.value ?? "?"}): "${r.tipo_interes_evidence!.asked_for_plain}"`,
      ),
    ``,
    `## Low-confidence signals (review)`,
    ...lowConf,
  ].join("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
