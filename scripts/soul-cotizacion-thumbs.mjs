/**
 * Descarga miniaturas de cada slide para revisión visual.
 * Uso: node scripts/soul-cotizacion-thumbs.mjs <presentationId>
 */
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const ID = process.argv[2];
const OUT = 'scripts/.soul/thumbs';

const tk = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  }),
}).then((r) => r.json());

const H = { Authorization: `Bearer ${tk.access_token}` };
const pres = await fetch(
  `https://slides.googleapis.com/v1/presentations/${ID}`,
  {
    headers: H,
  },
).then((r) => r.json());

mkdirSync(OUT, { recursive: true });

for (const [i, slide] of pres.slides.entries()) {
  const meta = await fetch(
    `https://slides.googleapis.com/v1/presentations/${ID}/pages/${slide.objectId}/thumbnail` +
      '?thumbnailProperties.thumbnailSize=LARGE',
    { headers: H },
  ).then((r) => r.json());

  const img = Buffer.from(await (await fetch(meta.contentUrl)).arrayBuffer());
  const path = `${OUT}/${String(i + 1).padStart(2, '0')}-${slide.objectId}.png`;
  writeFileSync(path, img);
  console.log(path, `(${(img.length / 1024).toFixed(0)} KB)`);
}
