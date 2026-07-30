/**
 * Exporta la presentación Soul a .pptx vía Drive API (usando el token OAuth del dueño)
 * para poder inspeccionar su estructura y diseño sin depender de la Slides API.
 *
 * Uso: node scripts/soul-cotizacion-export.mjs
 */
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const PRESENTATION_ID = '1i4IqcwHdJUxlYOEv10rhtx2KPGvCtvrWB1l0IV_i-5o';
const OUT_DIR = 'scripts/.soul';

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
});
const { access_token } = await tokenRes.json();

mkdirSync(OUT_DIR, { recursive: true });

const res = await fetch(
  `https://www.googleapis.com/drive/v3/files/${PRESENTATION_ID}/export` +
    '?mimeType=application/vnd.openxmlformats-officedocument.presentationml.presentation',
  { headers: { Authorization: `Bearer ${access_token}` } },
);

if (!res.ok) {
  console.log(
    'Error exportando:',
    res.status,
    (await res.text()).slice(0, 300),
  );
  process.exit(1);
}

const buf = Buffer.from(await res.arrayBuffer());
const dest = `${OUT_DIR}/cotizacion-soul-original.pptx`;
writeFileSync(dest, buf);
console.log(
  'Exportado:',
  dest,
  `(${(buf.length / 1024 / 1024).toFixed(2)} MB)`,
);
