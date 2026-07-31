/**
 * Deriva entradas de `work/joyas-map.json` leyendo un `.pen` directamente.
 *
 * El mapa nació como una extracción a mano porque se creía que los `.pen`
 * estaban cifrados y sólo eran accesibles vía el MCP de Pencil. No lo están:
 * son JSON plano. Así que la correspondencia card → renders se puede derivar,
 * y el mapa deja de ser un artefacto congelado que hay que rehacer a mano cada
 * vez que se genera una tanda nueva.
 *
 * Fusiona en vez de reescribir: las entradas de los otros `.pen` se respetan y
 * sólo se reemplazan los items que aparezcan en el archivo indicado.
 *
 * OJO: Pencil guarda en disco de forma diferida. Si el archivo está abierto en
 * el editor con cambios sin guardar, lo que hay en disco está viejo. Guardá en
 * Pen antes de correr esto.
 *
 * Uso:
 *   node scripts/visualizer-mapa-desde-pen.mjs docs/Visualizer/visualizer-3.pen [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VIS_DIR = path.join(REPO_ROOT, 'docs', 'Visualizer');
const MAP_PATH = path.join(VIS_DIR, 'work', 'joyas-map.json');
const MANIFEST_PATH = path.join(VIS_DIR, 'work', 'manifest.json');

const TIPOS = ['ANILLO', 'COLLAR', 'PULSERA', 'ARETES'];
const DEST = {
  ANILLO: 'anillo.png',
  COLLAR: 'collar.png',
  PULSERA: 'pulsera.png',
  ARETES: 'aretes.png',
};
const ESCENA = {
  ANILLO: 'ring-woman',
  COLLAR: 'necklace',
  PULSERA: 'bracelet',
  ARETES: 'earrings',
};

const penArg = process.argv.slice(2).find((a) => !a.startsWith('--'));
const DRY = process.argv.includes('--dry-run');
if (!penArg) {
  console.error('\n✖ Falta la ruta del .pen\n');
  process.exit(1);
}
const penPath = path.resolve(REPO_ROOT, penArg);
const penName = path.basename(penPath);

/** Recorre el árbol del .pen aplicando visit a cada nodo. */
function walk(node, visit) {
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  if (!node || typeof node !== 'object') return;
  visit(node);
  if (node.children) walk(node.children, visit);
}

const pen = JSON.parse(fs.readFileSync(penPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const mapa = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

const nuevas = [];
for (const card of pen.children || []) {
  const m = /^Card (\d+)\b/.exec(card.name || '');
  if (!m) continue;
  const item = Number(m[1]);
  const it = manifest.items.find((x) => x.item === item);

  const rects = {};
  walk(card.children, (n) => {
    const r = /^R-(ANILLO|COLLAR|PULSERA|ARETES)-(\d+)$/.exec(n.name || '');
    if (r && Number(r[2]) === item) rects[r[1]] = n;
  });

  const joyas = {};
  const faltan = [];
  for (const tipo of TIPOS) {
    const n = rects[tipo];
    const url = n && typeof n.fill === 'object' ? n.fill.url : null;
    if (!url) {
      faltan.push(tipo);
      continue;
    }
    // `pencil:pending-image-*` = Pencil nunca escribió el png a disco; el render
    // se perdió y hay que regenerarlo. El organizador ya sabe reportarlo.
    const pending = /^pencil:/.test(url);
    joyas[tipo] = {
      source: url.replace(/^\.\//, ''),
      dest: `work/${item}/joyas/${DEST[tipo]}`,
      pending,
      from: `${penName}/R-${tipo}-${item}`,
      prompt: it?.promptsByScene?.[ESCENA[tipo]] || '',
    };
  }

  nuevas.push({
    item,
    nombre:
      it?.nombre || card.name.replace(/^Card \d+\s*/, '').replace(/ · .*$/, ''),
    categoria: it?.categoria ?? 'Gema',
    talla: it?.talla ?? null,
    peso: it?.peso ?? null,
    medidas: it?.measuresDisplay || null,
    estado: it?.estado ?? null,
    status: it?.status || 'pending',
    hero: `work/${item}/hero.jpg`,
    heroClean: `work/${item}/hero-clean.jpg`,
    joyas,
    faltan,
    previas: [],
  });
}

if (!nuevas.length) {
  console.log(`\n(no se encontraron cards "Card <n>" en ${penName})\n`);
  process.exit(0);
}

const porItem = new Map(mapa.items.map((e) => [e.item, e]));
let añadidos = 0,
  reemplazados = 0;
for (const e of nuevas) {
  if (porItem.has(e.item)) reemplazados++;
  else añadidos++;
  porItem.set(e.item, e);
}
mapa.items = [...porItem.values()].sort((a, b) => a.item - b.item);
mapa.generatedAt = new Date().toISOString();
mapa.source = [
  ...new Set([...(mapa.source || []), `docs/Visualizer/${penName}`]),
];

for (const e of nuevas) {
  const listos = TIPOS.filter((t) => e.joyas[t] && !e.joyas[t].pending).length;
  console.log(
    `  ${String(e.item).padEnd(5)} ${String(e.nombre).slice(0, 26).padEnd(27)} ${listos}/4 renders` +
      (e.faltan.length ? `  faltan: ${e.faltan.join(', ')}` : ''),
  );
}

if (DRY) {
  console.log(`\n(dry-run) ${añadidos} nuevos · ${reemplazados} reemplazados`);
} else {
  fs.writeFileSync(MAP_PATH, JSON.stringify(mapa, null, 2) + '\n');
  console.log(
    `\n✓ ${añadidos} nuevos · ${reemplazados} reemplazados → work/joyas-map.json (${mapa.items.length} items)`,
  );
}
