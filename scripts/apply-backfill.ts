// scripts/apply-backfill.ts
//
// GUARDED WRITE. Reads a reviewed dataset.json and passively backfills EXISTING
// GHL contacts. Default DRY-RUN — requires --apply. Without --all-contacts,
// writes only to the 3 test contacts. See the design spec.
//
// Usage:
//   npx tsx scripts/apply-backfill.ts <dataset.json>                 # dry-run, 3 test contacts
//   npx tsx scripts/apply-backfill.ts <dataset.json> --apply         # write, 3 test contacts
//   npx tsx scripts/apply-backfill.ts <dataset.json> --apply --all-contacts   # write, everyone (typed confirm)
//   flags: --no-stage, --limit N
// Requires: GHL_TOKEN, GHL_LOCATION_ID in .env.local

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import * as dotenv from "dotenv";
import {
  getContact,
  getCustomFieldDefs,
  getPipelines,
  findContactOpportunity,
  searchConversations,
  type GhlReadConfig,
} from "../api/_lib/ghl-read.js";
import {
  updateContactFields,
  addTags,
  updateOpportunityStage,
  type GhlConfig,
} from "../api/_lib/ghl-client.js";
import { buildSettableStageMap } from "./lib/backfill-stage.js";
import { planContactWrites } from "./lib/apply-plan.js";
import type { ExtractionRow } from "./lib/types.js";

dotenv.config({ path: ".env.local" });
const token = process.env.GHL_TOKEN,
  locationId = process.env.GHL_LOCATION_ID;
if (!token || !locationId)
  throw new Error("GHL_TOKEN and GHL_LOCATION_ID required");
const readCfg: GhlReadConfig = { token, locationId };
const writeCfg: GhlConfig = { token, locationId };
const PIPELINE_ID = "u4MPXH2HdEFmU3vVqNdd";
const TEST_CONTACT_NAMES = [
  "Kevin Tres Toj",
  "Juan Ma Escobar",
  "Isa La Negra Vikinga",
];

const args = process.argv.slice(2);
// The dataset path is the first POSITIONAL token. Exclude the value that
// follows "--limit" so `--limit 10 dataset.json` doesn't resolve the path to
// "10" (regardless of flag order).
const limitFlagIdx = args.indexOf("--limit");
const limitValueIdx = limitFlagIdx >= 0 ? limitFlagIdx + 1 : -1;
const datasetPath = args.find(
  (a, i) => !a.startsWith("--") && i !== limitValueIdx,
);
const APPLY = args.includes("--apply");
const ALL = args.includes("--all-contacts");
const NO_STAGE = args.includes("--no-stage");
const limitArg = args.find((_, i) => args[i - 1] === "--limit");
const LIMIT = limitArg ? Number(limitArg) : Infinity;
if (!datasetPath) throw new Error("pass the dataset.json path");

async function confirm(q: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) =>
    rl.question(q, (a) => {
      rl.close();
      res(a.trim().toUpperCase() === "APLICAR");
    }),
  );
}

async function resolveTestContactIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (const name of TEST_CONTACT_NAMES) {
    // /conversations/search returns fullName; match exactly (case-insensitive).
    const found = (await searchConversations(readCfg, {})).filter(
      (c) => (c.fullName ?? "").toLowerCase() === name.toLowerCase(),
    );
    const unique = new Set(found.map((c) => c.contactId));
    if (unique.size !== 1)
      throw new Error(
        `test contact "${name}" resolved to ${unique.size} contacts — aborting`,
      );
    ids.add([...unique][0]);
  }
  return ids;
}

async function main() {
  const dataset = JSON.parse(readFileSync(datasetPath!, "utf8")) as {
    rows: ExtractionRow[];
  };
  // Only build (and validate) the settable stage map when stage writes are
  // enabled. Under --no-stage the opportunity lookup is skipped (opp = null) and
  // this map is never consulted, so a live stage-name/emoji mismatch must NOT be
  // able to throw here and abort field + tag backfill. --no-stage is the
  // documented escape hatch; keep it reachable.
  const settable = NO_STAGE
    ? new Map<string, { id: string; order: number }>()
    : buildSettableStageMap(
        (await getPipelines(readCfg)).find((p) => p.id === PIPELINE_ID)
          ?.stages ?? [],
      );
  const defs = await getCustomFieldDefs(readCfg);
  const idToKey = new Map(defs.map((d) => [d.id, d.fieldKey]));

  let rows = dataset.rows.filter((r) => r.contactId);
  if (!ALL) {
    const testIds = await resolveTestContactIds();
    rows = rows.filter((r) => testIds.has(r.contactId));
    console.log(`Scoped to ${rows.length} test-contact row(s).`);
  } else {
    console.log(
      `⚠️  --all-contacts: this will target ${rows.length} REAL contacts.`,
    );
    if (
      APPLY &&
      !(await confirm('Type "APLICAR" to write to all contacts: '))
    ) {
      console.log("Aborted.");
      return;
    }
  }
  if (Number.isFinite(LIMIT)) rows = rows.slice(0, LIMIT);

  console.log(
    `=== apply-backfill ${APPLY ? "APPLY" : "DRY-RUN"} · ${rows.length} contacts · stage ${NO_STAGE ? "off" : "on"} ===`,
  );
  let fieldW = 0,
    tagW = 0,
    stageW = 0;
  for (const row of rows) {
    try {
      const contact = await getContact(readCfg, row.contactId);
      const currentFieldsByKey: Record<string, unknown> = {};
      for (const cf of contact.customFields) {
        const k = idToKey.get(cf.id);
        if (k) currentFieldsByKey[k] = cf.value;
      }
      const opp = NO_STAGE
        ? null
        : await findContactOpportunity(readCfg, row.contactId, PIPELINE_ID);
      const plan = planContactWrites(row, {
        currentFieldsByKey,
        currentTags: contact.tags,
        currentStageId: opp?.pipelineStageId ?? null,
        settable,
      });

      const label = `${row.contactName ?? row.contactId}`;
      if (plan.fieldWrites.length) {
        console.log(
          `  ${label}: fields ${plan.fieldWrites.map((w) => w.key).join(", ")}`,
        );
        if (APPLY)
          await updateContactFields(writeCfg, row.contactId, plan.fieldWrites);
        fieldW += plan.fieldWrites.length;
      }
      if (plan.tags.length) {
        console.log(`  ${label}: tags ${plan.tags.join(", ")}`);
        if (APPLY) await addTags(writeCfg, row.contactId, plan.tags);
        tagW += plan.tags.length;
      }
      if (plan.stage) {
        console.log(`  ${label}: stage → ${plan.stage.stageId}`);
        if (APPLY)
          await updateOpportunityStage(writeCfg, opp!.id, plan.stage.stageId);
        stageW++;
      }
      if (!APPLY && (plan.fieldWrites.length || plan.tags.length || plan.stage))
        console.log(`    [DRY RUN — no writes]`);
    } catch (err) {
      console.error(
        `  contact ${row.contactId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(
    `=== ${APPLY ? "wrote" : "would write"} fields:${fieldW} tags:${tagW} stages:${stageW} ===`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
