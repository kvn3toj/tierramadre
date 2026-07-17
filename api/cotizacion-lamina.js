/**
 * Sirve una lámina del deck de cotización como imagen, ya optimizada.
 *
 * Por qué existe: la página incrustaba un iframe de Slides por lámina. Medido en
 * producción, el HTML sale en 219 ms pero cada iframe tarda ~1800 ms — ocho
 * embeds son ocho arranques de la app entera de Slides. Aquí Google renderiza la
 * lámina una vez, la convertimos a WebP y el cliente recibe ~45 KB de imagen en
 * vez de una app.
 *
 * Sigue siendo el deck vivo: cada render sale del estado actual de la
 * presentación. Lo que se pierde es la inmediatez — una edición aparece cuando
 * vence el caché (o al pulsar «Actualizar», que manda ?v=<ts> y salta el edge).
 *
 * NO usa la Slides API (deshabilitada en el proyecto GCP 823887551984). Usa el
 * export de docs.google.com, que sí funciona con el scope `auth/drive` que ya
 * tenemos. Ojo con el formato del pageid: `p1`, NO `id.p1` — con `id.p1` da 404.
 */
import sharp from 'sharp';
import { OAuth2Client } from 'google-auth-library';
import { withApiHandler, sendError } from './_lib/index.js';

// El deck canónico cara al cliente. Si cambia, cambiar aquí.
const DECK = '1i4IqcwHdJUxlYOEv10rhtx2KPGvCtvrWB1l0IV_i-5o';
const LAMINAS = 8;
const ANCHO = 760; // el doble del ancho de tarjeta en pantalla: nítido en retina

// Google limita el export: pedir las 8 de golpe con caché frío devuelve 429
// (comprobado — la 8.ª falló). El caché del edge es lo que hace esto viable:
// con 5 min, un deck sólo se renderiza 8 veces cada 5 min, no una por visita.
const CACHE_S = 300;
const STALE_S = 86400;

let tokenCache = { value: null, exp: 0 };

async function accessToken() {
  const now = Date.now();
  if (tokenCache.value && now < tokenCache.exp - 60000) return tokenCache.value;

  const id = process.env.GOOGLE_OAUTH_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim();
  const refresh = process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim();
  if (!id || !secret || !refresh)
    throw new Error('OAuth de Drive sin configurar');

  const client = new OAuth2Client(id, secret);
  client.setCredentials({ refresh_token: refresh });
  const { credentials } = await client.refreshAccessToken();
  tokenCache = {
    value: credentials.access_token,
    exp: credentials.expiry_date || now + 3500000,
  };
  return tokenCache.value;
}

export default withApiHandler(
  async (req, res) => {
    const raw = Array.isArray(req.query.n) ? req.query.n[0] : req.query.n;
    const n = Number.parseInt(raw, 10);
    if (!Number.isInteger(n) || n < 1 || n > LAMINAS) {
      return sendError(res, 400, `n debe ser un entero entre 1 y ${LAMINAS}`);
    }

    const token = await accessToken();
    const url =
      `https://docs.google.com/presentation/d/${DECK}/export/png` +
      `?pageid=p${n}`;

    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (r.status === 429) {
      // Rate limit de Google. Que el edge sirva lo viejo en vez de romper la
      // página: con stale-while-revalidate esto no lo ve casi nadie.
      res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30');
      return sendError(
        res,
        503,
        'Google está limitando el render; reintenta en un momento',
      );
    }
    if (!r.ok || !(r.headers.get('content-type') || '').includes('image')) {
      return sendError(
        res,
        502,
        `El export de la lámina ${n} devolvió ${r.status}`,
      );
    }

    const png = Buffer.from(await r.arrayBuffer());
    const webp = await sharp(png)
      .resize({ width: ANCHO, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Length', String(webp.length));
    res.setHeader(
      'Cache-Control',
      `public, s-maxage=${CACHE_S}, stale-while-revalidate=${STALE_S}`,
    );
    return res.status(200).send(webp);
  },
  {
    methods: ['GET', 'OPTIONS'],
    errorPrefix: 'CotizacionLamina',
  },
);
