/**
 * Cierra el ciclo "gema → joya" en el SOT v3: una piedra que ya fue engastada
 * deja de ser stock suelto y su valor pasa a la pieza terminada.
 *
 * El problema, tal como se ve en la hoja: la joya #399 «Hojas de Otoño» declara
 * en su observación «Gema: Diástole y Sístole #344 (ya en inventario)», pero la
 * gema #344 sigue con mostrarEnCatalogo=TRUE. El catálogo muestra las dos cosas
 * y el mismo objeto físico aparece dos veces.
 *
 * NO hay doble conteo de COSTO — y conviene dejarlo escrito porque es
 * contraintuitivo. costoBaseCOP de la gema sale del lote del PROVEEDOR de gemas
 * (C-003/C-004/C-007, Edwin Mauricio Ruiz); el de la joya sale del lote del
 * TALLER (C-023/C-024/C-025, Taller de Bronce El Rey). Son dos compras
 * distintas, cada una con su costo real. Lo que sí estaba mal:
 *
 *   1. ACTIVO INFLADO — 7 gemas que ya no existen sueltas seguían contando como
 *      stock disponible ($970.700 a costo, $2.523.820 a precio de lista).
 *   2. JOYAS SUBVALORADAS — precioFinalCOP salía de costoTaller × 2.6, así que
 *      la esmeralda engastada no entraba en el precio. El Choker Rosa #395 se
 *      vendía a $467.932 sin cobrar la piedra que su propia ficha lista en
 *      $338.000.
 *
 * REGLA DE PRECIO aplicada (Regla B) — la que dictó el dueño el 2026-07-22, en
 * `Anima/Wings/Projects/TierraMadre/decisions/2026-07-22-costeo-anillos-gemas-transformadas.md`:
 * «el precio de la gema NO se multiplica por nada — se le suma directo el costo
 * de producción/joyería». Es decir: precioJoya = Σ precioGema + costoTaller.
 * Ojo: con esta regla #398 BAJA de precio ($860.652 → $803.700); es el
 * resultado correcto de la regla, no un error de cálculo.
 *
 * Marcado de la gema consumida: mostrarEnCatalogo=FALSE + trazabilidad en la
 * observación. Deliberadamente NO se toca ESTADO — `estado` es una unión cerrada
 * en convex/schema.ts y en INV_ESTADOS (convex/_lib/sheetPullMaps.ts), así que
 * un valor nuevo tipo "TRANSFORMADA" sería rechazado en el pull sin cambiar
 * código y desplegar. La fila se conserva: es la única traza del costo de la
 * piedra.
 *
 * Uso:  node scripts/sot-v3-transformacion-gemas-joyas.mjs           # dry-run
 *       node scripts/sot-v3-transformacion-gemas-joyas.mjs --apply
 *
 * Tras --apply hay que propagar a producción:
 *       node scripts/sync-sot-convex.mjs --prod
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const HOY = '2026-07-24';

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) throw new Error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

// ── columnas (índice 0-based → letra) ───────────────────────────────────────
const COL = {
  item: 0,
  nombre: 2,
  cant: 6,
  categoria: 10,
  costo: 11,
  precio: 12,
  estado: 16,
  catalogo: 24,
  observacion: 26,
  subtipoForm: 32,
  tipoJoya: 33,
  notas: 56,
};
const letra = (i) =>
  i < 26
    ? String.fromCharCode(65 + i)
    : String.fromCharCode(64 + Math.floor(i / 26)) +
      String.fromCharCode(65 + (i % 26));

const money = (s) => Number(String(s ?? '').replace(/[^\d.-]/g, '')) || 0;
const fmt = (v) => '$' + Math.round(v).toLocaleString('es-CO');

// ── 1. Gemas engastadas en las joyas #395–#401 ──────────────────────────────
// `frac` = porción de la gema consumida (1 = la pieza entera).
const MONTAJES = [
  { joya: 395, joyaNom: 'Choker Rosa', gemas: [{ id: 327, frac: 1 }] },
  {
    joya: 396,
    joyaNom: 'Flor del Solsticio de Primavera',
    gemas: [{ id: 343, frac: 1 }],
  },
  { joya: 397, joyaNom: 'Rositas', gemas: [{ id: 345, frac: 1 }] },
  { joya: 398, joyaNom: 'Choker Círculos', gemas: [{ id: 341, frac: 1 }] },
  { joya: 399, joyaNom: 'Hojas de Otoño', gemas: [{ id: 344, frac: 1 }] },
  { joya: 400, joyaNom: 'Anillo', gemas: [{ id: 329, frac: 1 }] },
  {
    joya: 401,
    joyaNom: 'Arete',
    // #330 «La grandeza de Dios» es consumo PARCIAL: la observación de #401
    // dice "1 de 5 unidades". Se cobra 1/5 en el precio pero la gema NO se
    // oculta del catálogo — sigue habiendo unidades disponibles.
    gemas: [
      { id: 330, frac: 0.2, parcial: true },
      { id: 328, frac: 1 },
    ],
  },
];

// ── 2. Piezas que Anima confirma terminadas pero la hoja sigue tipando "Gema" ─
// No son duplicados de catálogo (ninguna está publicada): es deuda de tipado.
// Se re-tipifican en sitio, no se ocultan.
const RETIPIFICAR = [
  // Lote C-053 · 9 anillos de mujer — Anima/…/legacy-pre-sot-v3/2026-07-10-lote-9-anillos-mujer.md
  // #80 «Grecia» queda EXCLUIDA a propósito: la montura cuadrada no calza con
  // la gema ovalada, volvió al taller y la piedra quedó suelta (2026-07-18).
  {
    id: 241,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'lote 9 anillos C-053',
  },
  {
    id: 263,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'lote 9 anillos C-053',
  },
  {
    id: 237,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'lote 9 anillos C-053',
  },
  {
    id: 239,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'lote 9 anillos C-053',
  },
  {
    id: 238,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'item-238-encantada (kardex)',
  },
  {
    id: 246,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'item-246-danza-del-bosque (kardex)',
  },
  {
    id: 250,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'lote 9 anillos C-053',
  },
  {
    id: 443,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'lote 9 anillos C-053',
  },
  // Costeo 2026-07-22 — cinco gemas «ya volvieron como joya terminada»
  {
    id: 75,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'costeo-anillos-gemas-transformadas',
  },
  {
    id: 79,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'costeo-anillos-gemas-transformadas',
  },
  {
    id: 286,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    src: 'costeo-anillos-gemas-transformadas',
  },
  {
    id: 358,
    cat: 'Anillo en Plata',
    tipoJoya: 'Anillo Mujer',
    sub: 'Lote de joyas',
    src: 'costeo — lote de 5 gemas → 5 anillos',
  },
  {
    id: 98,
    cat: 'Anillo en Oro',
    tipoJoya: 'Anillo Mujer',
    src: 'costeo — anillo de oro',
  },
];

// ── lectura ─────────────────────────────────────────────────────────────────
const inv =
  (
    await sheets.spreadsheets.values.get({
      spreadsheetId: SOT3,
      range: `'Inventario'!A:BE`,
    })
  ).data.values || [];

const filaDe = new Map();
inv.slice(1).forEach((r, i) => {
  if (r && String(r[0] ?? '').trim()) filaDe.set(String(r[0]).trim(), i + 2);
});
const celda = (id, c) => {
  const f = filaDe.get(String(id));
  return f ? String(inv[f - 1][c] ?? '').trim() : '';
};

const updates = [];
const backup = [];
const avisos = [];
const push = (id, col, valor) => {
  const f = filaDe.get(String(id));
  if (!f) throw new Error(`ítem #${id} no existe en Inventario`);
  backup.push({
    item: id,
    fila: f,
    col: letra(col),
    antes: inv[f - 1][col] ?? '',
  });
  updates.push({
    range: `'Inventario'!${letra(col)}${f}`,
    values: [[valor]],
  });
};

// ── BLOQUE 1 · precio de las joyas (Regla B) ────────────────────────────────
console.log(
  '\n═══ BLOQUE 1 · PRECIO DE LAS JOYAS — Regla B (precioGema + costoTaller) ═══\n',
);
console.log(
  'joya                            precio actual   →   precio Regla B      delta',
);
console.log('─'.repeat(84));
let totalAntes = 0;
let totalDespues = 0;
for (const m of MONTAJES) {
  const costoTaller = money(celda(m.joya, COL.costo));
  const precioActual = money(celda(m.joya, COL.precio));
  let precioGemas = 0;
  const detalle = [];
  for (const g of m.gemas) {
    const p = money(celda(g.id, COL.precio)) * g.frac;
    precioGemas += p;
    detalle.push(
      `#${g.id}${g.frac < 1 ? ` (${g.frac * 100}%)` : ''} ${fmt(p)}`,
    );
  }
  const nuevo = Math.round(precioGemas + costoTaller);
  totalAntes += precioActual;
  totalDespues += nuevo;
  const delta = nuevo - precioActual;
  console.log(
    `#${m.joya} ${m.joyaNom.slice(0, 26).padEnd(27)} ${fmt(precioActual).padStart(12)}   →   ${fmt(nuevo).padStart(12)} ${(delta >= 0 ? '+' : '') + fmt(delta).padStart(11)}`,
  );
  console.log(
    `      gemas: ${detalle.join(' + ')}  ·  taller: ${fmt(costoTaller)}`,
  );
  if (delta < 0)
    avisos.push(
      `#${m.joya} «${m.joyaNom}» BAJA de precio ${fmt(precioActual)} → ${fmt(nuevo)} (consecuencia esperada de la Regla B)`,
    );
  push(m.joya, COL.precio, nuevo);
  const gemasTxt = m.gemas
    .map((g) => `#${g.id}${g.frac < 1 ? ` (${g.frac * 100}%)` : ''}`)
    .join(' + ');
  push(
    m.joya,
    COL.notas,
    `Precio ${HOY} por Regla B (precio gema ${gemasTxt} + costo joyería, gema sin multiplicar) — Anima decisions/2026-07-22-costeo-anillos-gemas-transformadas.`,
  );
}
console.log('─'.repeat(84));
console.log(
  `TOTAL 7 joyas                   ${fmt(totalAntes).padStart(12)}   →   ${fmt(totalDespues).padStart(12)} ${'+' + fmt(totalDespues - totalAntes).padStart(11)}`,
);

// ── BLOQUE 2 · retirar del catálogo las gemas consumidas ────────────────────
console.log('\n\n═══ BLOQUE 2 · GEMAS ENGASTADAS — salen del catálogo ═══\n');
let activoLiberado = 0;
for (const m of MONTAJES) {
  for (const g of m.gemas) {
    const nom = celda(g.id, COL.nombre);
    const obs = celda(g.id, COL.observacion);
    const catalogo = celda(g.id, COL.catalogo);
    const costo = money(celda(g.id, COL.costo));

    if (g.parcial) {
      const cant = celda(g.id, COL.cant);
      console.log(`◐ #${g.id} «${nom}» — CONSUMO PARCIAL, se mantiene visible`);
      console.log(`     Cant=${cant} · engastada 1 unidad en joya #${m.joya}`);
      const nota = `Consumo parcial ${HOY}: 1 unidad engastada en joya #${m.joya} «${m.joyaNom}». DISCREPANCIA sin resolver: Cant=${cant} en la hoja pero la observación de #${m.joya} dice "1 de 5 unidades" — confirmar el conteo real antes de ajustar.`;
      push(g.id, COL.observacion, obs ? `${obs} · ${nota}` : nota);
      avisos.push(
        `#${g.id} «${nom}»: Cant=${cant} vs "1 de 5 unidades" en #${m.joya} — cantidad NO modificada, requiere confirmación humana`,
      );
      continue;
    }

    activoLiberado += costo;
    console.log(`● #${g.id} «${nom}» → joya #${m.joya} «${m.joyaNom}»`);
    console.log(
      `     mostrarEnCatalogo: ${catalogo || '(vacío)'} → FALSE   ·   costo que deja de contar como stock suelto: ${fmt(costo)}`,
    );
    push(g.id, COL.catalogo, 'FALSE');
    const nota = `Transformada ${HOY}: engastada en la joya #${m.joya} «${m.joyaNom}». Fila conservada para trazar el costo de la piedra — NO es stock disponible.`;
    push(g.id, COL.observacion, obs ? `${obs} · ${nota}` : nota);
  }
}
console.log(
  `\n  Activo que deja de contarse como gema suelta: ${fmt(activoLiberado)}`,
);

// ── BLOQUE 3 · re-tipificar piezas terminadas ───────────────────────────────
console.log(
  '\n\n═══ BLOQUE 3 · RE-TIPIFICADO (Anima) — piezas ya terminadas tipadas como "Gema" ═══\n',
);
for (const r of RETIPIFICAR) {
  const nom = celda(r.id, COL.nombre);
  if (!nom) {
    avisos.push(`#${r.id} no existe en Inventario — omitido`);
    console.log(`⚠ #${r.id} no existe — omitido`);
    continue;
  }
  const sub = r.sub ?? 'Joya';
  const catAntes = celda(r.id, COL.categoria);
  const catalogo = celda(r.id, COL.catalogo);
  console.log(
    `#${String(r.id).padStart(3)} «${nom.slice(0, 30).padEnd(31)}» ${catAntes.padEnd(15)} → ${r.cat} / ${sub} / ${r.tipoJoya}`,
  );
  if (/^true$/i.test(catalogo)) {
    avisos.push(
      `#${r.id} «${nom}» está PUBLICADO (mostrarEnCatalogo=TRUE) — re-tipificado igual, revisar si debe seguir visible`,
    );
  }
  push(r.id, COL.categoria, r.cat);
  push(r.id, COL.subtipoForm, sub);
  push(r.id, COL.tipoJoya, r.tipoJoya);
  const obs = celda(r.id, COL.observacion);
  const nota = `Re-tipificada ${HOY}: pieza ya terminada (${r.tipoJoya}), no gema suelta. Fuente: Anima ${r.src}.`;
  push(r.id, COL.observacion, obs ? `${obs} · ${nota}` : nota);
}

// discrepancias detectadas contra Anima que NO se corrigen automáticamente
if (celda(241, COL.nombre) && celda(241, COL.nombre) !== 'Ra')
  avisos.push(
    `#241 se llama «${celda(241, COL.nombre)}» en la hoja pero «Ra» en Anima — nombre NO modificado`,
  );
if (celda(239, COL.categoria) && celda(239, 23) !== 'C-053')
  avisos.push(
    `#239 «${celda(239, COL.nombre)}» tiene lote ${celda(239, 23)} en la hoja pero Anima lo ubica en C-053 — lote NO modificado`,
  );

// ── avisos ──────────────────────────────────────────────────────────────────
if (avisos.length) {
  console.log('\n\n═══ REQUIERE OJO HUMANO (no se toca automáticamente) ═══\n');
  avisos.forEach((a) => console.log(`  ⚠ ${a}`));
}

// ── escritura ───────────────────────────────────────────────────────────────
console.log(
  `\n\n═══ ${updates.length} celdas en ${new Set(backup.map((b) => b.item)).size} ítems ═══`,
);
if (!APPLY) {
  console.log(
    '\nDRY-RUN — no se escribió nada. Repetí con --apply para aplicar.\n',
  );
} else {
  writeFileSync(
    'scripts/.backup-transformacion-gemas-joyas.json',
    JSON.stringify(backup, null, 2),
  );
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SOT3,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
  });
  console.log(
    '\n✔ Aplicado. Backup en scripts/.backup-transformacion-gemas-joyas.json',
  );
  console.log(
    '  Propagá a producción con:  node scripts/sync-sot-convex.mjs --prod\n',
  );
}
