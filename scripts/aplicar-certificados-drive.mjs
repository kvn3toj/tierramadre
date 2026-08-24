/**
 * Escribe `certificadoUrl` (columna AM) para los 8 ítems cuyo certificado se
 * subió a Drive, desde el bloque `certificados` del payload.
 *
 * Usa SIEMPRE `certificadoUrl` (el JPG), no `pdf_fuente`: el carrusel descarta
 * los .pdf (`ProductDetailPage.tsx:325`) y los 368 certificados que ya existen
 * son todos imagen. El PDF queda en la misma carpeta como documento fuente.
 *
 * Verifica que la celda esté VACÍA antes de escribir: si ya hay un certificado,
 * no lo pisa — con un campo único, sobrescribir es perder el otro.
 *
 * Uso: node scripts/aplicar-certificados-drive.mjs [--apply]
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { google } from 'googleapis';
import { config } from 'dotenv';
config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APPLY = process.argv.includes('--apply');
const P = JSON.parse(readFileSync('scripts/.data/correcciones-lote-origen.json', 'utf8'));
const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim();
const cr = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
const sheets = google.sheets({ version: 'v4', auth: new google.auth.JWT({
  email: cr.client_email, key: cr.private_key,
  scopes: [APPLY ? 'https://www.googleapis.com/auth/spreadsheets'
                 : 'https://www.googleapis.com/auth/spreadsheets.readonly'] }) });
const ID = process.env.FOTOSINTESIS_SPREADSHEET_ID;

const { data } = await sheets.spreadsheets.values.get({
  spreadsheetId: ID, range: 'Inventario', valueRenderOption: 'UNFORMATTED_VALUE' });
const rows = data.values, H = rows[0].map((x) => String(x).trim());
const iItem = H.indexOf('Item'), iCert = H.indexOf('certificadoUrl');
if (iCert < 0) throw new Error('No hay cabecera certificadoUrl');
const letra = (i) => { let s='',n=i+1; while(n>0){const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=(n-1-m)/26;} return s; };

console.log(`\ncertificadoUrl · columna ${letra(iCert)} · ${APPLY ? '⚠️  APPLY' : 'dry-run'}\n`);
const escrituras = [];
for (const c of P.certificados.items) {
  const i = rows.findIndex((r, k) => k > 0 && String(r[iItem] ?? '').trim() === String(c.item));
  if (i < 0) { console.log(`  #${c.item} NO ESTÁ en la hoja`); continue; }
  const actual = String(rows[i][iCert] ?? '').trim();
  if (actual) {
    console.log(`  #${c.item} 🔒 ya tiene certificado — no se pisa: ${actual.slice(0, 50)}`);
    continue;
  }
  console.log(`  #${c.item} ${c.laboratorio} ${c.reporte} → ${c.certificadoUrl.slice(0, 62)}`);
  escrituras.push({ range: `Inventario!${letra(iCert)}${i + 1}`, values: [[c.certificadoUrl]] });
}
console.log(`\n${escrituras.length} celda(s) para escribir`);
if (!APPLY) { console.log('\nDry-run. Para aplicar: --apply'); process.exit(0); }

mkdirSync('scripts/.backups', { recursive: true });
const ts = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`scripts/.backups/certificados-ANTES-${ts}.json`,
  JSON.stringify(P.certificados.items.map((c) => ({ item: c.item, certificadoUrlAntes: '' })), null, 2));

await sheets.spreadsheets.values.batchUpdate({
  spreadsheetId: ID, requestBody: { valueInputOption: 'RAW', data: escrituras } });
console.log(`Escritas ${escrituras.length} celdas.`);

const { data: after } = await sheets.spreadsheets.values.get({
  spreadsheetId: ID, range: 'Inventario', valueRenderOption: 'UNFORMATTED_VALUE' });
const AH = after.values[0].map((x) => String(x).trim());
console.log('\nVerificación (relectura por cabecera nombrada):');
let ok = true;
for (const c of P.certificados.items) {
  const r = after.values.find((x, k) => k > 0 && String(x[AH.indexOf('Item')] ?? '').trim() === String(c.item));
  const v = String(r?.[AH.indexOf('certificadoUrl')] ?? '').trim();
  const bien = v === c.certificadoUrl;
  if (!bien) ok = false;
  console.log(`  ${bien ? '✅' : '❌'} #${c.item} ${v ? v.slice(0, 56) : '(vacío)'}`);
}
console.log(ok ? '\n✅ Los 8 aterrizaron.' : '\n❌ Revisar a mano.');
process.exit(ok ? 0 : 1);
