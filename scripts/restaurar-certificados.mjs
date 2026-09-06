#!/usr/bin/env node
/**
 * Restaura en CONVEX los 8 certificados subidos a Drive el 2026-08-24.
 *
 * POR QUÉ EN CONVEX Y NO EN LA HOJA. `certificadoUrl` es de Convex desde el
 * 2026-08-15: se excluyó del allowlist del pull para que una celda vacía no
 * pisara lo que Convex acababa de guardar. La hoja es su ESPEJO, no su casa.
 *
 * Los 8 se escribieron en el espejo. Convex nunca los supo, así que cada push
 * los mandaba de vuelta como '' y los borraba. Cuatro cayeron el 2026-09-05
 * (#483, #484, #551, #552); los otros cuatro seguían sólo porque nadie los
 * había empujado desde el 19-ago. Reescribirlos en la hoja los perdería otra
 * vez; escribirlos en Convex los hace sobrevivir a todo push futuro.
 *
 * Requiere la guarda del PR #167 en producción (ya desplegada): sin ella el
 * push volvería a mandar '' para lo que Convex no sabe.
 *
 * SOBRE LA CUOTA. El plan gratuito de Convex mide banda de base de datos y la
 * cuota es COMPARTIDA POR EQUIPO, sumando proyectos y deployments. Este script
 * NO vuelca ninguna tabla: entra por el índice `by_itemId`, una lectura de un
 * documento por ítem. Verificar 8 filas cuesta 8 lecturas, no 576.
 *
 * Uso:
 *   node scripts/restaurar-certificados.mjs            # dry-run (por defecto)
 *   node scripts/restaurar-certificados.mjs --aplicar  # escribe en prod
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { google } from 'googleapis';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const APLICAR = process.argv.includes('--aplicar');

/**
 * itemId → fileId del JPG en Drive.
 *
 * Los cuatro que sobrevivieron salen de la columna AM de la hoja; los cuatro
 * borrados, de buscar `cert-{item}` en Drive. Cada carpeta trae un PDF y un
 * JPG: se toma el JPG porque `ProductDetailPage.tsx:325` descarta los PDF del
 * carrusel — por eso el 23-ago se subieron los dos.
 *
 * El serial del nombre cuadra con la tabla de reportes del LOTE ORIGEN
 * (#483→028564, #551→028563), lo que confirma que son los archivos correctos y
 * no homónimos.
 */
const CERTIFICADOS = [
  { item: '483', file: '1iB-cdiFOAHkBAQcZKNfILTK_2rs3ut2B', serial: '028564' },
  { item: '484', file: '1e5skXUxCSaUCCovYJbItgrwdUydY8-U9', serial: '028619' },
  { item: '551', file: '1PdMKSoQUiKQFToQRnM0rvhkPcLDZhoB-', serial: '028563' },
  { item: '552', file: '11NUXkMeWeerU-ZgbldgJqmYsq6Zd7ypk', serial: '025888' },
  {
    item: '544',
    file: '1YDo4sxjhcLhPqucFRSTzWV1cAk3qY0Vv',
    serial: '2231993415',
  },
  {
    item: '545',
    file: '1TUkYmloD4Hv6ovtQEtmy8oGCVPUaF34-',
    serial: '2235993538',
  },
  { item: '546', file: '1NkFpXzVBLLdd_YaLCvMyH_lMAjO0cco1', serial: '025893' },
  {
    item: '550',
    file: '1L96kvSf0tKPVjN5mNtyn0S6jBSjCK5zh',
    serial: '2235993408',
  },
];

const url = (fileId) => `https://drive.google.com/uc?export=view&id=${fileId}`;
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Escribe y verifica en un solo paso, sin lecturas extra.
 *
 * `_updateMediaByItem` entra por `by_itemId` y devuelve `{changed}`:
 *   · true  → el valor guardado NO era el destino, y ahora sí lo es.
 *   · false → `applyMedia` cortó por `finalValue === current`: YA era el destino.
 * En los dos casos el estado final queda probado sin escanear la tabla.
 */
function escribirEnConvex(item, certificadoUrl) {
  return execFileSync(
    'npx',
    [
      'convex',
      'run',
      '--prod',
      'lotItems:_updateMediaByItem',
      JSON.stringify({
        itemId: item,
        certificadoUrl,
        editorEmail: 'restauracion:certificados-2026-09-06',
      }),
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
}

/** Lee la columna certificadoUrl de la hoja. No consume cuota de Convex. */
async function leerEspejo() {
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
    spreadsheetId: process.env.FOTOSINTESIS_SPREADSHEET_ID,
    range: 'Inventario',
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  const rows = data.values ?? [];
  const H = (rows[0] ?? []).map(String);
  const ci = H.indexOf('Item');
  const cc = H.indexOf('certificadoUrl');
  const m = new Map();
  for (const r of rows.slice(1)) {
    const id = String(r[ci] ?? '').trim();
    if (id) m.set(id, String(r[cc] ?? '').trim());
  }
  return m;
}

// ── 1. Los archivos existen y se leen SIN credencial ────────────────────────
// Un certificado que sólo abre el dueño no sirve: la ficha pública lo muestra.
console.log('1. lectura anónima de los 8 archivos en Drive');
const rotos = [];
for (const c of CERTIFICADOS) {
  const r = await fetch(url(c.file), { redirect: 'follow' });
  const tipo = r.headers.get('content-type') ?? '';
  const ok = r.ok && tipo.startsWith('image/');
  console.log(
    `   #${c.item.padEnd(4)} ${r.status} ${tipo.padEnd(12)} ${ok ? '✓' : '✗'}`,
  );
  if (!ok) rotos.push(c.item);
}
if (rotos.length) {
  console.error(`\n✗ ABORTA: ${rotos.join(', ')} no se leen anónimamente.`);
  process.exit(1);
}

// ── 2. El espejo, antes ─────────────────────────────────────────────────────
console.log('\n2. estado del espejo (hoja) antes de tocar nada');
const espejoAntes = await leerEspejo();
for (const c of CERTIFICADOS) {
  const v = espejoAntes.get(c.item) ?? '';
  console.log(`   #${c.item.padEnd(4)} hoja: ${v ? 'tiene' : 'VACÍO'}`);
}

// ── 3. Respaldo ─────────────────────────────────────────────────────────────
mkdirSync('scripts/.data', { recursive: true });
const respaldo = 'scripts/.data/certificados-antes-2026-09-06.json';
writeFileSync(
  respaldo,
  JSON.stringify(
    CERTIFICADOS.map((c) => ({
      ...c,
      destino: url(c.file),
      hojaAntes: espejoAntes.get(c.item) ?? '',
    })),
    null,
    2,
  ),
);
console.log(`\n3. respaldo → ${respaldo}`);

if (!APLICAR) {
  console.log('\n── DRY-RUN. Nada se escribió. Repetí con --aplicar.');
  console.log(
    `   costo en Convex al aplicar: ${CERTIFICADOS.length} lecturas por índice`,
  );
  console.log(
    '   + 8 escrituras + 8 pushes agendados. Ningún escaneo de tabla.',
  );
  process.exit(0);
}

// ── 4. Escribir en Convex ───────────────────────────────────────────────────
// Se pacea: cada escritura agenda un push a Sheets, y el 2026-09-05 una ráfaga
// de 57 chocó contra la cuota de LECTURA de la API de Google.
console.log('\n4. escribiendo en Convex (6 s entre ítems)');
const fallos = [];
let escritos = 0;
for (const c of CERTIFICADOS) {
  try {
    const out = escribirEnConvex(c.item, url(c.file));
    const cambio = /"changed":\s*true/.test(out) || /changed:\s*true/.test(out);
    if (cambio) escritos++;
    console.log(
      `   #${c.item.padEnd(4)} ${cambio ? '✓ escrito' : '· ya estaba'}  ${out.replace(/\s+/g, ' ').slice(0, 70)}`,
    );
  } catch (err) {
    const msg = (err.stderr || err.message || '')
      .toString()
      .trim()
      .slice(0, 150);
    console.error(`   #${c.item.padEnd(4)} ✗ ${msg}`);
    fallos.push(c.item);
  }
  await dormir(6000);
}
console.log(
  `\n   cambiados: ${escritos} · ya correctos: ${CERTIFICADOS.length - escritos - fallos.length} · fallos: ${fallos.length}`,
);

// ── 5. Verificar el espejo ──────────────────────────────────────────────────
// `syncStatus: 'synced'` NO prueba aterrizaje (CLAUDE.md): sólo dice que el POST
// devolvió 2xx. La prueba es leer la hoja y comparar. Los pushes van agendados,
// así que se espera un poco antes de mirar.
console.log('\n5. esperando 30 s a que aterricen los pushes…');
await dormir(30000);
const espejoDespues = await leerEspejo();
let ok = 0;
for (const c of CERTIFICADOS) {
  const v = espejoDespues.get(c.item) ?? '';
  const bien = v === url(c.file);
  if (bien) ok++;
  console.log(
    `   #${c.item.padEnd(4)} ${bien ? '✓' : '✗ ' + (v || '(vacío)')}`,
  );
}
console.log(`\n   ${ok}/${CERTIFICADOS.length} con su certificado en la hoja`);
if (fallos.length) console.error(`   fallaron en Convex: ${fallos.join(', ')}`);
process.exit(ok === CERTIFICADOS.length && !fallos.length ? 0 : 1);
