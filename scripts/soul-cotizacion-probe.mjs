/**
 * Sonda de la presentación "ACTUAL de Cotización Soul — Cards 1080×1920".
 * Usa el token OAuth del dueño (kvn3toj@gmail.com) — scope `drive`, que la
 * Slides API acepta. Vuelca la estructura completa a scripts/.soul/presentation.json
 * y un resumen legible de cada slide con sus objectIds de texto.
 *
 * Uso: node scripts/soul-cotizacion-probe.mjs [presentationId]
 */
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const PRESENTATION_ID =
  process.argv[2] || '1i4IqcwHdJUxlYOEv10rhtx2KPGvCtvrWB1l0IV_i-5o';

export async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!data.access_token)
    throw new Error('No access token: ' + JSON.stringify(data));
  return data.access_token;
}

const token = await getAccessToken();

const res = await fetch(
  `https://slides.googleapis.com/v1/presentations/${PRESENTATION_ID}`,
  {
    headers: { Authorization: `Bearer ${token}` },
  },
);

if (!res.ok) {
  const body = await res.text();
  const disabled =
    body.includes('has not been used in project') ||
    body.includes('is disabled');
  console.log(disabled ? 'SLIDES_API_DISABLED' : 'ERROR ' + res.status);
  console.log(body.slice(0, 300));
  process.exit(1);
}

const pres = await res.json();
mkdirSync('scripts/.soul', { recursive: true });
writeFileSync('scripts/.soul/presentation.json', JSON.stringify(pres, null, 2));

console.log('ACCESO OK');
console.log('Título:', pres.title);
console.log('Tamaño:', JSON.stringify(pres.pageSize));
console.log('Slides:', pres.slides.length);

for (const [i, slide] of pres.slides.entries()) {
  const els = slide.pageElements || [];
  const textos = els.filter((el) => el.shape?.text);
  const imagenes = els.filter((el) => el.image);
  const tablas = els.filter((el) => el.table);
  const otros = els.length - textos.length - imagenes.length - tablas.length;

  console.log(
    `\n═══ Slide ${i + 1}  (${slide.objectId})  ` +
      `· ${textos.length} texto · ${imagenes.length} img · ${tablas.length} tabla · ${otros} otros`,
  );

  for (const el of textos) {
    const t = el.shape.text.textElements
      .map((te) => te.textRun?.content || '')
      .join('')
      .replace(/\n/g, ' ⏎ ')
      .trim();
    if (t)
      console.log(`   [${el.objectId}] ${JSON.stringify(t.slice(0, 110))}`);
  }

  for (const el of tablas) {
    console.log(
      `   [tabla ${el.objectId}] ${el.table.rows}×${el.table.columns}`,
    );
    el.table.tableRows.forEach((row, r) => {
      const cells = row.tableCells.map((c) =>
        (c.text?.textElements || [])
          .map((te) => te.textRun?.content || '')
          .join('')
          .trim(),
      );
      console.log(`      fila ${r}: ${JSON.stringify(cells)}`);
    });
  }
}
