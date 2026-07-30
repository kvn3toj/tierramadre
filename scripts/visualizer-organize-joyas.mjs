/**
 * Organiza los renders de joyas del Visualizer en la carpeta de cada producto.
 * ------------------------------------------------------------------------
 * Los renders viven planos en docs/Visualizer/images/generated-<ts>.png y la
 * correspondencia gema → tipo de joya sólo existía dentro de los .pen
 * (visualizer.pen y visualizer-2.pen). Esa correspondencia ya está extraída y
 * congelada en docs/Visualizer/work/joyas-map.json; este script sólo la aplica
 * al sistema de archivos.
 *
 * Resultado por producto:
 *   work/<item>/hero.jpg              (ya existía — foto real cruda)
 *   work/<item>/hero-clean.jpg        (ya existía — foto real limpia)
 *   work/<item>/joyas/anillo.png
 *   work/<item>/joyas/collar.png
 *   work/<item>/joyas/pulsera.png
 *   work/<item>/joyas/aretes.png
 *   work/<item>/joyas/previas/v1-N.png   (renders de la primera generación)
 *   work/<item>/joyas/index.json         (ficha de la gema + sus opciones)
 *
 * Los archivos se enlazan con hard links contra images/ (mismo volumen, cero
 * bytes extra) y se copian si el link falla. images/ no se toca: los .pen
 * siguen apuntando ahí.
 *
 * Uso:
 *   node scripts/visualizer-organize-joyas.mjs --dry-run
 *   node scripts/visualizer-organize-joyas.mjs
 *   node scripts/visualizer-organize-joyas.mjs --items 132,134 --force
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VISUALIZER_DIR = path.join(REPO_ROOT, 'docs', 'Visualizer');
const MAP_PATH = path.join(VISUALIZER_DIR, 'work', 'joyas-map.json');

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const flagValue = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const DRY_RUN = hasFlag('dry-run');
const FORCE = hasFlag('force');
const ONLY_ITEMS = flagValue('items')
  ? new Set(
      flagValue('items')
        .split(',')
        .map((n) => Number(n.trim())),
    )
  : null;

/** Enlaza (o copia) src → dest. Devuelve "linked" | "copied" | "skipped" | "missing". */
function place(srcRel, destRel) {
  const src = path.join(VISUALIZER_DIR, srcRel);
  const dest = path.join(VISUALIZER_DIR, destRel);
  if (!fs.existsSync(src)) return 'missing';
  if (fs.existsSync(dest) && !FORCE) return 'skipped';
  if (DRY_RUN) return 'linked';

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.rmSync(dest);
  try {
    fs.linkSync(src, dest);
    return 'linked';
  } catch {
    fs.copyFileSync(src, dest);
    return 'copied';
  }
}

const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
const stats = { linked: 0, copied: 0, skipped: 0, missing: 0 };
const pendientes = [];
const incompletos = [];

for (const entry of map.items) {
  if (ONLY_ITEMS && !ONLY_ITEMS.has(entry.item)) continue;

  for (const [tipo, joya] of Object.entries(entry.joyas)) {
    if (joya.pending) {
      // El render existe sólo dentro del .pen (nunca se escribió a disco).
      pendientes.push({ item: entry.item, tipo, ref: joya.source });
      continue;
    }
    stats[place(joya.source, joya.dest)]++;
  }
  for (const previa of entry.previas)
    stats[place(previa.source, previa.dest)]++;

  if (entry.faltan.length)
    incompletos.push({ item: entry.item, faltan: entry.faltan });

  const indexPath = path.join(
    VISUALIZER_DIR,
    'work',
    String(entry.item),
    'joyas',
    'index.json',
  );
  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(indexPath), { recursive: true });
    fs.writeFileSync(indexPath, JSON.stringify(entry, null, 2));
  }
}

const label = DRY_RUN ? '[dry-run] ' : '';
console.log(
  `${label}enlazados: ${stats.linked}  copiados: ${stats.copied}  ya existían: ${stats.skipped}  origen ausente: ${stats.missing}`,
);

if (pendientes.length) {
  console.log(
    `\n${label}renders pendientes de exportar desde Pencil (${pendientes.length}):`,
  );
  for (const p of pendientes)
    console.log(`  item ${p.item} · ${p.tipo} → ${p.ref}`);
}
if (incompletos.length) {
  console.log(
    `\n${label}productos sin las 4 opciones (${incompletos.length}):`,
  );
  for (const i of incompletos)
    console.log(`  item ${i.item} · faltan ${i.faltan.join(', ')}`);
}

// ── Reporte de cobertura (work/JOYAS.md) ─────────────────────────────────────
// Cruza el mapa con el manifest para saber, de todo el inventario, qué gemas
// tienen sus opciones y cuáles no — y por qué (sin foto, render perdido, etc.).

const manifest = JSON.parse(
  fs.readFileSync(path.join(VISUALIZER_DIR, 'work', 'manifest.json'), 'utf8'),
);
const porItem = Object.fromEntries(map.items.map((e) => [e.item, e]));
const enManifest = new Set(manifest.items.map((i) => i.item));

const universo = [
  ...manifest.items,
  ...map.items
    .filter((e) => !enManifest.has(e.item))
    .map((e) => ({
      item: e.item,
      nombre: e.nombre,
      categoria: 'Gema',
      huerfano: true,
    })),
].sort((a, b) => a.item - b.item);

const completos = [];
const parciales = [];
const perdidos = [];
const sinNada = [];

for (const it of universo) {
  const e = porItem[it.item];
  if (!e) {
    sinNada.push(it);
    continue;
  }
  const listos = map.tipos.filter((t) => e.joyas[t] && !e.joyas[t].pending);
  const rotos = map.tipos.filter((t) => e.joyas[t]?.pending);
  if (listos.length === map.tipos.length) completos.push(it);
  else if (rotos.length === map.tipos.length) perdidos.push({ it, rotos });
  else
    parciales.push({
      it,
      faltan: map.tipos.filter((t) => !listos.includes(t)),
    });
}

const nombrar = (i) =>
  `${i.item} · ${i.nombre}` +
  (i.huerfano ? ' _(card del .pen sin ficha en manifest)_' : '');

// ── Denominador real: el catálogo, no el manifest ────────────────────────────
// El manifest solo tiene los productos que alguien ya pasó por `prepare`, así
// que medir cobertura contra él se autoengaña: da 100% cuando quedan cientos de
// gemas fuera. El número que importa comercialmente es sobre lo DISPONIBLE del
// catálogo. Si no hay red, el reporte sale igual sin esta parte.
const BASE = flagValue('base') || 'https://tierramadre.app';

async function cargarCatalogo() {
  if (hasFlag('offline')) return null;
  try {
    const [cat, thumbs] = await Promise.all([
      fetch(`${BASE}/api/get-treasure-sheets`).then((r) => r.json()),
      fetch(`${BASE}/api/get-batch-thumbnails`).then((r) => r.json()),
    ]);
    const filas = cat.treasure || [];
    if (!filas.length) return null;
    return {
      filas,
      conFoto: new Set(Object.keys(thumbs.thumbnails || {}).map(Number)),
    };
  } catch {
    return null; // sin red: el reporte se genera sin las secciones de catálogo
  }
}

/** Mismos filtros que usa `jewelry-visualizer.mjs prepare` para elegir candidatos. */
function esElegible(t) {
  if (t.isJewelry) return false;
  if (
    /morralla|cabuj[óo]n|cabochon|tumbled|pulid/i.test(
      `${t.talla || ''} ${t.calidad || ''}`,
    )
  )
    return false;
  const medidas = String(t.medidasValores || '')
    .split('\n')
    .map((s) => parseFloat(s))
    .filter((n) => n > 0);
  const ct = parseFloat(String(t.peso ?? '').replace(',', '.'));
  return medidas.length > 0 || ct > 0;
}

const catalogo = await cargarCatalogo();
const colocados = map.items.reduce(
  (a, e) => a + Object.values(e.joyas).filter((j) => !j.pending).length,
  0,
);
const totalPrevias = map.items.reduce((a, e) => a + e.previas.length, 0);
const conjuntos = [...sinNada, ...perdidos.map((p) => p.it)].filter(
  (i) => i.piedras > 1,
);
const porGenerar =
  parciales.reduce((a, p) => a + p.faltan.length, 0) +
  (perdidos.length + sinNada.length) * map.tipos.length;
const sinFoto = sinNada.filter((i) => i.noPhoto).length;

// "Sin foto real" mezclaba dos bloqueos que se resuelven distinto: la carpeta de
// Drive vacía necesita que alguien fotografíe la piedra; la que solo tiene .MOV
// ya tiene material y solo hace falta sacarle un frame.
const soloVideo = sinNada.filter(
  (i) => i.noPhoto && (i.existingFiles || []).length > 0,
);
const carpetaVacia = sinNada.filter(
  (i) => i.noPhoto && (i.existingFiles || []).length === 0,
);

/** Cobertura por estado — DISPONIBLE primero, que es lo que se puede vender. */
const ORDEN_ESTADO = [
  'DISPONIBLE',
  'ESMEREOGENESIS',
  'RETORNADO',
  'LOTE X  CT',
  'VENDIDA',
];
const completosSet = new Set(completos.map((i) => i.item));
const porEstado = new Map();
for (const it of universo) {
  const estado = (it.estado || '—').trim();
  const row = porEstado.get(estado) || { estado, total: 0, listos: 0 };
  row.total++;
  if (completosSet.has(it.item)) row.listos++;
  porEstado.set(estado, row);
}
const filasEstado = [...porEstado.values()].sort((a, b) => {
  const ia = ORDEN_ESTADO.indexOf(a.estado);
  const ib = ORDEN_ESTADO.indexOf(b.estado);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || b.total - a.total;
});

// Elegibles del catálogo que ya tienen foto pero nadie pasó por `prepare`.
let elegibles = null;
if (catalogo) {
  const cosechables = catalogo.filas
    .filter((t) => esElegible(t) && !enManifest.has(Number(t.item)))
    .map((t) => ({
      item: Number(t.item),
      nombre: t.nombre || t.name,
      estado: (t.estado || '—').trim(),
      foto: catalogo.conFoto.has(Number(t.item)),
    }))
    .sort((a, b) => a.item - b.item);
  elegibles = {
    total: catalogo.filas.filter(esElegible).length,
    enManifest: catalogo.filas.filter(
      (t) => esElegible(t) && enManifest.has(Number(t.item)),
    ).length,
    conFoto: cosechables.filter((c) => c.foto),
    sinFoto: cosechables.filter((c) => !c.foto),
  };
}

const md = [
  '# Joyas por producto — estado de cobertura',
  '',
  `_Generado por \`scripts/visualizer-organize-joyas.mjs\` · fuente: \`work/joyas-map.json\` + \`work/manifest.json\`_`,
  '',
  'Cada gema tiene su carpeta en `work/<item>/`. Dentro, `joyas/` guarda las opciones de',
  'montaje generadas a partir de la foto real y las medidas exactas de la piedra:',
  '',
  '```',
  'work/<item>/',
  '  hero.jpg            foto real cruda',
  '  hero-clean.jpg      foto real limpia (fondo blanco, balance)',
  '  joyas/',
  '    anillo.png',
  '    collar.png',
  '    pulsera.png',
  '    aretes.png',
  '    previas/v1-N.png  renders de la primera generación',
  '    index.json        ficha de la gema + prompt usado en cada opción',
  '```',
  '',
  'Los PNG son hard links contra `images/`: no ocupan disco extra y los `.pen` siguen',
  'apuntando a sus rutas originales sin cambios.',
  '',
  '## Resumen',
  '',
  '| Estado | Productos |',
  '|---|---|',
  `| Con las ${map.tipos.length} opciones | ${completos.length} |`,
  `| Parciales | ${parciales.length} |`,
  `| Render perdido en Pencil | ${perdidos.length} |`,
  `| Sin ninguna opción | ${sinNada.length} |`,
  `| **Total** | **${universo.length}** |`,
  '',
  `Renders colocados: **${colocados}** en ${map.items.length} carpetas, más ${totalPrevias} previas de la primera generación.`,
  '',
  'Ese total es sobre los productos que ya entraron al manifest. El denominador que',
  'importa está más abajo, en "Cobertura sobre el catálogo".',
  '',
  '### Por estado',
  '',
  'Lo **DISPONIBLE** es lo único que un cliente puede comprar hoy: es la fila que manda.',
  '',
  '| Estado | Con las 4 opciones | Total | Cobertura |',
  '|---|---|---|---|',
  ...filasEstado.map(
    (r) =>
      `| ${r.estado} | ${r.listos} | ${r.total} | ${r.total ? Math.round((r.listos / r.total) * 100) : 0}% |`,
  ),
  '',
  ...(elegibles
    ? [
        '## Cobertura sobre el catálogo',
        '',
        `El catálogo tiene **${elegibles.total} productos elegibles** para el visualizer`,
        '(gema suelta, no morralla, con medidas o quilates — los mismos filtros de `prepare`).',
        '',
        '| | Productos |',
        '|---|---|',
        `| Elegibles en el catálogo | ${elegibles.total} |`,
        `| Ya en el manifest | ${elegibles.enManifest} |`,
        `| **Fuera del manifest, con foto en Drive** | **${elegibles.conFoto.length}** |`,
        `| Fuera del manifest, sin foto | ${elegibles.sinFoto.length} |`,
        '',
        ...(elegibles.conFoto.length
          ? [
              '### Listos para cosechar',
              '',
              'Ya están fotografiados y el catálogo los da por elegibles; solo falta correr',
              '`prepare` y generarlos. No dependen de nadie más.',
              '',
              '```bash',
              `node scripts/jewelry-visualizer.mjs prepare --items ${elegibles.conFoto
                .filter((c) => /^DISPONIBLE/i.test(c.estado))
                .map((c) => c.item)
                .join(',')}`,
              '```',
              '',
              ...elegibles.conFoto.map(
                (c) => `- **${c.item} · ${c.nombre}** — ${c.estado}`,
              ),
              '',
            ]
          : []),
      ]
    : [
        '## Cobertura sobre el catálogo',
        '',
        '_No se pudo consultar el catálogo (sin red o `--offline`); el reporte queda',
        'medido solo contra el manifest, que es un denominador optimista._',
        '',
      ]),
  '## Pendiente de generar',
  '',
  '### Parciales',
  '',
  ...(parciales.length
    ? parciales.map(
        (p) => `- **${nombrar(p.it)}** — faltan ${p.faltan.join(', ')}`,
      )
    : ['_Ninguno._']),
  '',
  '### Render perdido',
  '',
  'El `.pen` referencia `pencil:pending-image-*`: la imagen nunca se escribió a disco y',
  'exporta en blanco. Hay que regenerar las opciones.',
  '',
  ...(perdidos.length
    ? perdidos.map((p) => `- **${nombrar(p.it)}** — ${p.rotos.join(', ')}`)
    : ['_Ninguno._']),
  '',
  '### Sin ninguna opción',
  '',
  ...sinNada.map(
    (i) =>
      `- **${nombrar(i)}** — ${i.categoria}` +
      (i.noPhoto ? ' · **sin foto real**' : '') +
      (i.status ? ` · ${i.status}` : '') +
      (i.notaMontaje ? `\n  <br>${i.notaMontaje}` : ''),
  ),
  '',
  `**Total de renders por generar: ${porGenerar}** en ${parciales.length + perdidos.length + sinNada.length} productos.`,
  '',
  ...(conjuntos.length
    ? [
        `De esos, **${conjuntos.length} están catalogados como "Gema" pero la foto real muestra varias piedras**, no una suelta.`,
        'La plantilla actual (`api/_lib/jewelry-prompt.js`) monta una sola piedra hero, así que',
        'generarlos con ella produciría un render que no corresponde al producto — por eso',
        'quedaron en `rejected`. Necesitan una plantilla de montaje múltiple antes de generar.',
        '',
      ]
    : []),
  ...(sinFoto
    ? [
        `De los ${sinNada.length} sin ninguna opción, **${sinFoto} no tienen foto real** en Drive.`,
        'Son dos bloqueos distintos y se destraban distinto:',
        '',
        `- **Carpeta de Drive vacía (${carpetaVacia.length})** — no hay nada que bajar: hay que fotografiar la piedra.`,
        ...(carpetaVacia.length
          ? [`  <br>${carpetaVacia.map((i) => i.item).join(', ')}`]
          : []),
        `- **Solo video, sin foto fija (${soloVideo.length})** — el material existe; se le puede extraer un frame con \`ffmpeg\`.`,
        ...(soloVideo.length
          ? [`  <br>${soloVideo.map((i) => i.item).join(', ')}`]
          : []),
        '',
      ]
    : []),
].join('\n');

if (!DRY_RUN) {
  fs.writeFileSync(path.join(VISUALIZER_DIR, 'work', 'JOYAS.md'), md);
  console.log(
    `\nreporte: docs/Visualizer/work/JOYAS.md (${completos.length} completos · ${porGenerar} renders por generar)`,
  );
}
