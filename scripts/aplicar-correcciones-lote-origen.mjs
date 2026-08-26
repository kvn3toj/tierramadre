/**
 * Correcciones del Lote Origen — paso 0 (limpieza de la fuga) + paso 1 + paso 2.
 *
 * Payload: scripts/.data/correcciones-lote-origen.json
 *
 * Reglas del prompt que este script hace cumplir por código:
 *  - **Paso 0 va primero.** Todo lo demás anexa a `observacion`; limpiar después
 *    conservaría y extendería la frase del piso.
 *  - **Verifica `de` antes de escribir.** Si no coincide, NO escribe ese campo y
 *    lo reporta. (Salvedad propia: en #552 el bloque de plata va atómico — ver abajo.)
 *  - **`observacion` se ANEXA**, separador ` · `. Nunca se reemplaza.
 *  - No se toca la columna J (`medidasValores`) ni la Y (`mostrarEnCatalogo`).
 *  - Localiza por cabecera nombrada; escribe con `values.update` sobre rango
 *    CERRADO de una celda, nunca `values.append`.
 *  - El `pesoTotalQuilates` de C-090 se SUMA de los 11 ítems ya corregidos, no se
 *    copia del payload.
 *
 * Dos cosas que este script se niega a hacer, y por qué:
 *
 *  1. **#484 `Extra Fina F2` → `Fine F2`.** `Fine F2` NO está en `CALIDADES`
 *     (src/data/vocabularies.ts). `CALIDAD_FACTORS[calidad] ?? 1` manda toda
 *     calidad desconocida a factor 1.0, así que el cambio no arregla nada: deja
 *     la pieza fuera de vocabulario igual que antes. El valor de vocabulario que
 *     el certificado respalda es `F2` (factor 0.85), pero escribir eso sería
 *     inventar un valor que el payload no pide. Se omite y se reporta.
 *
 *  2. **El bloque de plata de #552 va atómico.** El payload espera
 *     `precioFinalCOP` vacío y la hoja tiene 9.000.000. Escribir sólo el costo
 *     dejaría la razón precio/costo en 1,60 cuando todo C-090 va a 4,5 — peor que
 *     no tocar nada. Se omiten costo Y precio juntos; calidad y medidas sí entran.
 *
 * Uso:
 *   node scripts/aplicar-correcciones-lote-origen.mjs            # dry-run
 *   node scripts/aplicar-correcciones-lote-origen.mjs --apply
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const TAB = 'Inventario';
const P = JSON.parse(
  readFileSync('scripts/.data/correcciones-lote-origen.json', 'utf8'),
);

/** Campos que este script se niega a escribir, con el motivo. Ver cabecera. */
const OMITIR = new Map([
  [
    '484:calidad',
    '`Fine F2` no está en CALIDADES; factor quedaría en 1.0 igual',
  ],
  ['552:costoBaseCOP', 'bloque de plata atómico: `precioFinalCOP` no coincide'],
  ['552:precioFinalCOP', 'la hoja tiene 9000000, el payload esperaba vacío'],
  // El append de #552 dice textualmente "Costeado y corregido… $5.632.706…
  // Precio $25.347.177". Escribirlo sin escribir esas dos celdas dejaría la
  // fila afirmando un costeo que no tiene: dato inventado con forma de dato.
  // Se retiene junto al bloque de plata. Calidad y medidas sí entran.
  ['552:observacion', 'el append afirma el costeo que queda sin aplicar'],
]);

const CAB = {
  calidad: 'Calidad',
  medidas: 'Medidas',
  peso: 'Peso (ct)',
  color: 'Color',
  costoBaseCOP: 'costoBaseCOP',
  precioFinalCOP: 'precioFinalCOP',
  observacion: 'observacion',
};

const SHEET_ID = process.env.FOTOSINTESIS_SPREADSHEET_ID;
if (!SHEET_ID) throw new Error('Falta FOTOSINTESIS_SPREADSHEET_ID');
if (P.meta?.sot && P.meta.sot !== SHEET_ID) {
  throw new Error(
    `La hoja del payload no es FOTOSINTESIS_SPREADSHEET_ID. Abortado.`,
  );
}

// La credencial viaja en base64 en este repo. Nunca imprimirla.
const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
const creds = JSON.parse(
  raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'),
);
const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: [
    APPLY
      ? 'https://www.googleapis.com/auth/spreadsheets'
      : 'https://www.googleapis.com/auth/spreadsheets.readonly',
  ],
});
const sheets = google.sheets({ version: 'v4', auth });

const colLetter = (i) => {
  let s = '';
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = (n - 1 - m) / 26;
  }
  return s;
};
const norm = (v) =>
  v === undefined || v === null ? '' : String(v).replace(/\s+/g, ' ').trim();
const igual = (a, b) => {
  a = norm(a);
  b = norm(b);
  if (a === b) return true;
  return a !== '' && b !== '' && !isNaN(+a) && !isNaN(+b) && +a === +b;
};

const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const rows = data.values;
const H = rows[0].map((x) => String(x).trim());
const iItem = H.indexOf('Item');
const idx = new Map();
rows.forEach((r, i) => {
  if (i === 0) return;
  const id = String(r[iItem] ?? '').trim();
  if (id) idx.set(id, { row: r, sheetRow: i + 1 });
});
const cel = (k) => {
  const i = H.indexOf(CAB[k]);
  if (i < 0) throw new Error(`No hay cabecera para ${k} (${CAB[k]})`);
  return i;
};

console.log(
  `\nCorrecciones del Lote Origen · ${APPLY ? '⚠️  APPLY' : 'dry-run'}\n`,
);

/** Acumula {range, values} para un único batchUpdate al final. */
const escrituras = [];
const informe = [];
const push = (item, campo, de, a, sheetRow, ci) => {
  escrituras.push({
    range: `${TAB}!${colLetter(ci)}${sheetRow}`,
    values: [[a]],
  });
  informe.push({ item, campo, de, a, estado: 'escrito' });
};
const omitir = (item, campo, de, a, motivo) =>
  informe.push({ item, campo, de, a, estado: 'OMITIDO', motivo });

// ── PASO 0 · limpieza de la fuga ────────────────────────────────────────────
const rx = new RegExp(P.paso_0_limpieza_fuga.regex_a_eliminar, 'g');
const obsLimpia = new Map(); // itemId → texto ya sin la frase
console.log('PASO 0 · limpieza de la fuga');
for (const id of P.paso_0_limpieza_fuga.items) {
  const e = idx.get(String(id));
  if (!e) {
    console.log(`  #${id} no está en la hoja`);
    continue;
  }
  const antes = String(e.row[cel('observacion')] ?? '');
  const despues = antes
    .replace(rx, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  obsLimpia.set(String(id), despues);
  if (antes === despues) {
    console.log(`  #${String(id).padEnd(4)} ya estaba limpia`);
  } else {
    console.log(
      `  #${String(id).padEnd(4)} −${antes.length - despues.length} caracteres`,
    );
    push(
      id,
      'observacion (limpieza)',
      '…piso…',
      despues,
      e.sheetRow,
      cel('observacion'),
    );
  }
}

// ── PASO 1 · las 7 correcciones ─────────────────────────────────────────────
console.log('\nPASO 1 · correcciones');
for (const c of P.correcciones) {
  const e = idx.get(String(c.item));
  if (!e) {
    console.log(`  #${c.item} NO ESTÁ EN LA HOJA — salteado`);
    continue;
  }
  console.log(`  #${c.item} ${c.nombre}`);
  let algoEscrito = false;
  for (const [campo, v] of Object.entries(c.cambios)) {
    const clave = `${c.item}:${campo}`;
    const actual = norm(e.row[cel(campo)]);
    if (OMITIR.has(clave)) {
      omitir(c.item, campo, actual, v.a, OMITIR.get(clave));
      console.log(`     🔒 ${campo}: OMITIDO — ${OMITIR.get(clave)}`);
      continue;
    }
    if (!igual(actual, v.de)) {
      omitir(
        c.item,
        campo,
        actual,
        v.a,
        `la hoja dice ${JSON.stringify(actual)}, el payload esperaba ${JSON.stringify(v.de)}`,
      );
      console.log(
        `     ❌ ${campo}: DESFASE — hoja=${JSON.stringify(actual)} de=${JSON.stringify(v.de)}`,
      );
      continue;
    }
    push(c.item, campo, actual, v.a, e.sheetRow, cel(campo));
    algoEscrito = true;
    console.log(
      `     ✅ ${campo}: ${JSON.stringify(actual)} → ${JSON.stringify(v.a)}`,
    );
  }
  // El append sólo tiene sentido si se escribió algo del ítem.
  if (OMITIR.has(`${c.item}:observacion`)) {
    omitir(c.item, 'observacion (append)', '…', '…', OMITIR.get(`${c.item}:observacion`));
    console.log(`     🔒 observacion: OMITIDO — ${OMITIR.get(`${c.item}:observacion`)}`);
  } else if (algoEscrito && c.observacion_append) {
    const base =
      obsLimpia.get(String(c.item)) ?? String(e.row[cel('observacion')] ?? '');
    const nueva = base
      ? `${base} · ${c.observacion_append}`
      : c.observacion_append;
    // Reemplaza la escritura de limpieza si la había: una sola por celda.
    const r = `${TAB}!${colLetter(cel('observacion'))}${e.sheetRow}`;
    const prev = escrituras.findIndex((w) => w.range === r);
    if (prev >= 0) escrituras.splice(prev, 1);
    escrituras.push({ range: r, values: [[nueva]] });
    informe.push({
      item: c.item,
      campo: 'observacion (append)',
      de: '…',
      a: `+${c.observacion_append.length} car.`,
      estado: 'escrito',
    });
    console.log(
      `     ✅ observacion: append de ${c.observacion_append.length} caracteres`,
    );
  }
}

// ── PASO 2 · pesoTotalQuilates de C-090, SUMADO ─────────────────────────────
const C090 = [544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554];
let suma = 0;
for (const id of C090) {
  const e = idx.get(String(id));
  const corr = P.correcciones.find((c) => c.item === id && c.cambios.peso);
  const p = corr
    ? Number(corr.cambios.peso.a)
    : parseFloat(String(e.row[cel('peso')]).replace(',', '.')) || 0;
  suma += p;
}
suma = Math.round(suma * 100) / 100;
console.log(
  `\nPASO 2 · C-090 pesoTotalQuilates → ${suma} (sumado de los 11; el payload decía ${P.lote['C-090'].pesoTotalQuilates.a})`,
);

console.log(
  `\n${escrituras.length} celda(s) para escribir · ${informe.filter((i) => i.estado === 'OMITIDO').length} omitida(s)`,
);

if (!APPLY) {
  console.log('\nDry-run. Nada escrito. Para aplicar: --apply');
  process.exit(0);
}

// ── Respaldo de las filas tocadas ───────────────────────────────────────────
mkdirSync('scripts/.backups', { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const tocadas = [...new Set(informe.map((i) => String(i.item)))];
writeFileSync(
  `scripts/.backups/lote-origen-ANTES-${ts}.json`,
  JSON.stringify(
    {
      spreadsheetId: SHEET_ID,
      tab: TAB,
      filas: Object.fromEntries(
        tocadas.map((id) => {
          const e = idx.get(id);
          return [id, Object.fromEntries(H.map((h, i) => [h, e.row[i] ?? '']))];
        }),
      ),
    },
    null,
    2,
  ),
);
console.log(`\nRespaldo: scripts/.backups/lote-origen-ANTES-${ts}.json`);

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: SHEET_ID,
  requestBody: { valueInputOption: 'RAW', data: escrituras },
});
console.log(`Escritas ${escrituras.length} celdas en ${TAB}.`);

// pesoTotalQuilates vive en la pestaña Lotes.
const { data: lotesData } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: 'Lotes',
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const LH = lotesData.values[0].map((x) => String(x).trim());
const iL = LH.indexOf('loteId');
const iPeso = LH.indexOf('pesoTotalQuilates');
const fila = lotesData.values.findIndex(
  (r, i) => i > 0 && String(r[iL] ?? '').trim() === 'C-090',
);
if (fila > 0 && iPeso >= 0) {
  const antes = lotesData.values[fila][iPeso];
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Lotes!${colLetter(iPeso)}${fila + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[suma]] },
  });
  console.log(`Lotes!C-090 pesoTotalQuilates: ${antes} → ${suma}`);
} else {
  console.log(
    '⚠️  No se encontró C-090 o la cabecera pesoTotalQuilates en Lotes.',
  );
}

// ── Verificación: releer por cabecera nombrada ──────────────────────────────
const { data: after } = await sheets.spreadsheets.values.get({
  spreadsheetId: SHEET_ID,
  range: TAB,
  valueRenderOption: 'UNFORMATTED_VALUE',
});
const AH = after.values[0].map((x) => String(x).trim());
const aIdx = new Map();
after.values.forEach((r, i) => {
  if (i === 0) return;
  const id = String(r[AH.indexOf('Item')] ?? '').trim();
  if (id) aIdx.set(id, r);
});
console.log('\nVerificación (relectura por cabecera nombrada):');
let ok = true;
for (const i of informe.filter(
  (x) => x.estado === 'escrito' && !x.campo.includes('observacion'),
)) {
  const v = norm(aIdx.get(String(i.item))[AH.indexOf(CAB[i.campo])]);
  const bien = igual(v, i.a);
  if (!bien) ok = false;
  console.log(
    `  ${bien ? '✅' : '❌'} #${i.item} ${i.campo} = ${JSON.stringify(v)}`,
  );
}
// Y que la frase del piso ya no esté en ninguno de los nueve.
const rx2 = new RegExp('Piso de negociación|INTERNO');
const sucios = P.paso_0_limpieza_fuga.items.filter((id) =>
  rx2.test(String(aIdx.get(String(id))?.[AH.indexOf('observacion')] ?? '')),
);
console.log(
  sucios.length === 0
    ? '  ✅ ninguno de los 9 conserva la frase del piso'
    : `  ❌ todavía la tienen: ${sucios.join(', ')}`,
);
if (sucios.length) ok = false;

console.log(
  ok
    ? '\n✅ Todo aterrizó. Falta el sync: «🔄 Convex Sync → Sincronizar todo (completo)».'
    : '\n❌ La relectura no coincide. Revisar la hoja a mano.',
);
process.exit(ok ? 0 : 1);
