/**
 * Genera Certificados de Origen en lote, desde la terminal.
 *
 * Equivale a abrir /admin/fotosintesis/certificados, elegir una pieza, dejar que
 * el auto-encuadre acomode la foto y pulsar «Guardar al producto» — pero para N
 * ítems y sin tocar la interfaz. El arte NO se reimplementa: el harness de
 * `scripts/certificados/harness/` importa los componentes de producción
 * (CertPreview, certTemplates, photoAutoFit, exportCert) y los renderiza en un
 * Chromium headless, así que el PNG resultante son los mismos píxeles que
 * produciría un operador a mano.
 *
 * Dos fases, deliberadamente separadas: primero se renderiza a disco para poder
 * revisar el arte, y sólo después se sube y se enlaza. Producción no se toca
 * hasta que alguien miró los PNG.
 *
 * Sin `--items`, el barrido es del inventario COMPLETO: todo ítem que aún no
 * tenga `certificadoUrl`, del número de ítem más alto al más bajo (lo más
 * reciente primero). Nombrar ítems a mano es una orden explícita y por eso
 * ignora ese filtro — se regenera aunque ya tengan certificado.
 *
 *   node scripts/generar-certificados.mjs                  # pendientes → out/
 *   node scripts/generar-certificados.mjs --limit=25       # sólo los 25 más recientes
 *   node scripts/generar-certificados.mjs --items=264,278  # subconjunto explícito
 *   node scripts/generar-certificados.mjs --force          # incluye los ya certificados
 *   node scripts/generar-certificados.mjs --con-sin-foto   # incluye ítems sin foto
 *   node scripts/generar-certificados.mjs --rerender       # ignora los PNG en out/
 *   node scripts/generar-certificados.mjs --apply          # sube a Drive + enlaza
 *
 * Fuente de datos: deployment de PRODUCCIÓN (`npx convex run --prod`), no el dev
 * al que apunta .env.local.
 */

import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { execFile } from 'node:child_process';
import {
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  rm,
  stat,
} from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const HARNESS_CONFIG = resolve(here, 'certificados/harness/vite.config.mts');
const OUT_DIR = resolve(here, 'certificados/out');

const APP_ORIGIN = 'https://tierramadre.app';

/**
 * Categorías que NO reciben Certificado de Origen.
 *
 * Un certificado acredita la procedencia de una pieza; los insumos son materia
 * prima de taller — chatones, postes de arete, cuentas — comprados por bolsa y
 * sin origen que acreditar. Ojo: «Topitos» NO entra acá, pese al nombre parecido
 * a «Topos Planos»: esos son aretes terminados con nombre propio.
 */
const CATEGORIAS_SIN_CERTIFICADO = ['Insumo'];

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const FORCE = argv.includes('--force');
const CON_SIN_FOTO = argv.includes('--con-sin-foto');
const RERENDER = argv.includes('--rerender');
const CON_INSUMOS = argv.includes('--con-insumos');
const flagValue = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const itemsArg = flagValue('items');
/** Subconjunto explícito, o `null` = barrer todo el inventario pendiente. */
const ITEM_IDS = itemsArg
  ? itemsArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : null;
const limitArg = flagValue('limit');
const LIMIT = limitArg ? Number(limitArg) : null;
if (limitArg && (!Number.isInteger(LIMIT) || LIMIT <= 0)) {
  console.error(
    `--limit debe ser un entero positivo, no ${JSON.stringify(limitArg)}`,
  );
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Corre una función Convex contra PRODUCCIÓN y devuelve su salida cruda.
 *
 * La salida se redirige a un archivo en vez de leerse del pipe: el CLI de Convex
 * termina antes de vaciar stdout cuando está entubado, y devuelve un JSON
 * truncado en un punto arbitrario (se observó cortando a 8 KB y a 16 KB en la
 * misma consulta). Con redirección a disco la salida siempre llega completa.
 */
async function convexProdRaw(fn, args) {
  const dir = await mkdtemp(join(tmpdir(), 'tm-cert-'));
  const outFile = join(dir, 'out.json');
  // UNA sola ejecución: este helper también corre mutaciones, así que repetir el
  // comando duplicaría la escritura.
  const cmd =
    `npx convex run --prod ${JSON.stringify(fn)} ` +
    `${JSON.stringify(JSON.stringify(args))} > ${JSON.stringify(outFile)}`;
  try {
    await execFileAsync('sh', ['-c', cmd], { cwd: repoRoot });
    return await readFile(outFile, 'utf8');
  } catch (err) {
    throw new Error(`convex run ${fn}: ${err.stderr || err.message}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Devuelve el conjunto de itemId que YA tienen certificado en producción.
 *
 * Sale de un snapshot export y no de `products:list` por una razón concreta:
 * esa consulta proyecta `certificadoUrl` fuera del resultado a propósito, para
 * adelgazar el payload reactivo del admin (ver el comentario BANDWIDTH en
 * convex/products.ts). Leerlo de ahí devolvía `undefined` para todas las filas,
 * o sea "ninguna está certificada" — y el barrido habría vuelto a subir a Drive
 * los 368 certificados que ya existen, duplicando cada archivo.
 *
 * El export completo del deployment pesa ~140 KB y tarda ~3 s, así que la
 * verdad sale barata; el único costo es depender de `unzip`, presente en macOS
 * y en cualquier Linux de CI.
 */
async function itemsYaCertificados() {
  const dir = await mkdtemp(join(tmpdir(), 'tm-cert-snap-'));
  const zip = join(dir, 'snapshot.zip');
  try {
    await execFileAsync(
      'sh',
      ['-c', `npx convex export --prod --path ${JSON.stringify(zip)}`],
      { cwd: repoRoot },
    );
    const { stdout } = await execFileAsync(
      'sh',
      [
        '-c',
        `unzip -p ${JSON.stringify(zip)} productInventory/documents.jsonl`,
      ],
      { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 },
    );
    const set = new Set();
    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      const row = JSON.parse(line);
      if (String(row.certificadoUrl ?? '').trim()) set.add(String(row.itemId));
    }
    return set;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Corre una consulta Convex contra PRODUCCIÓN y devuelve su JSON. */
async function convexProd(fn, args = {}) {
  return JSON.parse(await convexProdRaw(fn, args));
}

/** Corre una mutación Convex contra PRODUCCIÓN (escribe). */
async function convexProdMutation(fn, args) {
  return (await convexProdRaw(fn, args)).trim();
}

/** Extrae el fileId de Drive de cualquiera de las formas que guardamos. */
function driveFileId(url) {
  if (!url) return null;
  const m =
    /[?&]id=([\w-]+)/.exec(url) ||
    /[?&]fileId=([\w-]+)/.exec(url) ||
    /\/file\/d\/([\w-]+)/.exec(url);
  return m ? m[1] : null;
}

/**
 * Descarga la foto del ítem y la devuelve como data: URL.
 *
 * Resolverla en Node (y no dejar que el navegador la pida) evita de raíz los dos
 * modos de fallo del export: el canvas contaminado por una imagen cross-origin y
 * el auto-encuadre que no puede leer los píxeles. Se pide `size=original` porque
 * el círculo del certificado son 435px que se rasterizan a ~3x.
 */
async function fetchPhotoDataUrl(fileId) {
  const url = `${APP_ORIGIN}/api/serve-drive-image?fileId=${fileId}&size=original`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`serve-drive-image HTTP ${res.status}`);
  const type = res.headers.get('content-type') || 'image/jpeg';
  if (!type.startsWith('image/')) {
    throw new Error(`respuesta no-imagen (${type})`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${type};base64,${buf.toString('base64')}`;
}

/**
 * Mapea una fila de productInventory al draft Origen.
 *
 * Espeja `treasureToOrigen` de CertGeneratorPage.tsx campo por campo, incluida
 * la regla de joyería del catálogo (`isJewelry` = el peso dice "Plata" u
 * "Oro 18k"), para que el certificado generado acá diga exactamente lo mismo que
 * el que saldría de la interfaz.
 */
function buildDraft(row, photoDataUrl) {
  const pesoRaw = String(row.peso ?? '').trim();
  const isJewelry = pesoRaw === 'Plata' || pesoRaw === 'Oro 18k';
  const metalType = isJewelry ? pesoRaw : '';
  return {
    name: row.nombre ?? '',
    tipo: row.categoria ?? '',
    calidad: row.calidad ?? '',
    color: row.color ?? '',
    peso: row.peso != null ? String(row.peso) : '',
    corte: row.talla ?? '',
    joya: metalType || (isJewelry ? (row.categoria ?? '') : ''),
    tecnica: '',
    photo: photoDataUrl ?? '',
  };
}

/**
 * Ordena de más reciente a más antiguo.
 *
 * "Reciente" = número de ítem alto: la numeración del inventario es secuencial y
 * es el único orden que Sheets y Convex comparten (`_creationTime` sólo existe
 * del lado de Convex y las filas migradas lo tienen todas igual). Los itemId no
 * numéricos van al final, alfabéticamente invertidos, para que nunca compitan
 * con los numéricos por un lugar arbitrario.
 */
function masRecientePrimero(a, b) {
  const na = Number(a.itemId);
  const nb = Number(b.itemId);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum) return nb - na;
  if (aNum) return -1;
  if (bNum) return 1;
  return String(b.itemId).localeCompare(String(a.itemId), 'es');
}

/** Slug de archivo — mismo criterio que certTemplates.slugify. */
function slugify(value) {
  return (
    String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'certificado'
  );
}

// ── fase 1: render ───────────────────────────────────────────────────────────

/**
 * Renderiza cada certificado, descargando su foto justo antes de usarla.
 *
 * La foto se resuelve DENTRO del bucle, no antes: en `size=original` cada una
 * pesa varios MB y como data: URL crece otro tercio, así que precargar el
 * inventario completo (~500 ítems) reventaría la memoria del proceso. Acá vive
 * una sola a la vez y el recolector se lleva la anterior.
 *
 * Un PNG ya presente en `out/` se reusa tal cual (salvo `--rerender`). Es lo que
 * hace viable el flujo de dos fases sobre el inventario entero: la corrida con
 * `--apply` sube exactamente los píxeles que se revisaron, en vez de renderizar
 * de nuevo unos que nadie miró.
 */
async function renderAll(jobs) {
  const pendientes = [];
  for (const job of jobs) {
    if (RERENDER) {
      pendientes.push(job);
      continue;
    }
    try {
      const { size } = await stat(job.outPath);
      job.rendered = true;
      job.reused = true;
      job.bytes = size;
    } catch {
      pendientes.push(job);
    }
  }
  const reusados = jobs.length - pendientes.length;
  if (reusados) {
    console.log(`   ${reusados} PNG ya en disco — se reusan`);
  }
  if (!pendientes.length) return;
  jobs = pendientes;

  const server = await createServer({ configFile: HARNESS_CONFIG });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0];
  if (!baseUrl) throw new Error('Vite no expuso una URL local');

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('   [harness]', msg.text());
  });
  page.on('pageerror', (err) => console.error('   [harness]', err.message));

  try {
    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__harnessReady === true, {
      timeout: 30_000,
    });

    await mkdir(OUT_DIR, { recursive: true });

    let n = 0;
    for (const job of jobs) {
      const label = `[${++n}/${jobs.length}] #${job.itemId} ${job.row.nombre ?? ''}`;
      try {
        let photo = null;
        if (job.fileId) {
          try {
            photo = await fetchPhotoDataUrl(job.fileId);
          } catch (err) {
            console.error(
              `   ! #${job.itemId} foto no descargable — ${err.message}`,
            );
          }
        }
        if (!photo && !CON_SIN_FOTO) {
          job.skippedSinFoto = true;
          console.log(`   – ${label} — sin foto, salteado`);
          continue;
        }
        job.photo = Boolean(photo);
        const draft = buildDraft(job.row, photo);
        const dataUrl = await page.evaluate(
          (j) => window.__renderCert({ data: j.draft }),
          { draft },
        );
        photo = null;
        const png = Buffer.from(dataUrl.split(',')[1], 'base64');
        const meta = await sharp(png).metadata();
        await writeFile(job.outPath, png);
        job.rendered = true;
        job.bytes = png.length;
        job.dims = `${meta.width}×${meta.height}`;
        console.log(
          `   ✓ ${label} → ${job.dims}, ${(png.length / 1e6).toFixed(1)} MB` +
            (job.photo ? '' : '  (SIN FOTO — círculo vacío)'),
        );
      } catch (err) {
        job.error = err.message;
        console.error(`   ✗ ${label} — ${err.message}`);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

// ── fase 2: subir + enlazar ──────────────────────────────────────────────────

/**
 * Sube el certificado a Drive y devuelve su URL.
 *
 * Se recomprime a JPEG ≤2000px antes de enviarlo, igual que hace `toUploadable`
 * en la interfaz: el PNG nativo pesa varios MB y el límite de body de la función
 * serverless rechazaría la petición antes de que corra el handler.
 */
async function uploadCert(job) {
  const jpeg = await sharp(await readFile(job.outPath))
    .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();

  const fd = new FormData();
  // Los ítems sin lote (la mayoría del inventario heredado de Sheets) cuelgan de
  // una carpeta propia en vez de inventar un loteId falso.
  const carpeta = job.loteId ?? 'sin-lote';
  fd.append('subPath', `fotosintesis/${carpeta}/${job.itemId}-cert`);
  fd.append(
    'file',
    new Blob([jpeg], { type: 'image/jpeg' }),
    `${job.baseName}.jpg`,
  );

  const res = await fetch(`${APP_ORIGIN}/api/media-upload`, {
    method: 'POST',
    body: fd,
  });
  if (!res.ok) throw new Error(`media-upload HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success || !data.urls?.[0]) {
    throw new Error(data.error ?? 'Drive respondió sin URL');
  }
  return data.urls[0];
}

/**
 * Sube y enlaza cada certificado, direccionando por itemId.
 *
 * `_updateMediaByItem` en vez de `_updateMedia`: el certificado vive en la fila
 * de productInventory, y pasar por el `_id` de la unión `lotItems` dejaba fuera
 * a los cientos de ítems que la migración desde Sheets nunca enlazó a un lote.
 */
async function applyAll(jobs) {
  let n = 0;
  for (const job of jobs) {
    const label = `[${++n}/${jobs.length}] #${job.itemId} ${job.row.nombre ?? ''}`;
    try {
      const url = await uploadCert(job);
      await convexProdMutation('lotItems:_updateMediaByItem', {
        itemId: String(job.itemId),
        certificadoUrl: url,
        editorEmail: 'generar-certificados-script',
      });
      job.linked = url;
      console.log(`   ✓ ${label} → enlazado`);
    } catch (err) {
      job.error = err.message;
      console.error(`   ✗ ${label} — ${err.message}`);
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

/**
 * Elige qué ítems entran a la corrida.
 *
 * `--items` gana sobre todo lo demás: nombrar ítems a mano es una orden, no una
 * sugerencia, y por eso ignora el filtro de "ya certificados". El barrido por
 * defecto es lo contrario — todo el inventario menos lo ya hecho — para que
 * correr el script dos veces continúe en vez de rehacer.
 */
function seleccionar(products, yaCertificadosSet) {
  if (ITEM_IDS) {
    const jobs = [];
    for (const itemId of ITEM_IDS) {
      const row = products.find((p) => String(p.itemId) === itemId);
      if (!row) {
        console.error(`   ✗ #${itemId} — no existe en productInventory`);
        continue;
      }
      jobs.push(row);
    }
    return { rows: jobs, yaCertificados: 0 };
  }

  const pendientes = products.filter(
    (p) => FORCE || !yaCertificadosSet.has(String(p.itemId)),
  );
  const yaCertificados = products.length - pendientes.length;

  const conCategoria = CON_INSUMOS
    ? pendientes
    : pendientes.filter(
        (p) => !CATEGORIAS_SIN_CERTIFICADO.includes(String(p.categoria ?? '')),
      );
  const insumos = pendientes.length - conCategoria.length;

  conCategoria.sort(masRecientePrimero);
  return { rows: conCategoria, yaCertificados, insumos };
}

async function main() {
  console.log(
    `\nCertificados de Origen · ${
      ITEM_IDS ? `${ITEM_IDS.length} ítems nombrados` : 'barrido del inventario'
    } · ${APPLY ? 'RENDER + SUBIR + ENLAZAR' : 'sólo render (dry-run)'}\n`,
  );

  console.log('1. Leyendo inventario de producción…');
  const products = await convexProd('products:list', {});
  const thumbsRes = await fetch(`${APP_ORIGIN}/api/get-batch-thumbnails`);
  const thumbs = (await thumbsRes.json()).thumbnails ?? {};
  console.log(`   ${products.length} ítems en productInventory`);
  const yaCertificadosSet = ITEM_IDS ? new Set() : await itemsYaCertificados();

  const { rows, yaCertificados, insumos } = seleccionar(
    products,
    yaCertificadosSet,
  );
  if (yaCertificados) {
    console.log(`   ${yaCertificados} ya tienen certificado — salteados`);
  }
  if (insumos) {
    console.log(
      `   ${insumos} insumos (${CATEGORIAS_SIN_CERTIFICADO.join(', ')}) — no llevan certificado`,
    );
  }

  let jobs = rows.map((row) => {
    const itemId = String(row.itemId);
    const baseName = `TierraMadre_origen_${itemId}_${slugify(row.nombre)}`;
    return {
      itemId,
      loteId: row.loteId,
      row,
      fileId:
        driveFileId(row.fotoUrl) || driveFileId(thumbs[itemId]?.url) || null,
      baseName,
      outPath: resolve(OUT_DIR, `${baseName}.png`),
    };
  });

  // El descarte por falta de foto va ANTES del --limit: si contara después, una
  // tanda de 25 podría rendir cuatro certificados, porque los ítems sin foto se
  // amontonan justo en la punta más reciente del inventario.
  if (!CON_SIN_FOTO) {
    const sinFoto = jobs.filter((j) => !j.fileId);
    if (sinFoto.length) {
      console.log(`   ${sinFoto.length} sin foto en Drive — salteados`);
    }
    jobs = jobs.filter((j) => j.fileId);
  }
  if (LIMIT) jobs = jobs.slice(0, LIMIT);

  console.log(`\n2. Renderizando ${jobs.length} certificados…`);
  await renderAll(jobs);

  const ok = jobs.filter((j) => j.rendered);
  if (APPLY && ok.length) {
    console.log(`\n3. Subiendo y enlazando ${ok.length} certificados…`);
    await applyAll(ok);
  }

  // ── resumen ──
  console.log('\n─── Resumen ───');
  console.log(`Renderizados : ${ok.length}/${jobs.length}  → ${OUT_DIR}`);
  const reusados = ok.filter((j) => j.reused).length;
  if (reusados) console.log(`  (${reusados} reusados de una corrida previa)`);
  const sinFoto = jobs.filter((j) => j.skippedSinFoto);
  if (sinFoto.length) {
    console.log(
      `Sin foto     : ${sinFoto.length} salteados — ${sinFoto
        .map((j) => '#' + j.itemId)
        .join(', ')}`,
    );
    console.log(
      '               (--con-sin-foto los genera con el círculo vacío)',
    );
  }
  const failed = jobs.filter((j) => j.error);
  if (failed.length) {
    console.log('Con error    :');
    for (const j of failed) console.log(`  #${j.itemId} — ${j.error}`);
  }
  if (APPLY) {
    console.log(`Enlazados    : ${jobs.filter((j) => j.linked).length}`);
  } else {
    console.log(
      '\nRevisá los PNG y luego corré:  node scripts/generar-certificados.mjs --apply' +
        '\n(los PNG ya en out/ se reusan — la segunda corrida no vuelve a renderizar)',
    );
  }
  console.log('');

  if (failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error('\nFalló la generación:', err);
  process.exit(1);
});
