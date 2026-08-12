/**
 * Extrae las fotos de producto de la presentación "Cotización Soul" y las deja
 * como assets estáticos para la página pública /cotizacion-soul-plan.
 *
 * Los `contentUrl` que devuelve la Slides API caducan (~30 min), así que hay
 * que descargar los bytes y versionarlos en public/soul/.
 *
 * De cada slide de línea se toma la imagen grande (la foto del producto) y se
 * ignoran logo, sellos y adornos, que ya viven en public/ por su cuenta.
 *
 * Uso: node scripts/soul-cotizacion-imagenes.mjs [presentationId]
 *      node scripts/soul-cotizacion-imagenes.mjs --todas   (volcado completo,
 *      con tamaños, para re-mapear si el deck cambia de orden)
 */
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

config({ path: '.env.local' });
config({ path: '.env' });

const ARGS = process.argv.slice(2);
const TODAS = ARGS.includes('--todas');
const PRESENTATION_ID =
  ARGS.find((a) => !a.startsWith('-')) ||
  '1_MfZrJMdNW_5Ns4-h4jyzcQsvv5X2fReK_8SmVn5Kg4';
const OUT = 'public/soul';

/** Slide (1-indexed) → nombre del archivo de la foto de esa línea. */
const FOTO_POR_SLIDE = {
  2: 'soul-linea-01-manilla-cuero',
  3: 'soul-linea-02-anillo-nexus',
  4: 'soul-linea-03-manilla-tenis',
  5: 'soul-linea-04-anillo-trinity',
};

/** Ancho mínimo renderizado (pt) para considerar que una imagen es la foto. */
const MIN_ANCHO_PT = 300;
const EMU_A_PT = 1 / 12700;

/** Lado del cuadrado final y aire blanco alrededor de la joya, en px. */
const LADO = 360;
const AIRE = 14;

/**
 * Las fotos del deck traen mucho blanco alrededor: a 60 px de miniatura la joya
 * queda diminuta. Recorta el fondo, la vuelve a centrar en un cuadrado y deja
 * un aire parejo, para que las cuatro líneas pesen lo mismo en la carta.
 */
async function recortarACuadrado(bytes) {
  const recortada = await sharp(bytes)
    .trim({ background: '#ffffff', threshold: 8 })
    .toBuffer();

  return sharp(recortada)
    .resize(LADO - AIRE * 2, LADO - AIRE * 2, {
      fit: 'contain',
      background: '#ffffff',
    })
    .extend({
      top: AIRE,
      bottom: AIRE,
      left: AIRE,
      right: AIRE,
      background: '#ffffff',
    })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();
}

const EXT = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

async function getAccessToken() {
  const data = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  }).then((r) => r.json());
  if (!data.access_token)
    throw new Error('No access token: ' + JSON.stringify(data));
  return data.access_token;
}

const token = await getAccessToken();
const pres = await fetch(
  `https://slides.googleapis.com/v1/presentations/${PRESENTATION_ID}`,
  { headers: { Authorization: `Bearer ${token}` } },
).then((r) => r.json());

if (!pres.slides) throw new Error('Sin slides: ' + JSON.stringify(pres));

mkdirSync(OUT, { recursive: true });
console.log(`"${pres.title}" · ${pres.slides.length} slides\n`);

for (const [i, slide] of pres.slides.entries()) {
  const n = i + 1;
  const nn = String(n).padStart(2, '0');
  const base = FOTO_POR_SLIDE[n];
  if (!base && !TODAS) continue;

  const imgs = (slide.pageElements || [])
    .filter((el) => el.image?.contentUrl)
    .map((el) => {
      const t = el.transform || {};
      return {
        el,
        w: Math.round(
          (el.size?.width?.magnitude || 0) * (t.scaleX ?? 1) * EMU_A_PT,
        ),
        h: Math.round(
          (el.size?.height?.magnitude || 0) * (t.scaleY ?? 1) * EMU_A_PT,
        ),
      };
    });

  // en modo normal: sólo la imagen más ancha, y sólo si parece una foto
  const objetivo = TODAS
    ? imgs
    : imgs
        .filter((x) => x.w >= MIN_ANCHO_PT)
        .sort((a, b) => b.w * b.h - a.w * a.h)
        .slice(0, 1);

  if (!objetivo.length) {
    console.log(`Slide ${nn}: sin foto de producto (${imgs.length} imágenes)`);
    continue;
  }

  for (const [j, x] of objetivo.entries()) {
    const res = await fetch(x.el.image.contentUrl);
    if (!res.ok) {
      console.log(`Slide ${nn}[${j}]: descarga falló (${res.status})`);
      continue;
    }
    const tipo = res.headers.get('content-type')?.split(';')[0] || 'image/png';
    const crudos = Buffer.from(await res.arrayBuffer());

    // el volcado con --todas sale tal cual: sirve para inspeccionar el deck
    const bytes = TODAS ? crudos : await recortarACuadrado(crudos);
    const nombre = TODAS
      ? `soul-s${nn}-${j}.${EXT[tipo] || 'png'}`
      : `${base}.jpg`;
    writeFileSync(`${OUT}/${nombre}`, bytes);

    console.log(
      `Slide ${nn} → ${OUT}/${nombre}  ` +
        `${(bytes.length / 1024).toFixed(0)} KB · ` +
        (TODAS ? `${x.w}×${x.h} pt · ${tipo}` : `${LADO}×${LADO} px · jpeg`),
    );
  }
}
