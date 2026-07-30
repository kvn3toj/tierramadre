/**
 * Sincroniza los términos de la presentación "Cotización Soul" con lo que ya
 * está publicado en /cotizacion-soul-plan.
 *
 * No reescribe el deck: hace tres reemplazos exactos de texto vía
 * `replaceAllText`, que respeta el formato de cada párrafo. Corre en seco por
 * defecto — hay que pasar --aplicar para que escriba.
 *
 * Uso: node scripts/soul-cotizacion-sync-terminos.mjs [--aplicar] [presentationId]
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

const ARGS = process.argv.slice(2);
const APLICAR = ARGS.includes('--aplicar');
const PRESENTATION_ID =
  ARGS.find((a) => !a.startsWith('-')) ||
  '1_MfZrJMdNW_5Ns4-h4jyzcQsvv5X2fReK_8SmVn5Kg4';

/**
 * Los reemplazos. `buscar` se compara contra el texto crudo del deck, así que
 * se mantiene corto y sin la puntuación de alrededor: menos superficie para que
 * un espacio duro o un guion distinto lo hagan fallar.
 */
const CAMBIOS = [
  {
    que: 'typo heredado: aleación, no alineación',
    buscar: 'con alineación y marca de SOUL',
    poner: 'con aleación y marca de SOUL',
  },
  {
    que: 'nota 03 · tiempo de producción',
    buscar:
      'Tiempo de entrega: a confirmar según disponibilidad de materiales.',
    poner: 'Tiempo de producción: 30 días a partir del anticipo del 60 %.',
  },
  {
    que: 'nota 04 · anticipo 60/40',
    buscar: 'Forma de pago: 90 % anticipo, 10 % contra entrega.',
    poner: 'Forma de pago: 60 % anticipo, 40 % contra entrega.',
  },
  {
    // La portada ya decía 29 y la lámina de condiciones 28. La de emisión es
    // el 29, que es la que manda para los 15 días de validez.
    que: 'condiciones · fecha de emisión al 29',
    buscar: '28 de julio de 2026',
    poner: '29 de julio de 2026',
  },
];

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

/** Todo el texto del deck, slide por slide, para poder verificar coincidencias. */
function textoDelDeck(pres) {
  const trozos = [];
  for (const [i, slide] of pres.slides.entries()) {
    for (const el of slide.pageElements || []) {
      const tes = el.shape?.text?.textElements || [];
      const t = tes.map((te) => te.textRun?.content || '').join('');
      if (t.trim()) trozos.push({ slide: i + 1, objectId: el.objectId, t });
    }
  }
  return trozos;
}

const token = await getAccessToken();
const H = { Authorization: `Bearer ${token}` };

const pres = await fetch(
  `https://slides.googleapis.com/v1/presentations/${PRESENTATION_ID}`,
  { headers: H },
).then((r) => r.json());
if (!pres.slides) throw new Error('Sin slides: ' + JSON.stringify(pres));

console.log(`"${pres.title}" · ${pres.slides.length} slides`);
console.log(APLICAR ? 'MODO: aplicar\n' : 'MODO: seco (usa --aplicar)\n');

const trozos = textoDelDeck(pres);
let listos = 0;

for (const c of CAMBIOS) {
  const donde = trozos.filter((x) => x.t.includes(c.buscar));
  const ya = trozos.filter((x) => x.t.includes(c.poner));

  if (donde.length) {
    listos++;
    console.log(`✓ ${c.que}`);
    for (const d of donde) console.log(`    slide ${d.slide} · ${d.objectId}`);
  } else if (ya.length) {
    console.log(`— ${c.que}: ya estaba aplicado, nada que hacer`);
  } else {
    console.log(`✗ ${c.que}: NO se encontró el texto a reemplazar`);
    console.log(`    buscaba: ${JSON.stringify(c.buscar)}`);
  }
}

if (!APLICAR) {
  console.log(`\n${listos} de ${CAMBIOS.length} cambios listos para aplicar.`);
  process.exit(0);
}

// Se guarda el cambio junto a su request: la lista va filtrada, así que el
// índice de la respuesta no corresponde al de CAMBIOS y las etiquetas del
// reporte saldrían cruzadas.
const pendientes = CAMBIOS.filter((c) =>
  trozos.some((x) => x.t.includes(c.buscar)),
).map((c) => ({
  cambio: c,
  request: {
    replaceAllText: {
      containsText: { text: c.buscar, matchCase: true },
      replaceText: c.poner,
    },
  },
}));

if (!pendientes.length) {
  console.log('\nNada que aplicar.');
  process.exit(0);
}

const requests = pendientes.map((p) => p.request);

const res = await fetch(
  `https://slides.googleapis.com/v1/presentations/${PRESENTATION_ID}:batchUpdate`,
  {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  },
);

if (!res.ok) {
  console.error('ERROR ' + res.status, (await res.text()).slice(0, 400));
  process.exit(1);
}

const out = await res.json();
console.log('\nAplicado:');
for (const [i, r] of (out.replies || []).entries()) {
  const n = r.replaceAllText?.occurrencesChanged ?? 0;
  console.log(
    `  ${pendientes[i]?.cambio.que ?? `cambio ${i}`} → ${n} ocurrencia(s)`,
  );
}
