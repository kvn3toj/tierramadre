/**
 * Reparte `docs/Visualizer/images/` — el bolsón plano donde Pencil deja TODO lo
 * que genera — en `work/<item>/renders/`, para que cada producto tenga junto lo
 * suyo: la elegida y las que se descartaron.
 *
 * OJO CON EL NOMBRE: son `.png` sólo de nombre. Por dentro son JPEG con
 * metadatos C2PA de Google (`Created by Google Generative AI` + marca SynthID).
 * No son fotos: las fotos reales están en `work/<item>/fotos/`, espejadas de
 * Drive. Esto son renders sintéticos.
 *
 * La atribución NO se adivina. Se usan sólo fuentes con nombre de item escrito:
 *
 *   1. `.pen`  — la imagen está en el fill de un nodo bajo una "Card <item>".
 *   2. `cands` — líneas `SLOT|variante|nodo|url` de las corridas de mejor-de-3.
 *   3. `pencil`— confirmaciones `R-<TIPO>-<item> ./images/<f>.png ok` del MCP.
 *
 * Lo que ninguna de las tres cubre se queda donde está y se lista aparte. Se
 * probaron dos atajos para rellenar ese hueco y los dos fallaron, así que no
 * están acá: emparejar por firma perceptual acierta la ESCENA 8/8 pero el item
 * 0/8 (manda la composición, la gema es muy chica), y emparejar por el color
 * del verde contra el hero da 23% sobre un azar de 20%. Adivinar el item sería
 * peor que dejarlo sin ubicar.
 *
 * Los archivos se enlazan (hard link), no se copian: no cuesta disco y borrar
 * `images/` no se lleva lo repartido.
 *
 * Uso:
 *   node scripts/visualizer-archivar-renders.mjs [--dry-run] [--transcript <jsonl>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VIS = path.join(REPO_ROOT, 'docs', 'Visualizer');
const IMAGES = path.join(VIS, 'images');
const WORK = path.join(VIS, 'work');
const PENS = ['visualizer.pen', 'visualizer-2.pen', 'visualizer-3.pen'];
const SIN_UBICAR = path.join(WORK, 'RENDERS-SIN-UBICAR.md');

const DRY = process.argv.includes('--dry-run');
const transcriptArg = process.argv[process.argv.indexOf('--transcript') + 1];
const TRANSCRIPT =
  process.argv.includes('--transcript') && transcriptArg ? transcriptArg : null;

const ESCENA = {
  ANILLO: 'anillo',
  COLLAR: 'collar',
  PULSERA: 'pulsera',
  ARETES: 'aretes',
};

const walk = (n, v) => {
  if (Array.isArray(n)) return n.forEach((x) => walk(x, v));
  if (!n || typeof n !== 'object') return;
  v(n);
  if (n.children) walk(n.children, v);
};

/** basename -> {item, escena|null, variante|null, fuente} — la primera fuente gana. */
const atribucion = new Map();
const anotar = (base, datos) => {
  if (!atribucion.has(base)) atribucion.set(base, datos);
};

// ── Fuente 1: los .pen ───────────────────────────────────────────────────────
for (const pen of PENS) {
  const abs = path.join(VIS, pen);
  if (!fs.existsSync(abs)) continue;
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  for (const card of doc.children || []) {
    const m = /^Card (\d+)\b/.exec(card.name || '');
    if (!m) continue;
    const item = Number(m[1]);
    walk(card.children || [], (n) => {
      const url = n.fill && typeof n.fill === 'object' ? n.fill.url : null;
      if (!url || !/generated-\d+\.png/.test(url)) return;
      const tipo = /^R-(ANILLO|COLLAR|PULSERA|ARETES)-/.exec(n.name || '')?.[1];
      anotar(url.split('/').pop(), {
        item,
        escena: tipo ? ESCENA[tipo] : null,
        variante: null,
        fuente: pen,
      });
    });
  }
}

// ── Fuente 2: lo ya archivado por una corrida anterior ───────────────────────
// El transcript es efímero: vive en ~/.claude y es de una sesión concreta. Sin
// esto, volver a correr el script sin `--transcript` perdería las atribuciones
// que salieron de ahí y mandaría esos archivos a "sin ubicar". Releer los
// index.json que este mismo script escribe las vuelve permanentes.
for (const d of fs.readdirSync(WORK)) {
  const idxPath = path.join(WORK, d, 'renders', 'index.json');
  if (!fs.existsSync(idxPath)) continue;
  const { item, renders } = JSON.parse(fs.readFileSync(idxPath, 'utf8'));
  for (const r of renders || []) {
    if (!r.origen) continue;
    anotar(r.origen.split('/').pop(), {
      item,
      escena: r.escena ?? null,
      escenaInferida: r.escenaInferida,
      variante: r.variante ?? null,
      fuente: r.atribucion === 'joyas' ? 'archivado' : r.atribucion,
    });
  }
}

// ── Fuentes 3 y 4: el transcript de la sesión ────────────────────────────────
if (TRANSCRIPT && fs.existsSync(TRANSCRIPT)) {
  const txt = fs.readFileSync(TRANSCRIPT, 'utf8');
  // 2 — `ANILLO-233|b|nodoId|./images/generated-….png`
  for (const m of txt.matchAll(
    /(ANILLO|COLLAR|PULSERA|ARETES)-(\d+)\|(\w+)\|\w+\|\.\/images\/(generated-\d+)\.png/g,
  )) {
    anotar(`${m[4]}.png`, {
      item: Number(m[2]),
      escena: ESCENA[m[1]],
      variante: m[3],
      fuente: 'cands',
    });
  }
  // 3 — `R-ANILLO-309 ./images/generated-….png ok`
  for (const m of txt.matchAll(
    /R-(ANILLO|COLLAR|PULSERA|ARETES)-(\d+)\s+\.\/images\/(generated-\d+)\.png/g,
  )) {
    anotar(`${m[3]}.png`, {
      item: Number(m[2]),
      escena: ESCENA[m[1]],
      variante: null,
      fuente: 'pencil',
    });
  }
}

// ── Qué está ya colocado en joyas/ (por inodo, porque son hard links) ────────
const archivos = fs.readdirSync(IMAGES).filter((f) => f.endsWith('.png'));
const porInodo = new Map();
for (const f of archivos)
  porInodo.set(fs.statSync(path.join(IMAGES, f)).ino, f);

const elegidas = new Map(); // basename -> {item, escena}
for (const d of fs.readdirSync(WORK)) {
  const jd = path.join(WORK, d, 'joyas');
  if (!fs.existsSync(jd)) continue;
  for (const f of fs.readdirSync(jd)) {
    if (!f.endsWith('.png')) continue;
    const src = porInodo.get(fs.statSync(path.join(jd, f)).ino);
    if (src)
      elegidas.set(src, { item: Number(d), escena: f.replace('.png', '') });
  }
}
// Estar colocada en joyas/ es la evidencia más fuerte que hay: pisa a las demás.
for (const [base, e] of elegidas)
  atribucion.set(base, { ...e, variante: null, fuente: 'joyas' });

// ── Escena faltante: se infiere por parecido, el item NO ─────────────────────
// Los renders que sólo aparecen en `visualizer.pen` traen item (la card lo dice)
// pero no escena: ese archivo es anterior a la convención `R-<TIPO>-<item>` y
// sus nodos se llamaban "Render" a secas.
//
// Comparar la imagen reducida a 12×12 contra las 508 de escena conocida acierta
// la escena en el 97.2% (validado dejando una afuera). Sirve para ESO y nada
// más: la misma comparación acierta el item 0 de 8 veces, porque lo que domina
// la firma es el encuadre y la gema es demasiado chica para inclinar la balanza.
// Los errores que quedan son anillo↔pulsera, que comparten piel y metal.
async function inferirEscenas(pendientes, conEscena) {
  if (!pendientes.length) return new Map();
  const { default: sharp } = await import('sharp');
  const firma = async (f) => {
    const { data } = await sharp(path.join(IMAGES, f))
      .resize(12, 12, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return data;
  };
  const ref = [];
  for (const [f, esc] of conEscena) ref.push({ esc, sig: await firma(f) });
  const out = new Map();
  for (const f of pendientes) {
    const s = await firma(f);
    let mejor = null,
      md = Infinity;
    for (const r of ref) {
      let acc = 0;
      for (let i = 0; i < s.length; i++) {
        const d = s[i] - r.sig[i];
        acc += d * d;
      }
      if (acc < md) {
        md = acc;
        mejor = r.esc;
      }
    }
    out.set(f, mejor);
  }
  return out;
}

const conEscena = new Map();
for (const [f, a] of atribucion) if (a.escena) conEscena.set(f, a.escena);
const inferidas = await inferirEscenas(
  [...atribucion].filter(([, a]) => !a.escena).map(([f]) => f),
  conEscena,
);
for (const [f, esc] of inferidas) {
  const a = atribucion.get(f);
  a.escena = esc;
  a.escenaInferida = true;
}

// ── Agrupar por item y escribir ──────────────────────────────────────────────
const ms = (f) => Number(/generated-(\d+)/.exec(f)[1]);
const porItem = new Map();
const sinUbicar = [];
for (const f of archivos) {
  const a = atribucion.get(f);
  if (!a) {
    sinUbicar.push(f);
    continue;
  }
  if (!porItem.has(a.item)) porItem.set(a.item, []);
  porItem.get(a.item).push({ file: f, ...a, ms: ms(f) });
}

let enlazados = 0,
  yaEnlazadas = 0,
  soloEnJoyas = 0;
const resumen = [];
for (const [item, lista] of [...porItem].sort((a, b) => a[0] - b[0])) {
  lista.sort((a, b) => a.ms - b.ms);
  // Si de este item sólo existe lo que ya está en `joyas/`, no hay nada nuevo
  // que archivar: `renders/` sería una copia exacta de la carpeta de al lado.
  // Se crea únicamente cuando hay descartes que hoy no están en ningún lado.
  if (lista.every((r) => r.fuente === 'joyas')) {
    soloEnJoyas += lista.length;
    continue;
  }
  const dir = path.join(WORK, String(item), 'renders');
  const idx = [];
  const contador = {};
  for (const r of lista) {
    const esc = r.escena || 'sin-escena';
    contador[esc] = (contador[esc] || 0) + 1;
    const destino = `${esc}-${String(contador[esc]).padStart(2, '0')}.png`;
    const abs = path.join(dir, destino);
    if (!DRY) {
      fs.mkdirSync(dir, { recursive: true });
      const origen = path.join(IMAGES, r.file);
      if (fs.existsSync(abs)) {
        // Ya enlazado a la misma imagen → nada que hacer. Si apunta a otra,
        // rehacer el enlace (la numeración pudo correrse al aparecer renders
        // nuevos con timestamp intermedio).
        if (fs.statSync(abs).ino === fs.statSync(origen).ino) {
          yaEnlazadas++;
        } else {
          fs.unlinkSync(abs);
          fs.linkSync(origen, abs);
          enlazados++;
        }
      } else {
        fs.linkSync(origen, abs);
        enlazados++;
      }
    } else {
      const origen = path.join(IMAGES, r.file);
      const igual =
        fs.existsSync(abs) && fs.statSync(abs).ino === fs.statSync(origen).ino;
      igual ? yaEnlazadas++ : enlazados++;
    }
    idx.push({
      archivo: destino,
      origen: `images/${r.file}`,
      escena: r.escena,
      escenaInferida: r.escenaInferida || undefined,
      variante: r.variante,
      elegida: r.fuente === 'joyas',
      atribucion: r.fuente,
      generadoEn: new Date(r.ms).toISOString(),
    });
  }
  if (!DRY) {
    // La numeración va por tiempo, así que un render nuevo con timestamp
    // intermedio corre a los siguientes. Lo que sobró de una corrida anterior
    // se borra: es un hard link, el original en images/ no se toca.
    const vigentes = new Set(idx.map((x) => x.archivo));
    for (const f of fs.readdirSync(dir))
      if (f.endsWith('.png') && !vigentes.has(f))
        fs.unlinkSync(path.join(dir, f));
    fs.writeFileSync(
      path.join(dir, 'index.json'),
      JSON.stringify({ item, renders: idx }, null, 2) + '\n',
    );
  }
  const el = idx.filter((x) => x.elegida).length;
  resumen.push({ item, total: idx.length, elegidas: el });
}

// ── Reporte de lo que no se pudo ubicar, con el contexto de su corrida ───────
if (sinUbicar.length) {
  // Una "corrida" es un bloque de generaciones con menos de 15 min de hueco.
  const todas = archivos
    .map((f) => ({ f, ms: ms(f), a: atribucion.get(f) }))
    .sort((x, y) => x.ms - y.ms);
  let prev = 0,
    g = [];
  const corridas = [];
  for (const x of todas) {
    if (prev && x.ms - prev > 15 * 60000) {
      corridas.push(g);
      g = [];
    }
    g.push(x);
    prev = x.ms;
  }
  corridas.push(g);

  const lineas = [
    '# Renders sin ubicar',
    '',
    'Imágenes de `docs/Visualizer/images/` que ninguna fuente con nombre de item',
    'menciona: ni un `.pen`, ni un registro de candidatos, ni una confirmación de',
    'Pencil. Se dejaron donde están — atribuirlas sería adivinar.',
    '',
    'Cada bloque es una corrida de generación (cortes por huecos de más de 15 min).',
    'Cuando la corrida sí tocó items conocidos quedan listados: el archivo pertenece',
    'a alguno de ellos, pero no hay con qué decidir a cuál.',
    '',
    `Total sin ubicar: **${sinUbicar.length}** de ${archivos.length}.`,
    '',
  ];
  for (const c of corridas) {
    const huerf = c.filter((x) => !x.a);
    if (!huerf.length) continue;
    const items = [...new Set(c.filter((x) => x.a).map((x) => x.a.item))].sort(
      (a, b) => a - b,
    );
    const desde = new Date(c[0].ms)
      .toISOString()
      .slice(0, 16)
      .replace('T', ' ');
    const hasta = new Date(c[c.length - 1].ms).toISOString().slice(11, 16);
    lineas.push(`## ${desde}–${hasta} · ${huerf.length} sin ubicar`);
    lineas.push(
      items.length
        ? `Items de esta corrida: ${items.join(', ')}`
        : 'Corrida sin ningún item identificado (generaciones exploratorias sueltas).',
    );
    lineas.push('');
    for (const h of huerf) lineas.push(`- \`images/${h.f}\``);
    lineas.push('');
  }
  if (!DRY) fs.writeFileSync(SIN_UBICAR, lineas.join('\n'));
}

// ── Salida ───────────────────────────────────────────────────────────────────
const fuentes = {};
for (const f of archivos) {
  const k = atribucion.get(f)?.fuente || '(sin ubicar)';
  fuentes[k] = (fuentes[k] || 0) + 1;
}
console.log(`\nimágenes en images/: ${archivos.length}`);
for (const [k, v] of Object.entries(fuentes).sort((a, b) => b[1] - a[1]))
  console.log(`  ${String(v).padStart(4)}  ${k}`);
console.log(
  `\n${porItem.size} items atribuidos · ${resumen.length} con renders/ propio` +
    ` · ${enlazados} enlaces ${DRY ? 'a crear' : 'creados'}` +
    (yaEnlazadas ? ` · ${yaEnlazadas} ya enlazadas` : ''),
);
console.log(
  `${soloEnJoyas} imágenes son la única versión de su slot: ya viven en work/<item>/joyas/, no necesitan renders/.`,
);
for (const r of resumen)
  console.log(
    `  ${String(r.item).padEnd(5)} ${String(r.total).padStart(2)} renders  (${r.elegidas} elegidas · ${r.total - r.elegidas} descartes)`,
  );
if (sinUbicar.length)
  console.log(
    `${sinUbicar.length} sin ubicar → work/RENDERS-SIN-UBICAR.md${DRY ? ' (no escrito)' : ''}`,
  );
if (DRY) console.log('\n(dry-run: no se tocó nada)');
