/**
 * Espejo local de las fotos de producto que viven en Drive.
 * ------------------------------------------------------------------
 * `jewelry-visualizer.mjs prepare` baja UNA foto por producto (`hero.jpg`, la
 * primera imagen de la carpeta) y solo para los items que entran al manifest.
 * Este script baja **todas** las imágenes de **todos** los productos que tengan
 * media en Drive, para que el resto del trabajo local no dependa de la red ni
 * del proxy de prod.
 *
 *   docs/Visualizer/work/<item>/fotos/<nombre-original>.jpg
 *   docs/Visualizer/work/<item>/fotos/index.json
 *
 * `hero.jpg` y `hero-clean.jpg` siguen donde estaban, un nivel arriba: son otra
 * cosa (la foto elegida como referencia y su versión limpia para la card de
 * Pencil). Acá no se toca ninguno de los dos.
 *
 * Solo imágenes: los .MOV del catálogo pesan 20-30 MB cada uno y no sirven para
 * lectura visual. Se listan en el index.json como `skipped` para dejar rastro.
 *
 * Sin credenciales locales de Google: todo sale por el proxy de prod
 * (`/api/serve-drive-image`), igual que `prepare`. Los HEIC llegan convertidos
 * a JPEG por el proxy, y cuando ese fallback falla los rescata `sips`
 * (ver scripts/lib/heic.mjs).
 *
 * Es idempotente: salta lo que ya está en disco salvo `--force`.
 *
 * Uso:
 *   node scripts/visualizer-mirror-fotos.mjs [--items 233,311] [--dry-run]
 *                                            [--force] [--concurrency 6]
 *                                            [--base https://tierramadre.app]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcodeHeicInPlace, sniffImageExt } from './lib/image.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(REPO_ROOT, 'docs', 'Visualizer', 'work');
const DEFAULT_BASE = 'https://tierramadre.app';

// ── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (!tok.startsWith('--')) continue;
    const eq = tok.indexOf('=');
    if (eq !== -1) {
      flags[tok.slice(2, eq)] = tok.slice(eq + 1);
      continue;
    }
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags[tok.slice(2)] = next;
      i++;
    } else {
      flags[tok.slice(2)] = true;
    }
  }
  return flags;
}

const FLAGS = parseArgs(process.argv.slice(2));
const has = (n) => FLAGS[n] === true || FLAGS[n] === 'true';
const BASE = String(FLAGS.base || DEFAULT_BASE).replace(/\/$/, '');
const DRY_RUN = has('dry-run');
const FORCE = has('force');
const CONCURRENCY = Math.max(1, parseInt(FLAGS.concurrency || '6', 10) || 6);
const ONLY_ITEMS = FLAGS.items
  ? String(FLAGS.items)
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isInteger(n) && n > 0)
  : null;

async function fetchJson(url) {
  const resp = await fetch(url);
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`GET ${url} → ${resp.status} ${body.slice(0, 160)}`);
  }
  return resp.json();
}

/**
 * Base del nombre local: se conserva el nombre de Drive sin extensión, que es lo
 * que permite cruzar una foto local con la de Drive de un vistazo.
 */
function localBaseName(driveName) {
  return String(driveName || 'foto')
    .replace(/[/\\]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.[^.]+$/, '');
}

/** Los productos que hoy tienen media en Drive, según el índice de thumbnails. */
async function listItemsWithMedia() {
  const json = await fetchJson(`${BASE}/api/get-batch-thumbnails`);
  const thumbs = json.thumbnails || json.data?.thumbnails || {};
  return Object.keys(thumbs)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .sort((a, b) => a - b);
}

async function mirrorItem(item) {
  const listing = await fetchJson(
    `${BASE}/api/get-drive-images?itemNumber=${item}`,
  );
  const media = listing.images || listing.data?.images || [];
  const images = media.filter((m) => m.type === 'image');
  const videos = media.filter((m) => m.type !== 'image');

  const fotosDir = path.join(WORK_DIR, String(item), 'fotos');
  const entries = [];
  const broken = [];
  let downloaded = 0;
  let skipped = 0;

  for (const img of images) {
    // La extensión final sale del contenido, no del nombre en Drive, y eso solo
    // se sabe después de bajar los bytes. Para saltar alcanza con que exista ya
    // algún archivo con esta base, sea cual sea su extensión.
    const base = localBaseName(img.name);
    const existing = fs.existsSync(fotosDir)
      ? fs.readdirSync(fotosDir).find((f) => f.replace(/\.[^.]+$/, '') === base)
      : undefined;

    if (existing && !FORCE) {
      skipped++;
      entries.push({
        fileId: img.id,
        driveName: img.name,
        file: existing,
        mimeType: img.mimeType,
      });
      continue;
    }

    if (DRY_RUN) {
      downloaded++;
      entries.push({
        fileId: img.id,
        driveName: img.name,
        file: `${base}.?`,
        mimeType: img.mimeType,
      });
      continue;
    }

    fs.mkdirSync(fotosDir, { recursive: true });
    const url = `${BASE}/api/serve-drive-image?fileId=${img.id}&size=original`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`descarga ${img.id} → ${resp.status}`);

    const tmp = path.join(fotosDir, `.tmp-${img.id}`);
    fs.writeFileSync(tmp, Buffer.from(await resp.arrayBuffer()));
    // El proxy suele entregar los HEIC ya convertidos a JPEG; sips cubre el
    // resto. Después de eso, la extensión sale de los bytes que quedaron.
    const wasHeic = transcodeHeicInPlace(tmp);
    const ext = sniffImageExt(tmp);
    if (!ext) {
      // Hay fotos subidas a Drive con 0 bytes (el proxy igual responde 200 con
      // content-type image/jpeg). Se anotan y se sigue: una foto podrida no
      // puede costarle al producto las otras nueve.
      const size = fs.statSync(tmp).size;
      fs.unlinkSync(tmp);
      broken.push({
        fileId: img.id,
        driveName: img.name,
        bytes: size,
        reason: size === 0 ? 'archivo vacío en Drive' : 'formato no reconocido',
      });
      continue;
    }
    const finalName = `${base}.${ext}`;
    fs.renameSync(tmp, path.join(fotosDir, finalName));

    downloaded++;
    entries.push({
      fileId: img.id,
      driveName: img.name,
      file: finalName,
      mimeType: img.mimeType,
      convertedFromHeic: wasHeic || undefined,
    });
  }

  if (!DRY_RUN && (entries.length || broken.length)) {
    fs.mkdirSync(fotosDir, { recursive: true });
    fs.writeFileSync(
      path.join(fotosDir, 'index.json'),
      JSON.stringify(
        {
          item,
          folderId: listing.folderId || null,
          syncedAt: new Date().toISOString(),
          source: BASE,
          images: entries,
          broken,
          skipped: videos.map((v) => ({
            fileId: v.id,
            driveName: v.name,
            mimeType: v.mimeType,
            reason: 'video',
          })),
        },
        null,
        2,
      ) + '\n',
    );
  }

  return { item, downloaded, skipped, videos: videos.length, broken };
}

// ── main ─────────────────────────────────────────────────────────────────────
console.log(`\n→ Fuente: ${BASE}`);
const items = ONLY_ITEMS || (await listItemsWithMedia());
console.log(
  `→ ${items.length} productos con media${ONLY_ITEMS ? ' (--items)' : ''}${DRY_RUN ? ' · DRY-RUN' : ''}\n`,
);

let done = 0;
let totalDownloaded = 0;
let totalSkipped = 0;
let totalVideos = 0;
const failures = [];
const brokenFiles = [];
let cursor = 0;

async function worker() {
  while (cursor < items.length) {
    const item = items[cursor++];
    try {
      const r = await mirrorItem(item);
      totalDownloaded += r.downloaded;
      totalSkipped += r.skipped;
      totalVideos += r.videos;
      for (const b of r.broken) brokenFiles.push({ item, ...b });
      done++;
      if (r.downloaded || r.broken.length)
        console.log(
          `  ✓ ${String(item).padEnd(4)} ${r.downloaded} nuevas` +
            (r.skipped ? ` · ${r.skipped} ya estaban` : '') +
            (r.broken.length ? ` · ${r.broken.length} ilegibles` : ''),
        );
    } catch (err) {
      // Un producto que falla no puede tumbar el espejo entero.
      failures.push({ item, message: err.message });
      console.warn(`  ! ${item}: ${err.message}`);
    }
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker),
);

console.log(
  `\n${DRY_RUN ? '(dry-run) ' : ''}${totalDownloaded} imágenes ${DRY_RUN ? 'a bajar' : 'bajadas'} · ` +
    `${totalSkipped} ya estaban · ${totalVideos} videos omitidos · ${done}/${items.length} productos`,
);
if (brokenFiles.length) {
  console.log(
    `\n${brokenFiles.length} fotos ilegibles en Drive (quedaron anotadas en el index.json de su producto):`,
  );
  for (const b of brokenFiles)
    console.log(`  ${b.item}: ${b.driveName} — ${b.reason}`);
}
if (failures.length) {
  console.log(`\n${failures.length} productos con error:`);
  for (const f of failures) console.log(`  ${f.item}: ${f.message}`);
  process.exitCode = 1;
}
console.log(`\nDestino: docs/Visualizer/work/<item>/fotos/\n`);
