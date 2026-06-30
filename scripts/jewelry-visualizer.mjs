/**
 * Batch Jewelry Visualizer — Drive I/O helper
 * ------------------------------------------------------------------
 * The Pencil half of this pipeline (generate + review) is driven by the
 * agent through the Pencil MCP; Pencil has no headless API, so this Node
 * script only does the parts Node can do: fetch the newest emeralds + their
 * specs, download the real photos locally for the Pencil board, and (after
 * approval) upload the approved render into each product's Drive carousel.
 *
 * Working tree (paths chosen so Pencil image fills resolve relative to the
 * .pen file at docs/Visualizer/visualizer.pen):
 *   docs/Visualizer/work/manifest.json
 *   docs/Visualizer/work/<item>/hero.jpg     → Pencil fill "./work/<item>/hero.jpg"
 *   docs/Visualizer/exports/<item>.png        → approved card export (you create this)
 *
 * Commands:
 *   prepare  [--limit 5] [--items 12,15] [--scenes ring-woman] [--metal gold]
 *            [--base https://tierramadre.app] [--include-jewelry] [--dry-run] [--force]
 *   prompt   --item 18 --visual "<your read of the photo>" [--scene ring-woman] [--metal gold]
 *   approve  --item 18 [--node <pencilNodeId>] [--export docs/Visualizer/exports/18.png]
 *   reject   --item 18
 *   upload   [--items 18] [--dry-run] [--force]
 *   status   [--items 18]          (print manifest summary)
 *
 * No local Google credentials needed: downloads use the prod serve-drive-image
 * proxy and uploads go through the prod /api/media-upload endpoint (which holds
 * the working OAuth). Point at another deployment with --base.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildVisualizerPrompt,
  buildRealSizeCue,
  parseMeasures,
} from "../api/_lib/jewelry-prompt.js";

// ── Paths ───────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const VISUALIZER_DIR = path.join(REPO_ROOT, "docs", "Visualizer");
const WORK_DIR = path.join(VISUALIZER_DIR, "work");
const EXPORTS_DIR = path.join(VISUALIZER_DIR, "exports");
const MANIFEST_PATH = path.join(WORK_DIR, "manifest.json");

const DEFAULT_BASE = "https://tierramadre.app";
const DEFAULT_SCENE = "ring-woman";
const DEFAULT_METAL = "gold";
const REFERENCIAL_RE = /referencial|visualizacion-ia|vis-ia/i;

// ── CLI parsing ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const eq = tok.indexOf("=");
      if (eq !== -1) {
        args.flags[tok.slice(2, eq)] = tok.slice(eq + 1);
      } else {
        const key = tok.slice(2);
        const next = argv[i + 1];
        if (next && !next.startsWith("--")) {
          args.flags[key] = next;
          i++;
        } else {
          args.flags[key] = true;
        }
      }
    } else {
      args._.push(tok);
    }
  }
  return args;
}

const argv = parseArgs(process.argv.slice(2));
const COMMAND = argv._[0];
const FLAGS = argv.flags;
const flag = (name, dflt) => (FLAGS[name] !== undefined ? FLAGS[name] : dflt);
const has = (name) => FLAGS[name] === true || FLAGS[name] === "true";

// ── Small utils ───────────────────────────────────────────────────────────────
function die(msg) {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

function parseItemList(value) {
  if (!value || value === true) return null;
  return String(value)
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`GET ${url} → ${resp.status} ${body.slice(0, 200)}`);
  }
  return resp.json();
}

function ensureDirs() {
  fs.mkdirSync(WORK_DIR, { recursive: true });
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
}

function saveManifest(manifest) {
  ensureDirs();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function getManifestItem(manifest, item) {
  if (!manifest) die("No manifest. Run `prepare` first.");
  const found = (manifest.items || []).find((it) => it.item === item);
  if (!found)
    die(`Item ${item} not in manifest. Run \`prepare\` for it first.`);
  return found;
}

// Fields the agent / upload step fill in — preserved across re-runs of `prepare`.
const PRESERVED_FIELDS = [
  "visualRead",
  "promptUsed",
  "status",
  "approvedNodeId",
  "exportedPath",
  "uploadedFileId",
  "uploadedFileName",
];

/** Catalog names can carry stray newlines/leading spaces ("\nRayito \nde Luz "). */
function normalizeName(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Clean "L x W x D mm" display from parsed mm (empty when none). */
function measuresToDisplay(parsed) {
  const dims = [parsed.lengthMm, parsed.widthMm, parsed.depthMm].filter(
    (n) => n != null,
  );
  return dims.length ? dims.join(" x ") : "";
}

/** Whether an item has enough spec to drive a dimension-faithful prompt. */
function specCompleteness(t) {
  const m = parseMeasures(t.medidasValores);
  const caratNum = parseFloat(String(t.peso ?? "").replace(",", "."));
  const hasMeasures = m.lengthMm != null;
  const hasCarat = caratNum > 0;
  return { hasMeasures, hasCarat, usable: hasMeasures || hasCarat };
}

/** Morralla / polished cabochon (a "stone", not a faceted gem). */
function isMorralla(t) {
  return /morralla|cabuj[óo]n|cabochon|tumbled|pulid/i.test(
    `${t.talla || ""} ${t.calidad || ""}`,
  );
}

// ============================================================================
// prepare
// ============================================================================
async function cmdPrepare() {
  const base = String(flag("base", DEFAULT_BASE)).replace(/\/$/, "");
  const limit = parseInt(flag("limit", "5"), 10) || 5;
  const explicitItems = parseItemList(flag("items"));
  const scenes = String(flag("scenes", DEFAULT_SCENE))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const metal = String(flag("metal", DEFAULT_METAL));
  const includeJewelry = has("include-jewelry");
  const requireMeasures = has("require-measures");
  const includeMorralla = has("include-morralla");
  const reset = has("reset");
  const dryRun = has("dry-run");
  const force = has("force");

  console.log(`\n→ Source: ${base}`);

  // Existing manifest (for advancing through the catalog + carrying agent fields).
  const prevManifest = reset ? null : loadManifest();
  const prevItems = prevManifest?.items || [];
  const prevByItem = new Map(prevItems.map((it) => [it.item, it]));
  const doneNums = new Set(prevItems.map((it) => it.item));

  // 1) Specs for the whole catalog.
  const treasureJson = await fetchJson(`${base}/api/get-treasure-sheets`);
  const treasure = treasureJson.treasure || treasureJson.data?.treasure || [];
  if (!treasure.length) die("get-treasure-sheets returned no items.");
  const byItem = new Map(treasure.map((t) => [Number(t.item), t]));

  // 2) Decide which items.
  let targetNumbers;
  if (explicitItems) {
    targetNumbers = explicitItems;
    console.log(`→ Explicit items: ${targetNumbers.join(", ")}`);
  } else {
    const newestJson = await fetchJson(
      `${base}/api/get-newest-products?limit=50`,
    );
    const newest = newestJson.products || newestJson.data?.products || [];
    // Candidate order: truest-newest (by photo date) first, then the rest of
    // the catalog by item number descending — so batches walk newest→older
    // and `prepare` can advance across the whole catalog, not just newest-50.
    const newestNums = newest.map((p) => Number(p.itemNumber));
    const restDesc = treasure.map((t) => Number(t.item)).sort((a, b) => b - a);
    const seenC = new Set();
    const candidates = [...newestNums, ...restDesc].filter((n) => {
      if (!n || seenC.has(n)) return false;
      seenC.add(n);
      return true;
    });

    const picked = [];
    const skips = { done: 0, jewelry: 0, morralla: 0, nospec: 0 };
    for (const n of candidates) {
      const t = byItem.get(n);
      if (!t) continue;
      if (doneNums.has(n)) {
        skips.done++;
        continue;
      }
      if (!includeJewelry && t.isJewelry) {
        skips.jewelry++;
        continue;
      }
      if (!includeMorralla && isMorralla(t)) {
        skips.morralla++;
        continue;
      }
      const sc = specCompleteness(t);
      if (requireMeasures ? !sc.hasMeasures : !sc.usable) {
        skips.nospec++;
        continue;
      }
      picked.push(n);
      if (picked.length >= limit) break;
    }
    targetNumbers = picked;
    console.log(
      `→ Next faceted ${includeJewelry ? "" : "loose "}gems with ${requireMeasures ? "measures" : "specs"} (limit ${limit}): ${targetNumbers.join(", ") || "(none)"}`,
    );
    console.log(
      `  (${doneNums.size} already in manifest; skipped ${skips.done} done · ${skips.jewelry} jewelry · ${skips.morralla} morralla · ${skips.nospec} no-spec)`,
    );
  }
  if (!targetNumbers.length) die("No matching items to prepare.");

  const items = [];
  for (const num of targetNumbers) {
    const t = byItem.get(num);
    if (!t) {
      console.warn(`  ! item ${num} not found in catalog — skipping`);
      continue;
    }
    if (t.isJewelry && !includeJewelry && explicitItems) {
      console.warn(`  ! item ${num} is already jewelry (included by --items)`);
    }
    if (explicitItems && !specCompleteness(t).usable) {
      console.warn(
        `  ! item ${num} has no measures or carat — the prompt can't be dimension-precise`,
      );
    }

    // Drive media for this item (folderId + ordered file list + hero).
    const imgJson = await fetchJson(
      `${base}/api/get-drive-images?itemNumber=${num}`,
    );
    const images = imgJson.images || imgJson.data?.images || [];
    const folderId = imgJson.folderId || imgJson.data?.folderId || null;
    const existingFiles = images.map((im) => ({
      id: im.id,
      name: im.name,
      type: im.type,
    }));
    const hero = images.find((im) => im.type === "image") || null;
    const noPhoto = !hero;
    const hasReferencialAlready = existingFiles.some((f) =>
      REFERENCIAL_RE.test(f.name || ""),
    );

    const heroLocalPath = `./work/${num}/hero.jpg`;
    const heroAbsPath = path.join(WORK_DIR, String(num), "hero.jpg");

    // Download the hero bytes via the prod image proxy (no local OAuth needed).
    if (!noPhoto && !dryRun) {
      if (!folderId) console.warn(`  ! item ${num}: no folderId from API`);
      fs.mkdirSync(path.dirname(heroAbsPath), { recursive: true });
      const imgUrl = `${base}/api/serve-drive-image?fileId=${hero.id}&size=large`;
      const imgResp = await fetch(imgUrl);
      if (!imgResp.ok)
        throw new Error(`download hero ${hero.id} → ${imgResp.status}`);
      fs.writeFileSync(heroAbsPath, Buffer.from(await imgResp.arrayBuffer()));
    }

    const nombre = normalizeName(t.nombre);
    const measuresParsed = parseMeasures(t.medidasValores);
    const measuresDisplay = measuresToDisplay(measuresParsed);
    const specSpecs = {
      cut: t.talla,
      measures: measuresDisplay, // clean "L x W x D", not raw newline blob
      carats: t.peso,
      color: t.color,
      quality: t.calidad,
    };
    const realSizeCue = buildRealSizeCue({
      measures: measuresDisplay,
      carats: t.peso,
    });
    const promptTemplate = buildVisualizerPrompt({
      scene: scenes[0],
      metal,
      specs: specSpecs,
      productName: nombre,
      visualRead: "__VISUAL_READ__",
    });

    const prev = prevByItem.get(num);
    const carried = {};
    if (prev && !force) {
      for (const f of PRESERVED_FIELDS) {
        if (prev[f] !== undefined && prev[f] !== "" && prev[f] !== null)
          carried[f] = prev[f];
      }
    }

    items.push({
      item: num,
      nombre,
      categoria: t.categoria || "",
      fechaIngreso: t.fechaIngreso || "",
      isJewelry: !!t.isJewelry,
      estado: t.estado || "",
      talla: t.talla || "",
      color: t.color || "",
      calidad: t.calidad || "",
      peso: t.peso,
      medidas: t.medidas || "",
      medidasValores: t.medidasValores || "",
      measuresParsed,
      measuresDisplay,
      realSizeCue,
      folderId,
      folderName: imgJson.folderName || `${num} - ${nombre}`,
      heroFileId: hero?.id || null,
      heroFileName: hero?.name || null,
      heroLocalPath,
      heroAbsPath,
      noPhoto,
      existingFiles,
      hasReferencialAlready,
      scenes,
      metal,
      promptTemplate,
      // agent-filled (carried over from a previous run when present):
      visualRead: carried.visualRead || "",
      promptUsed: carried.promptUsed || "",
      status: carried.status || "pending",
      approvedNodeId: carried.approvedNodeId || "",
      exportedPath: carried.exportedPath || "",
      uploadedFileId: carried.uploadedFileId || "",
      uploadedFileName: carried.uploadedFileName || "",
    });

    const tag = noPhoto
      ? "NO PHOTO"
      : hasReferencialAlready
        ? "has referencial"
        : "ok";
    console.log(
      `  • #${num} ${nombre} — ${t.talla || "?"} · ${t.peso || "?"}ct · ${measuresDisplay || "?"}mm · ${t.color || "?"} · ${t.calidad || "?"}  [${tag}]`,
    );
  }

  if (dryRun) {
    console.log(`\n(dry-run) Would add ${items.length} items to manifest.\n`);
    return;
  }

  // Merge: keep existing items (minus any re-selected), append the new batch.
  const targetSet = new Set(targetNumbers);
  const mergedItems = reset
    ? items
    : [...prevItems.filter((it) => !targetSet.has(it.item)), ...items];

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: base,
    defaults: { scenes, metal },
    items: mergedItems,
  };
  saveManifest(manifest);
  console.log(
    `\n✓ Added ${items.length} (manifest now ${mergedItems.length}) → ${path.relative(REPO_ROOT, MANIFEST_PATH)}`,
  );
  console.log(
    `  Next: Read each docs/Visualizer/work/<item>/hero.jpg, then \`prompt --item <n> --visual "..."\`\n`,
  );
}

// ============================================================================
// prompt
// ============================================================================
async function cmdPrompt() {
  const item = parseInt(flag("item"), 10);
  if (!item) die("prompt requires --item <number>");
  const manifest = loadManifest();
  const it = getManifestItem(manifest, item);

  // Reuse the stored visual read when --visual is omitted, so prompts can be
  // regenerated with an updated builder without re-reading every photo.
  const visualFlag = flag("visual");
  const visualRead =
    typeof visualFlag === "string" ? visualFlag : it.visualRead || "";
  if (!visualRead) {
    console.warn(
      "! No --visual and no stored visualRead — fidelity to the real stone depends on it.",
    );
  }
  const scene = String(flag("scene", it.scenes?.[0] || DEFAULT_SCENE));
  const metal = String(flag("metal", it.metal || DEFAULT_METAL));
  // --cut overrides a misleading catalog talla (e.g. a trapiche filed as "Corazón").
  const cut =
    typeof flag("cut") === "string" ? flag("cut") : it.cutOverride || it.talla;
  // PAR lots → render two matched stones (auto-detected, or --pair / --no-pair; stored flag persists).
  const autoPair =
    it.pair === true || /\bpar\b/i.test(`${it.nombre || ""} ${it.talla || ""}`);
  const pair = has("no-pair") ? false : has("pair") ? true : autoPair;

  const prompt = buildVisualizerPrompt({
    scene,
    metal,
    pair,
    specs: {
      cut,
      measures: it.measuresDisplay || "",
      carats: it.peso,
      color: it.color,
      quality: it.calidad,
    },
    productName: it.nombre,
    visualRead,
  });

  if (!has("dry-run")) {
    if (visualRead) it.visualRead = visualRead;
    it.promptUsed = prompt;
    it.pair = pair;
    if (typeof flag("cut") === "string") it.cutOverride = flag("cut");
    if (flag("scene")) it.scenes = [scene];
    saveManifest(manifest);
  }

  console.log(
    `\n===== PROMPT  #${item} ${it.nombre}  (${scene} · ${metal}) =====`,
  );
  console.log(prompt);
  console.log(`===== END PROMPT =====\n`);
}

// ============================================================================
// approve / reject
// ============================================================================
function cmdApprove() {
  const item = parseInt(flag("item"), 10);
  if (!item) die("approve requires --item <number>");
  const manifest = loadManifest();
  const it = getManifestItem(manifest, item);

  it.status = "approved";
  if (typeof flag("node") === "string") it.approvedNodeId = flag("node");
  const exp = flag("export");
  it.exportedPath =
    typeof exp === "string"
      ? exp
      : path.relative(REPO_ROOT, path.join(EXPORTS_DIR, `${item}.png`));

  const abs = path.resolve(REPO_ROOT, it.exportedPath);
  if (!fs.existsSync(abs))
    console.warn(`! exported file not found yet: ${it.exportedPath}`);

  saveManifest(manifest);
  console.log(`✓ #${item} approved → ${it.exportedPath}`);
}

function cmdReject() {
  const item = parseInt(flag("item"), 10);
  if (!item) die("reject requires --item <number>");
  const manifest = loadManifest();
  const it = getManifestItem(manifest, item);
  it.status = "rejected";
  saveManifest(manifest);
  console.log(`✓ #${item} rejected`);
}

// ============================================================================
// upload
// ============================================================================
// Uploads via the prod /api/media-upload endpoint, which holds the working
// OAuth credentials (the local refresh token may be expired). `fileName` is
// honored by media-upload so we control carousel order + the referencial label.
async function postUploadToDrive(base, folderId, absPath, fileName) {
  const bytes = fs.readFileSync(absPath);
  const form = new FormData();
  form.append("folderId", folderId);
  form.append("fileName", fileName);
  form.append("file", new Blob([bytes], { type: "image/png" }), fileName);

  const resp = await fetch(`${base}/api/media-upload`, {
    method: "POST",
    body: form,
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok || !json.files?.[0]?.id) {
    throw new Error(
      `media-upload ${resp.status}: ${json.error || JSON.stringify(json).slice(0, 200)}`,
    );
  }
  return {
    fileId: json.files[0].id,
    fileName: json.files[0].fileName || fileName,
  };
}

async function cmdUpload() {
  const base = String(flag("base", DEFAULT_BASE)).replace(/\/$/, "");
  const onlyItems = parseItemList(flag("items"));
  const dryRun = has("dry-run");
  const force = has("force");

  const manifest = loadManifest();
  if (!manifest) die("No manifest. Run `prepare` first.");

  let targets = manifest.items.filter((it) => it.status === "approved");
  if (onlyItems) targets = targets.filter((it) => onlyItems.includes(it.item));
  if (!targets.length) die("No approved items to upload.");

  for (const it of targets) {
    const reasonSkip =
      (it.uploadedFileId && !force && "already uploaded") ||
      (it.hasReferencialAlready &&
        !force &&
        "folder already has a referencial") ||
      (!it.folderId && "missing folderId") ||
      (!it.exportedPath && "missing exportedPath");
    if (reasonSkip) {
      console.log(`  • #${it.item} skip — ${reasonSkip}`);
      continue;
    }

    const absExport = path.resolve(REPO_ROOT, it.exportedPath);
    if (!fs.existsSync(absExport)) {
      console.warn(
        `  • #${it.item} skip — export not found: ${it.exportedPath}`,
      );
      continue;
    }

    const scene = it.scenes?.[0] || DEFAULT_SCENE;
    const fileName = `zz-visualizacion-referencial-ia-${it.item}-${scene}-${Date.now()}.png`;

    if (dryRun) {
      console.log(
        `  • #${it.item} would upload ${it.exportedPath} → ${it.folderName}/${fileName}`,
      );
      continue;
    }

    const uploaded = await postUploadToDrive(
      base,
      it.folderId,
      absExport,
      fileName,
    );
    it.uploadedFileId = uploaded.fileId;
    it.uploadedFileName = uploaded.fileName;
    saveManifest(manifest);
    console.log(
      `  ✓ #${it.item} uploaded ${uploaded.fileName} (${uploaded.fileId})`,
    );

    // Verify carousel order: hero still first, render last.
    try {
      const imgJson = await fetchJson(
        `${base}/api/get-drive-images?itemNumber=${it.item}`,
      );
      const images = imgJson.images || imgJson.data?.images || [];
      const names = images.map((im) => im.name);
      const heroStillFirst = images[0]?.id === it.heroFileId;
      const renderLast = names[names.length - 1] === fileName;
      console.log(
        `    order: hero-first=${heroStillFirst} render-last=${renderLast}`,
      );
      console.log(`    [${names.join(", ")}]`);
      if (!heroStillFirst)
        console.warn(
          `    ! hero is no longer first for #${it.item} — check filenames`,
        );
    } catch (e) {
      console.warn(`    (verify skipped: ${e.message})`);
    }
  }
  console.log("");
}

// ============================================================================
// status
// ============================================================================
function cmdStatus() {
  const manifest = loadManifest();
  if (!manifest) die("No manifest. Run `prepare` first.");
  const onlyItems = parseItemList(flag("items"));
  console.log(
    `\nManifest: ${manifest.items.length} items (from ${manifest.baseUrl})\n`,
  );
  for (const it of manifest.items) {
    if (onlyItems && !onlyItems.includes(it.item)) continue;
    const flags = [
      it.noPhoto ? "NO-PHOTO" : "",
      it.visualRead ? "read" : "",
      it.exportedPath ? "exported" : "",
      it.uploadedFileId ? "UPLOADED" : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(
      `  #${it.item} ${String(it.status).padEnd(9)} ${it.nombre}  ${flags}`,
    );
  }
  console.log("");
}

// ============================================================================
// main
// ============================================================================
const COMMANDS = {
  prepare: cmdPrepare,
  prompt: cmdPrompt,
  approve: cmdApprove,
  reject: cmdReject,
  upload: cmdUpload,
  status: cmdStatus,
};

const run = COMMANDS[COMMAND];
if (!run) {
  console.log(
    `\nUsage: node scripts/jewelry-visualizer.mjs <command> [flags]\n\n` +
      `Commands: ${Object.keys(COMMANDS).join(", ")}\n` +
      `See the header of this file for flags.\n`,
  );
  process.exit(COMMAND ? 1 : 0);
}

run().catch((e) => {
  console.error("\n✖", e.stack || e.message);
  process.exit(1);
});
