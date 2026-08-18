/**
 * Estira el grid del tab Inventario del SOT v3 hasta OBJETIVO filas.
 *
 * Incidente 0571 "Dije estrella" (2026-08-18): el grid llegó a 546 filas,
 * las 546 con dato, y toda alta nueva empezó a devolver 500 ("exceeds grid
 * limits") porque la guarda de fila ocupada de api/admin-product-update.ts
 * leía la fila destino ANTES de estirar el grid. El fix de código ordena la
 * secuencia (api/_lib/sheet-new-row.ts); este script es el desbloqueo
 * inmediato de producción mientras ese fix llega a main: con filas de sobra,
 * el código viejo también funciona.
 *
 * Sólo agrega filas VACÍAS al final (appendDimension). No toca ni una celda
 * con dato — resolveRowTarget ignora la cola vacía, así que las altas siguen
 * cayendo en la primera fila libre real.
 *
 * Uso:  node scripts/estirar-grid-inventario.mjs           # dry-run
 *       node scripts/estirar-grid-inventario.mjs --apply
 */
import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');

const SOT3 = '1oRw1KSh8L1CyjUnD_D1S8a3J3ewJ_V8lN1BFR-7Bv9U';
const TAB_INV = 'Inventario';
/** Redondea al default de Sheets: headroom para ~450 altas más. */
const OBJETIVO = 1000;

// ─── Auth ─────────────────────────────────────────────────────────────────
const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
if (!key) {
  console.error('Falta GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}
const rawKey = key.trim().startsWith('{')
  ? key
  : Buffer.from(key, 'base64').toString();
const sheets = new sheets_v4.Sheets({
  auth: new GoogleAuth({
    credentials: JSON.parse(rawKey),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

// ─── Estado actual ────────────────────────────────────────────────────────
const meta = await sheets.spreadsheets.get({
  spreadsheetId: SOT3,
  fields:
    'sheets.properties(sheetId,title,gridProperties(rowCount,columnCount))',
});
const props = (meta.data.sheets ?? [])
  .map((sh) => sh.properties)
  .find((p) => p?.title === TAB_INV);
if (!props) {
  console.error(`No existe el tab "${TAB_INV}" en el SOT`);
  process.exit(1);
}
const { rowCount, columnCount } = props.gridProperties;

const colA = await sheets.spreadsheets.values.get({
  spreadsheetId: SOT3,
  range: `${TAB_INV}!A:A`,
});
const filas = colA.data.values ?? [];
let ultimaConDato = 0;
for (let i = filas.length - 1; i >= 0; i--) {
  if (String(filas[i]?.[0] ?? '').trim() !== '') {
    ultimaConDato = i + 1;
    break;
  }
}

console.log(`Tab "${TAB_INV}" (sheetId ${props.sheetId})`);
console.log(`  grid:            ${rowCount} filas × ${columnCount} columnas`);
console.log(`  última con dato: fila ${ultimaConDato}`);
console.log(`  libres al final: ${rowCount - ultimaConDato}`);

if (rowCount >= OBJETIVO) {
  console.log(
    `\n✅ Ya hay ${rowCount} filas (objetivo ${OBJETIVO}). Nada que hacer.`,
  );
  process.exit(0);
}

const agregar = OBJETIVO - rowCount;
if (!APPLY) {
  console.log(
    `\n[dry-run] Agregaría ${agregar} filas vacías → ${OBJETIVO}. Corre con --apply.`,
  );
  process.exit(0);
}

await sheets.spreadsheets.batchUpdate({
  spreadsheetId: SOT3,
  requestBody: {
    requests: [
      {
        appendDimension: {
          sheetId: props.sheetId,
          dimension: 'ROWS',
          length: agregar,
        },
      },
    ],
  },
});

// ─── Verificación: releer, nunca confiar en el 200 ────────────────────────
const despues = await sheets.spreadsheets.get({
  spreadsheetId: SOT3,
  fields: 'sheets.properties(title,gridProperties.rowCount)',
});
const nuevo = (despues.data.sheets ?? [])
  .map((sh) => sh.properties)
  .find((p) => p?.title === TAB_INV)?.gridProperties?.rowCount;

if (nuevo === OBJETIVO) {
  console.log(
    `\n✅ Grid estirado: ${rowCount} → ${nuevo} filas (verificado releyendo).`,
  );
} else {
  console.error(
    `\n❌ Releído ${nuevo} filas, esperaba ${OBJETIVO}. Revisar a mano.`,
  );
  process.exit(1);
}
