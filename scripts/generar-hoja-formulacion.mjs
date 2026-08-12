/**
 * Genera la hoja «Paso 1 · precio base de cada gema/piedra» en el libro
 * «Formulación Comercializadora» (1XpHmCt…), pestaña gid 0, poblada desde SOT v3.
 *
 * Formato (de la imagen de referencia):
 *   Lote | Nombre | Ct | Costo Lote | Cantidad | Ct Lote | Costo Unit. |
 *   Costo Inv. Total | % | Variables | Aporte a costos variables
 *
 * Modelo:
 *   Costo Inv. Total = Σ costoTotalCOP de TODOS los lotes  (celda-parámetro B2)
 *   Variables (pool) = celda-parámetro B3  (EDITABLE — tu "otro monto")
 *   Costo Unit.      = costoBaseCOP del ítem (o Costo Lote/Cantidad en lotes sin ítems)
 *   %                = (ítem: Costo Unit / Total) · (lote sin ítems: Costo Lote / Total)
 *   Aporte           = % × Variables
 *
 * Todos los 113 lotes: los que tienen ítems → una fila por ítem (Lote/Costo Lote/
 * Ct Lote combinados); los vacíos → una fila resumen.
 *
 * Uso:  node scripts/generar-hoja-formulacion.mjs           # dry-run (no escribe)
 *       node scripts/generar-hoja-formulacion.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const DEST = '1XpHmCt99rQsUfEkjiaFw8tF-l_SqUfxtBDX9zU8qu1w';
const GID = 0;

const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});
const c = (v) =>
  String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const money = (s) => Number(String(s ?? '').replace(/[^\d.-]/g, '')) || 0;
const num = (s) => {
  const n = Number(
    String(s ?? '')
      .replace(',', '.')
      .replace(/[^\d.-]/g, ''),
  );
  return Number.isFinite(n) && String(s).trim() !== '' ? n : null;
};
const read = async (r) =>
  (await sheets.spreadsheets.values.get({ spreadsheetId: SOT3, range: r })).data
    .values || [];

const inv = await read(`'Inventario'!A:AZ`);
const lotes = await read(`'Lotes'!A:U`);
const H = inv[0].map(c);
const iLike = (n) =>
  H.findIndex((h) => h.toLowerCase().includes(n.toLowerCase()));
const IC = {
  item: 0,
  nombre: 2,
  peso: 3,
  cant: 6,
  cat: iLike('categor'),
  costo: iLike('costobase') >= 0 ? iLike('costobase') : 11,
  lote: iLike('loteid'),
  estado: iLike('estado'),
  ubi: iLike('ubicaci'),
};
const LC = { id: 0, costo: 4, ct: 3, uds: 5, estado: 13, renombre: 14 };

// Exclusiones: ítems VENDIDA, ítems de Bogotá (UBICACIÓN ~ "bogota") y una lista
// explícita de itemIds (los del ejemplo Otoño/Jardín Secreto/etc que se piden borrar).
const EXCL_VENDIDA = /vendid/i;
const EXCL_BOGOTA = /bogot/i;
// itemIds de la lista de borrado (resueltos contra SOT v3, con consolidaciones):
// 353 Territorio de Paz, 354 Flora ll, 355 Flórcienta (C-011); 429 Coral,
// 430 Estrellas de la Tierra, 431 Toj, 432 Kawok, 433 Ojo de Dragón (C-006);
// 476 Asteroides Verdes III / "40 murrallas" (C-061).
const DELETE_ITEM_IDS = new Set([
  '353',
  '354',
  '355',
  '429',
  '430',
  '431',
  '432',
  '433',
  '476',
  // + resueltos por cantidad (nombres distintos al ejemplo):
  '362', // Cuarto Menguante (= "4 comerciales redondas")
  '380', // Momentum (= "17 chispitas extrafinas")
  '435', // Rocas Lunares - Sub-lote 2 (= "14 piedra cristal")
  '511', // Estrella Solar (= "1 com. redonda grande")
]);

// Índice de ítems por lote (ya filtrado) + huérfanos (sin lote) agrupados por categoría.
// `hadItems` recuerda qué lotes tenían ítems antes de filtrar, para no mostrar como
// "resumen" un lote cuyos ítems se excluyeron por completo.
const itemsByLote = new Map();
const orphanByCat = new Map();
const hadItems = new Set();
let exclVend = 0;
let exclBog = 0;
let exclDel = 0;
for (let i = 1; i < inv.length; i++) {
  const r = inv[i];
  if (!r || !r.some((x) => c(x) !== '')) continue;
  const itemId = c(r[IC.item]);
  const lid = c(r[IC.lote]);
  if (lid) hadItems.add(lid); // el lote tuvo ítems (aunque luego se excluyan)
  if (EXCL_VENDIDA.test(c(r[IC.estado]))) {
    exclVend++;
    continue;
  }
  if (EXCL_BOGOTA.test(c(r[IC.ubi]))) {
    exclBog++;
    continue;
  }
  if (DELETE_ITEM_IDS.has(itemId)) {
    exclDel++;
    continue;
  }
  const item = {
    nombre: c(r[IC.nombre]) || `#${itemId}`,
    ct: num(r[IC.peso]),
    cant: num(r[IC.cant]) || 1,
    costo: money(r[IC.costo]),
  };
  if (lid) {
    if (!itemsByLote.has(lid)) itemsByLote.set(lid, []);
    itemsByLote.get(lid).push(item);
  } else {
    const cat = c(r[IC.cat]) || 'Sin categoría';
    if (!orphanByCat.has(cat)) orphanByCat.set(cat, []);
    orphanByCat.get(cat).push(item);
  }
}
const orphanContrib = [...orphanByCat.values()]
  .flat()
  .reduce((a, it) => a + it.costo, 0);
console.log(
  `Excluidos → vendidos: ${exclVend} · Bogotá: ${exclBog} · lista: ${exclDel}`,
);
console.log(
  `Huérfanos (sin lote) agrupados: ${[...orphanByCat.values()].flat().length} en ${orphanByCat.size} categorías`,
);

// Lotes excluidos SOLO de esta hoja (no se borran de SOT): placeholders "Origen".
const EXCLUDE_LOTES = new Set(['C-017', 'S-001']);

// Lista de lotes, ordenada por prefijo y número
const loteRows = lotes
  .slice(1)
  .filter((r) => c(r[0]) && !EXCLUDE_LOTES.has(c(r[0])));
const prefRank = { C: 0, MED: 1, LC: 2, LR: 3, B: 4, S: 5 };
const parseId = (id) => {
  const m = id.match(/^([A-Za-z]+)-?(\d+)?/);
  return [prefRank[m?.[1]] ?? 9, m?.[1] ?? id, Number(m?.[2] ?? 0)];
};
loteRows.sort((a, b) => {
  const [pa, sa, na] = parseId(c(a[0]));
  const [pb, sb, nb] = parseId(c(b[0]));
  return pa - pb || sa.localeCompare(sb) || na - nb;
});

// Σ Costo Lote declarado (referencia) y Σ real a repartir (base consistente).
// El denominador del % es la suma de las MISMAS contribuciones que van al numerador:
// costo de cada ítem (lotes con ítems) + Costo Lote (lotes sin ítems). Así Σ% = 100%
// y Σ Aporte = pool de Variables, sin importar que Costo Lote ≠ Σítems en algunos lotes.
const totalLoteDeclarado = loteRows.reduce((s, r) => s + money(r[LC.costo]), 0);
const contribTotal =
  loteRows.reduce((s, r) => {
    const id = c(r[LC.id]);
    const its = itemsByLote.get(id) || [];
    if (its.length) return s + its.reduce((a, it) => a + it.costo, 0);
    if (hadItems.has(id)) return s; // sus ítems fueron excluidos → no aporta
    return s + money(r[LC.costo]); // lote genuinamente vacío → aporta su costo
  }, 0) + orphanContrib; // + ítems huérfanos agrupados

// ── Construir filas de la tabla ──────────────────────────────────────────
// Header en fila 5 (fila 1 título, 2-3 parámetros, 4 vacía).
const HEADER_ROW = 5;
const rows = []; // arrays de 11 celdas (A..K)
const merges = []; // {r0,r1,c0,c1}
const groupBands = []; // [r0,r1] para sombrear grupos alternos
let r = HEADER_ROW + 1; // primera fila de datos (1-based)

for (const lr of loteRows) {
  const id = c(lr[LC.id]);
  const costoLote = money(lr[LC.costo]);
  const ctLote = num(lr[LC.ct]);
  const its = itemsByLote.get(id) || [];
  // Lote cuyos ítems fueron todos excluidos (vendidos/Bogotá) → no va a la tabla.
  if (its.length === 0 && hadItems.has(id)) continue;
  const start = r;

  if (its.length > 0) {
    // La hoja solo muestra ítems DISPONIBLES (vendidos/Bogotá/borrados ya filtrados),
    // así que el "Costo Lote" y "Ct Lote" deben ser la suma SOLO de los ítems
    // mostrados — no el total declarado del lote (que incluye vendidas).
    const costoKept = its.reduce((a, it) => a + it.costo, 0);
    const ctKept = its.reduce((a, it) => a + (it.ct || 0), 0) || null;
    its.forEach((it, k) => {
      const gr = r; // fila actual (1-based)
      rows.push([
        k === 0 ? id : '', // A Lote (merge)
        it.nombre, // B Nombre
        it.ct ?? '', // C Ct
        k === 0 ? costoKept : '', // D Costo Lote = Σ ítems mostrados (solo disponibles)
        it.cant, // E Cantidad
        k === 0 ? (ctKept ?? '') : '', // F Ct Lote = Σ Ct de ítems mostrados
        it.costo, // G Costo Unit
        '=$B$2', // H Costo Inv Total
        `=G${gr}/$B$2`, // I %
        '=$B$3', // J Variables
        `=I${gr}*$B$3`, // K Aporte
      ]);
      r++;
    });
    if (its.length > 1) {
      merges.push({ r0: start, r1: r, c0: 0, c1: 1 }); // A
      merges.push({ r0: start, r1: r, c0: 3, c1: 4 }); // D
      merges.push({ r0: start, r1: r, c0: 5, c1: 6 }); // F
    }
  } else {
    // Lote sin ítems → fila resumen; % se basa en el Costo Lote.
    const gr = r;
    const uds = num(lr[LC.uds]) || 1;
    const nombre = c(lr[LC.renombre]) || '(sin ítems cargados)';
    rows.push([
      id,
      nombre,
      ctLote ?? '',
      costoLote,
      uds,
      ctLote ?? '',
      `=D${gr}`, // G Costo Unit = Costo Lote (sin dividir por Cantidad)
      '=$B$2', // H
      `=D${gr}/$B$2`, // I % (lote completo / total)
      '=$B$3', // J
      `=I${gr}*$B$3`, // K
    ]);
    r++;
  }
  groupBands.push([start, r]); // [primera, siguiente) del grupo
}

// ── Huérfanos: ítems sin lote, agrupados por categoría bajo "SIN LOTE · {cat}" ──
const orphanCats = [...orphanByCat.entries()].sort(
  (a, b) => b[1].length - a[1].length,
);
for (const [cat, its] of orphanCats) {
  const start = r;
  const costoGrupo = its.reduce((a, it) => a + it.costo, 0);
  const ctGrupo = its.reduce((a, it) => a + (it.ct || 0), 0) || null;
  const label = `SIN LOTE · ${cat}`;
  its.forEach((it, k) => {
    const gr = r;
    rows.push([
      k === 0 ? label : '', // A (merge)
      it.nombre,
      it.ct ?? '',
      k === 0 ? costoGrupo : '', // D Costo del grupo = Σ ítems
      it.cant,
      k === 0 ? (ctGrupo ?? '') : '', // F
      it.costo, // G Costo Unit
      '=$B$2',
      `=G${gr}/$B$2`,
      '=$B$3',
      `=I${gr}*$B$3`,
    ]);
    r++;
  });
  if (its.length > 1) {
    merges.push({ r0: start, r1: r, c0: 0, c1: 1 });
    merges.push({ r0: start, r1: r, c0: 3, c1: 4 });
    merges.push({ r0: start, r1: r, c0: 5, c1: 6 });
  }
  groupBands.push([start, r]);
}

const lastRow = r - 1;
console.log(
  `Lotes: ${loteRows.length} · filas de datos: ${lastRow - HEADER_ROW}`,
);
console.log(
  `Costo base total (Σ a repartir): $${contribTotal.toLocaleString('es-CO')} · Σ Costo Lote declarado: $${totalLoteDeclarado.toLocaleString('es-CO')}`,
);
console.log(`Modo: ${APPLY ? 'APLICAR ✍️' : 'DRY-RUN'}`);
if (!APPLY) {
  console.log('\nPrimeras filas de ejemplo:');
  rows.slice(0, 12).forEach((x) =>
    console.log(
      '  ' +
        x
          .slice(0, 7)
          .map((v) => String(v).slice(0, 18))
          .join(' | '),
    ),
  );
  console.log(
    '\nDry-run. Re-ejecuta con --apply para escribir en el libro destino.',
  );
  process.exit(0);
}

// ── Descombinar ANTES de escribir ────────────────────────────────────────
// Si quedaron celdas combinadas de una corrida previa, escribir sobre una celda
// combinada pierde el valor de las celdas "tapadas" (se perdían filas de % y
// grupos completos). Hay que deshacer los merges ANTES del values.update.
await sheets.spreadsheets.batchUpdate({
  spreadsheetId: DEST,
  requestBody: { requests: [{ unmergeCells: { range: { sheetId: GID } } }] },
});

// ── Escritura de valores ─────────────────────────────────────────────────
const HEADERS = [
  'Lote',
  'Nombre',
  'Ct',
  'Costo Lote',
  'Cantidad',
  'Ct Lote',
  'Costo Unit.',
  'Costo Inv. Total',
  '%',
  'Variables',
  'Aporte a costos variables',
];
const values = [];
values[0] = [
  'Paso 1 · asignación de precio base de cada gema/piedra — Lotes e ítems (SOT v3)',
];
values[1] = [
  'Costo base total (Σ a repartir):',
  contribTotal,
  '',
  'Σ Costo Lote declarado:',
  totalLoteDeclarado,
  '',
  '',
  '',
  '',
  '',
  '',
];
values[2] = [
  'Variables (pool) — escribe tu monto →',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
];
values[3] = [];
values[4] = HEADERS;
rows.forEach((x, i) => (values[HEADER_ROW + i] = x));

// Fila de TOTALES (control): % debe sumar 100% y Aporte = pool de Variables.
const TOT = lastRow + 1; // fila 1-based de totales
values[TOT - 1] = [
  'TOTALES',
  '',
  '',
  `=SUM(D${HEADER_ROW + 1}:D${lastRow})`,
  '',
  '',
  '',
  '',
  `=SUM(I${HEADER_ROW + 1}:I${lastRow})`,
  '',
  `=SUM(K${HEADER_ROW + 1}:K${lastRow})`,
];

// limpiar y escribir
// Limpia un rango amplio y fijo: si una corrida previa dejó más filas, no deben
// quedar restos abajo (p. ej. una fila TOTALES fantasma).
await sheets.spreadsheets.values.clear({
  spreadsheetId: DEST,
  range: `A1:K2000`,
});
await sheets.spreadsheets.values.update({
  spreadsheetId: DEST,
  range: `A1`,
  valueInputOption: 'USER_ENTERED',
  requestBody: { values },
});
console.log(`Valores escritos hasta la fila ${lastRow}.`);

// ── Formato ──────────────────────────────────────────────────────────────
const green = { red: 0.22, green: 0.52, blue: 0.29 };
const bandGreen = { red: 0.86, green: 0.94, blue: 0.82 };
const white = { red: 1, green: 1, blue: 1 };
const black = { red: 0, green: 0, blue: 0 };
const gi = (r0, r1, c0, c1) => ({
  sheetId: GID,
  startRowIndex: r0,
  endRowIndex: r1,
  startColumnIndex: c0,
  endColumnIndex: c1,
});
const CUR = '"$"#,##0';
const reqs = [];

// Descombinar TODA la hoja (rango sin límites) — evita choques con merges previos
reqs.push({ unmergeCells: { range: { sheetId: GID } } });

// Resetear el formato de toda la rejilla ANTES de aplicar el nuevo. `values.clear`
// no limpia formato, así que corridas previas dejaban celdas con negrita/verde/fuente
// grande/texto blanco pegados (p. ej. fila "Burbujas de Amor" verde gigante). Esto
// devuelve todo a: fondo blanco, texto negro normal, alineación por defecto.
reqs.push({
  repeatCell: {
    range: gi(0, 2000, 0, 12),
    cell: {
      userEnteredFormat: {
        backgroundColor: white,
        textFormat: {
          bold: false,
          italic: false,
          fontSize: 10,
          foregroundColor: black,
        },
        horizontalAlignment: 'LEFT',
        verticalAlignment: 'BOTTOM',
      },
    },
    fields:
      'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
  },
});

// Título
reqs.push({ mergeCells: { range: gi(0, 1, 0, 11), mergeType: 'MERGE_ALL' } });
reqs.push({
  repeatCell: {
    range: gi(0, 1, 0, 11),
    cell: {
      userEnteredFormat: {
        textFormat: { bold: true, fontSize: 14, foregroundColor: black },
      },
    },
    fields: 'userEnteredFormat.textFormat',
  },
});
// Parámetros (labels en negrita)
reqs.push({
  repeatCell: {
    range: gi(1, 3, 0, 1),
    cell: { userEnteredFormat: { textFormat: { bold: true } } },
    fields: 'userEnteredFormat.textFormat',
  },
});
reqs.push({
  repeatCell: {
    range: gi(1, 2, 1, 2),
    cell: {
      userEnteredFormat: {
        numberFormat: { type: 'CURRENCY', pattern: CUR },
        textFormat: { bold: true },
      },
    },
    fields: 'userEnteredFormat(numberFormat,textFormat)',
  },
});
// resalta la celda editable de Variables (B3)
reqs.push({
  repeatCell: {
    range: gi(2, 3, 1, 2),
    cell: {
      userEnteredFormat: {
        numberFormat: { type: 'CURRENCY', pattern: CUR },
        backgroundColor: { red: 1, green: 0.97, blue: 0.8 },
        textFormat: { bold: true },
      },
    },
    fields: 'userEnteredFormat(numberFormat,backgroundColor,textFormat)',
  },
});

// Header (fila 5 → índice 4)
reqs.push({
  repeatCell: {
    range: gi(4, 5, 0, 11),
    cell: {
      userEnteredFormat: {
        backgroundColor: green,
        textFormat: { bold: true, foregroundColor: black },
        horizontalAlignment: 'CENTER',
        verticalAlignment: 'MIDDLE',
        wrapStrategy: 'WRAP',
      },
    },
    fields:
      'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)',
  },
});
reqs.push({
  updateSheetProperties: {
    properties: {
      sheetId: GID,
      gridProperties: { frozenRowCount: HEADER_ROW },
    },
    fields: 'gridProperties.frozenRowCount',
  },
});

const d0 = HEADER_ROW; // índice 0-based de primera fila de datos = 5
const d1 = lastRow; // exclusivo en 0-based = lastRow (porque header row idx 4 ocupa fila 5)
// Formatos numéricos por columna (rango de datos)
const curCols = [3, 6, 7, 9, 10]; // D, G, H, J, K
for (const col of curCols)
  reqs.push({
    repeatCell: {
      range: gi(d0, d1, col, col + 1),
      cell: {
        userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: CUR } },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  });
reqs.push({
  repeatCell: {
    range: gi(d0, d1, 8, 9),
    cell: {
      userEnteredFormat: {
        numberFormat: { type: 'PERCENT', pattern: '0.00%' },
      },
    },
    fields: 'userEnteredFormat.numberFormat',
  },
}); // I %
for (const col of [2, 5])
  reqs.push({
    repeatCell: {
      range: gi(d0, d1, col, col + 1),
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'NUMBER', pattern: '0.00' },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  }); // C, F
reqs.push({
  repeatCell: {
    range: gi(d0, d1, 4, 5),
    cell: {
      userEnteredFormat: {
        numberFormat: { type: 'NUMBER', pattern: '0' },
        horizontalAlignment: 'CENTER',
      },
    },
    fields: 'userEnteredFormat(numberFormat,horizontalAlignment)',
  },
}); // E Cantidad

// Merges por grupo de lote
for (const m of merges)
  reqs.push({
    mergeCells: {
      range: gi(m.r0 - 1, m.r1 - 1, m.c0, m.c1),
      mergeType: 'MERGE_ALL',
    },
  });
// Alineación vertical media + Lote en negrita
reqs.push({
  repeatCell: {
    range: gi(d0, d1, 0, 1),
    cell: {
      userEnteredFormat: {
        verticalAlignment: 'MIDDLE',
        textFormat: { bold: true },
      },
    },
    fields: 'userEnteredFormat(verticalAlignment,textFormat)',
  },
});
reqs.push({
  repeatCell: {
    range: gi(d0, d1, 3, 8),
    cell: { userEnteredFormat: { verticalAlignment: 'MIDDLE' } },
    fields: 'userEnteredFormat.verticalAlignment',
  },
});

// Bandas verdes en grupos alternos
groupBands.forEach((b, idx) => {
  if (idx % 2 === 1)
    reqs.push({
      repeatCell: {
        range: gi(b[0] - 1, b[1] - 1, 0, 11),
        cell: { userEnteredFormat: { backgroundColor: bandGreen } },
        fields: 'userEnteredFormat.backgroundColor',
      },
    });
});
// re-aplicar formatos de número tras las bandas (el bg no los pisa, pero por orden los merges/números ya están)

// Bordes suaves + anchos
const widths = [110, 220, 55, 110, 80, 75, 110, 120, 65, 110, 130];
widths.forEach((w, i) =>
  reqs.push({
    updateDimensionProperties: {
      range: {
        sheetId: GID,
        dimension: 'COLUMNS',
        startIndex: i,
        endIndex: i + 1,
      },
      properties: { pixelSize: w },
      fields: 'pixelSize',
    },
  }),
);
reqs.push({
  updateBorders: {
    range: gi(4, d1, 0, 11),
    top: { style: 'SOLID', color: { red: 0.8, green: 0.85, blue: 0.8 } },
    bottom: { style: 'SOLID', color: { red: 0.8, green: 0.85, blue: 0.8 } },
    innerHorizontal: {
      style: 'SOLID',
      color: { red: 0.9, green: 0.92, blue: 0.9 },
    },
    innerVertical: {
      style: 'SOLID',
      color: { red: 0.9, green: 0.92, blue: 0.9 },
    },
  },
});

// Celda de referencia E2 (Σ Costo Lote declarado) + label D2
reqs.push({
  repeatCell: {
    range: gi(1, 2, 3, 4),
    cell: { userEnteredFormat: { textFormat: { bold: true } } },
    fields: 'userEnteredFormat.textFormat',
  },
});
reqs.push({
  repeatCell: {
    range: gi(1, 2, 4, 5),
    cell: {
      userEnteredFormat: {
        numberFormat: { type: 'CURRENCY', pattern: CUR },
        textFormat: { bold: true },
      },
    },
    fields: 'userEnteredFormat(numberFormat,textFormat)',
  },
});

// Fila de TOTALES (índice 0-based = lastRow)
const totIdx = lastRow;
reqs.push({
  repeatCell: {
    range: gi(totIdx, totIdx + 1, 0, 11),
    cell: { userEnteredFormat: { textFormat: { bold: true } } },
    fields: 'userEnteredFormat.textFormat',
  },
});
reqs.push({
  repeatCell: {
    range: gi(totIdx, totIdx + 1, 3, 4),
    cell: {
      userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: CUR } },
    },
    fields: 'userEnteredFormat.numberFormat',
  },
});
reqs.push({
  repeatCell: {
    range: gi(totIdx, totIdx + 1, 10, 11),
    cell: {
      userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: CUR } },
    },
    fields: 'userEnteredFormat.numberFormat',
  },
});
reqs.push({
  repeatCell: {
    range: gi(totIdx, totIdx + 1, 8, 9),
    cell: {
      userEnteredFormat: { numberFormat: { type: 'PERCENT', pattern: '0.0%' } },
    },
    fields: 'userEnteredFormat.numberFormat',
  },
});
reqs.push({
  updateBorders: {
    range: gi(totIdx, totIdx + 1, 0, 11),
    top: { style: 'SOLID_THICK', color: black },
  },
});

await sheets.spreadsheets.batchUpdate({
  spreadsheetId: DEST,
  requestBody: { requests: reqs },
});
console.log(`Formato aplicado (${reqs.length} requests).`);
console.log(
  `\n✅ Hoja generada: https://docs.google.com/spreadsheets/d/${DEST}/edit`,
);
console.log(
  `   Recuerda: escribe tu monto de Variables en la celda B3 (resaltada) y el % / Aporte recalculan solos.`,
);
