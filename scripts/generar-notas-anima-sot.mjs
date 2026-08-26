/**
 * Genera (o regenera) las notas `item-NNN-slug.md` de la bóveda Anima a partir
 * de la pestaña "Inventario" del SOT v3.
 *
 * La HOJA es la fuente, no Convex: cuando una celda se escribe por API el
 * `onEdit` del Apps Script no dispara y Convex queda atrás. Generar desde
 * Convex escribiría el dato viejo en la nota.
 *
 * Qué respeta:
 *  - **Preserva las secciones escritas a mano.** Sólo reemplaza el frontmatter,
 *    el título, el resumen y la tabla `## Datos (SOT v3)`. Todo lo que venga
 *    después de esa tabla en otro `## ` se conserva tal cual (p. ej. la sección
 *    «Certificado» que el bot le agregó a #484).
 *  - **Conserva `created`** si la nota ya existe; sólo mueve `updated`.
 *  - **Redacta el piso de negociación.** La observación de varios ítems trae
 *    "Piso de negociación $X (× 3.5) — INTERNO, no se anuncia". La bóveda
 *    sincroniza a un repo de GitHub (privado, verificado 2026-08-23), y copiar
 *    ahí una cifra marcada INTERNO la propaga a un tercer almacén sin
 *    necesidad. Se deja constancia de que existe y dónde vive.
 *
 * Escribe en el scratchpad, no en la bóveda: la colocación se revisa aparte.
 *
 * Uso:
 *   node scripts/generar-notas-anima-sot.mjs --out <dir> 482 484 544 546
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
} from 'node:fs';
import { google } from 'googleapis';
import { config } from 'dotenv';
import { FOTO_INVENTARIO_COLUMNS } from '../api/_lib/fotosintesis-inventory-columns.js';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const argv = process.argv.slice(2);
const valOf = (f) => {
  const i = argv.indexOf(f);
  return i >= 0 ? argv[i + 1] : undefined;
};
const OUT = valOf('--out');
if (!OUT) throw new Error('Falta --out <dir>');
const IDS = argv.filter((a) => /^\d+$/.test(a));
if (!IDS.length) throw new Error('Pasá ítems, ej. 482 484 544 546');

const VAULT = `${process.env.HOME}/Movies/coomunity-universe/Obsidian/Anima/Wings/Projects/TierraMadre/inventario`;
const HOY = new Date().toISOString().slice(0, 10);
const TAB = 'Inventario';

const SHEET_ID = process.env.FOTOSINTESIS_SPREADSHEET_ID;
const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
const creds = JSON.parse(
  raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'),
);
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
});

const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows = data.values ?? [];
const headers = (rows[0] ?? []).map((h) => String(h).trim());
const colItem = headers.indexOf('Item');

/** Columnas A–AP: el bloque que estas notas espejan históricamente. */
const HASTA = headers.indexOf('rangoDescuento');
const slug = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Saca la frase del piso y deja constancia de que existía. */
const redactarPiso = (txt) => {
  const s = String(txt ?? '');
  if (!/Piso de negociaci/i.test(s)) return { texto: s, redactado: false };
  // El punto NO sirve de fin de frase: "$136.241.077" lleva puntos de millar y
  // cortar en el primero deja "241.077 (× 3.5) — INTERNO" dentro del texto, que
  // es peor que no redactar. Se ancla en el cierre real de la frase.
  const limpio = s
    .replace(/Piso de negociaci[\s\S]*?no se anuncia\.\s*/gi, '')
    .replace(/Piso de negociaci(?:[^.]|\.(?=\d))*\.\s*/gi, '')
    .replace(/\s+·\s+·\s+/g, ' · ')
    .trim();
  return { texto: limpio, redactado: true };
};

mkdirSync(OUT, { recursive: true });

for (const id of IDS) {
  const idx = rows.findIndex(
    (r, i) => i > 0 && String(r[colItem] ?? '').trim() === id,
  );
  if (idx < 0) {
    console.log(`#${id} — no está en la hoja, salteado`);
    continue;
  }
  const row = rows[idx];
  const sheetRow = idx + 1;
  const get = (h) => {
    const i = headers.indexOf(h);
    const v = i >= 0 ? row[i] : '';
    return v === undefined || v === null || String(v).trim() === ''
      ? ''
      : String(v).trim();
  };

  const nombre = get('Nombre') || `Ítem ${id}`;
  const estado = get('ESTADO') || '';
  const categoria = get('Categoría') || '';
  const precio = get('precioFinalCOP');
  const nombreSlug = `item-${id}-${slug(nombre)}`;

  // ¿Existe ya? Recuperar `created` y las secciones a mano.
  const existentes = existsSync(VAULT)
    ? readdirSync(VAULT).filter(
        (f) => f.startsWith(`item-${id}-`) && f.endsWith('.md'),
      )
    : [];
  let created = HOY;
  let extra = '';
  let archivoPrevio = null;
  if (existentes.length) {
    archivoPrevio = existentes[0];
    const prev = readFileSync(`${VAULT}/${archivoPrevio}`, 'utf8');
    const mc = prev.match(/^created:\s*(.+)$/m);
    if (mc) created = mc[1].trim();
    // Todo lo que venga en un `## ` posterior a la tabla de datos se conserva.
    const iDatos = prev.indexOf('## Datos (SOT v3)');
    if (iDatos >= 0) {
      const resto = prev.slice(iDatos + 1);
      const m = resto.match(/\n(## (?!Datos \(SOT v3\)).*)$/s);
      if (m) extra = m[1].trimEnd();
    }
  }

  const { texto: obs, redactado } = redactarPiso(get('observacion'));

  // ── Tabla A–AP, con las cabeceras reales de la hoja ──
  const filas = [];
  for (let i = 0; i <= HASTA; i++) {
    const h = headers[i];
    if (!h || h === '(sin uso)') continue;
    let v = row[i];
    v =
      v === undefined || v === null || String(v).trim() === ''
        ? '—'
        : String(v).trim();
    if (h === 'observacion') v = obs || '—';
    filas.push([h, v]);
  }
  const anchoK = Math.max(...filas.map((f) => f[0].length), 5);
  const tabla = [
    `| ${'Campo'.padEnd(anchoK)} | Valor |`,
    `| ${'-'.repeat(anchoK)} | ----- |`,
    ...filas.map(
      ([k, v]) => `| ${k.padEnd(anchoK)} | ${v.replace(/\|/g, '\\|')} |`,
    ),
  ].join('\n');

  const tags = [
    'inventario',
    'sot-v3',
    `item-${id}`,
    categoria ? slug(categoria) : null,
    estado ? slug(estado) : null,
  ].filter(Boolean);

  const resumen = [
    categoria === 'Gema' ? 'Gema' : categoria || 'Ítem',
    get('tipoEsmeralda') ? `(${get('tipoEsmeralda').toLowerCase()})` : '',
    get('Peso (ct)') ? `de ${get('Peso (ct)')} ct` : '',
    get('Calidad') ? `, calidad ${get('Calidad')}` : '',
    get('Color') ? `, color ${get('Color')}` : '',
    '.',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.])/g, '$1');

  const md = `---
wing: Projects
room: TierraMadre/inventario
type: fact
created: ${created}
updated: ${HOY}
tags:
${tags.map((t) => `  - ${t}`).join('\n')}
links:
  - "[[inventario-sot-v3-indice]]"
importance: 1
source: SOT v3 · Inventario-Fotosíntesis · SOT Limpia (v3), fila ${sheetRow}, leído de la hoja ${HOY}
item: ${id}
estado: ${estado ? `"${estado}"` : '""'}
coleccion: ${get('Colección') ? `"${get('Colección')}"` : '""'}
categoria: ${categoria ? `"${categoria}"` : '""'}
precioFinalCOP: ${precio || 'null'}
---

# ${nombre} — Ítem #${id}

${resumen} Pertenece al lote ${get('loteId') || '(sin lote)'} y su estado es **${estado || '(vacío)'}**${
    get('UBICACIÓN') ? `, ubicada en ${get('UBICACIÓN')}` : ''
  }.${get('mostrarEnCatalogo') === 'TRUE' || get('mostrarEnCatalogo') === 'true' ? ' Se muestra en catálogo.' : ' No se muestra en catálogo.'}

## Datos (SOT v3)

${tabla}
${
  redactado
    ? `
> **Piso de negociación omitido a propósito.** La observación del SOT trae una cifra
> marcada «INTERNO, no se anuncia». Esta bóveda sincroniza a un repositorio remoto,
> así que la cifra no se copia acá: vive en la columna AA del SOT.
`
    : ''
}${extra ? `\n${extra}\n` : ''}`;

  writeFileSync(`${OUT}/${nombreSlug}.md`, md);
  const renombre =
    archivoPrevio && archivoPrevio !== `${nombreSlug}.md`
      ? `  (renombra: ${archivoPrevio} → ${nombreSlug}.md)`
      : '';
  console.log(
    `${archivoPrevio ? 'regenera' : 'CREA   '} ${nombreSlug}.md · fila ${sheetRow} · ${estado || '(sin estado)'}` +
      `${redactado ? ' · piso redactado' : ''}${extra ? ' · conserva secciones a mano' : ''}${renombre}`,
  );
}
