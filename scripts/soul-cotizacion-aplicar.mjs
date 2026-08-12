/**
 * Duplica "ACTUAL de Cotización Soul — Cards 1080×1920" y reescribe la copia
 * con la cotización formal del 28 de julio de 2026.
 *
 * El original NUNCA se modifica: todo ocurre sobre la copia.
 *
 * Estructura resultante (8 slides):
 *   1 Portada · 2 Condiciones · 3 Manilla de cuero · 4 Anillo Nexus
 *   5 Manilla Tenis · 6 Anillo Trinity · 7 Notas importantes · 8 Cierre
 *
 * Uso:  node scripts/soul-cotizacion-aplicar.mjs            # dry-run (imprime el plan)
 *       node scripts/soul-cotizacion-aplicar.mjs --apply    # ejecuta
 */
import { config } from 'dotenv';
import { writeFileSync, mkdirSync } from 'node:fs';
import {
  LINEAS,
  NOTAS,
  ENCABEZADO,
  TOTAL_UNIDADES,
  TOTAL_PLAN,
  money,
} from './soul-cotizacion-contenido.mjs';

config({ path: '.env.local' });
config({ path: '.env' });

const APPLY = process.argv.includes('--apply');
const ORIGEN = '1i4IqcwHdJUxlYOEv10rhtx2KPGvCtvrWB1l0IV_i-5o';
const NOMBRE_COPIA = 'Cotización Soul — 28 de julio de 2026';

// ─── Auth ────────────────────────────────────────────────────────────────────
async function accessToken() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('OAuth falló: ' + JSON.stringify(j));
  return j.access_token;
}

const token = await accessToken();
const H = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function getPresentation(id) {
  const r = await fetch(
    `https://slides.googleapis.com/v1/presentations/${id}`,
    { headers: H },
  );
  if (!r.ok)
    throw new Error(
      'GET presentación: ' + r.status + ' ' + (await r.text()).slice(0, 300),
    );
  return r.json();
}

// ─── Mapa de textos actuales (para calcular rangos de borrado) ───────────────
function indexarTextos(pres) {
  const mapa = new Map();
  for (const slide of pres.slides) {
    for (const el of slide.pageElements || []) {
      if (!el.shape?.text) continue;
      const txt = el.shape.text.textElements
        .map((t) => t.textRun?.content || '')
        .join('');
      mapa.set(el.objectId, txt);
    }
  }
  return mapa;
}

/**
 * Reemplaza el texto de una shape preservando el estilo del primer carácter:
 * inserta el texto nuevo en el índice 0 y luego borra el viejo (ya desplazado).
 * Slides no permite borrar el salto de línea final, por eso se descuenta.
 */
function reemplazarTexto(objectId, nuevo, textoViejo) {
  const reqs = [];
  if (nuevo)
    reqs.push({ insertText: { objectId, insertionIndex: 0, text: nuevo } });

  const borrable = textoViejo.endsWith('\n')
    ? textoViejo.length - 1
    : textoViejo.length;
  if (borrable > 0) {
    reqs.push({
      deleteText: {
        objectId,
        textRange: {
          type: 'FIXED_RANGE',
          startIndex: nuevo.length,
          endIndex: nuevo.length + borrable,
        },
      },
    });
  }
  return reqs;
}

// ─── Contenido por slide ─────────────────────────────────────────────────────
const [MANILLA, NEXUS, TENIS, TRINITY] = LINEAS;

/** Slides que se eliminan por completo: Módulos, Canutillo, Manilla Solitario. */
const SLIDES_A_BORRAR = ['p3', 'p5', 'g3f3c105f4ee_0_0'];

/** Shapes a eliminar (filas alternativas, badges RECOMENDADA, notas al pie). */
const SHAPES_A_BORRAR = [
  // Línea 01 — filas 2 y 3 de acabados (ahora hay un precio único)
  'p2_i20',
  'p2_i21',
  'p2_i22',
  'p2_i24',
  'p2_i25',
  'p2_i26',
  // Nexus — badge y fila alternativa premium
  'p4_i15',
  'p4_i20',
  'p4_i21',
  'p4_i22',
  'p4_i24',
  // Tenis — badge
  'p6_i15',
  // Cierre — quinta fila (ahora solo hay 4 líneas)
  'p8_i29',
  'p8_i30',
  'p8_i31',
  'p8_i32',
  'p8_i33',
];

/** Textos a reescribir, por objectId. */
const TEXTOS = {
  // ── Slide 1 · Portada ──────────────────────────────────────────────────────
  p1_i6: `Plan de producción · ${TOTAL_UNIDADES} unidades · ${ENCABEZADO.fecha}`,

  // ── Slide 3 · Línea 01 · Manilla de cuero ─────────────────────────────────
  p2_i5: `LÍNEA 01 · ${MANILLA.unidades} UNIDADES`,
  p2_i6: MANILLA.titulo,
  p2_i7: 'PARA',
  p2_i8: `${MANILLA.para} · ${MANILLA.desglose}`,
  p2_i9: 'JOYA',
  p2_i10: MANILLA.joya,
  p2_i16: 'Precio de la pieza',
  p2_i17: money(MANILLA.unitario),
  p2_i18: money(MANILLA.total),
  p2_i28: 'Incluye mecanismo, módulos y la marca SOUL. No se suman aparte.',

  // ── Slide 4 · Línea 02 · Anillo Nexus ─────────────────────────────────────
  p4_i5: `LÍNEA 02 · ${NEXUS.unidades} UNIDADES`,
  p4_i6: NEXUS.titulo,
  p4_i8: NEXUS.gemas,
  p4_i10: NEXUS.joya,
  p4_i16: 'Precio de la pieza',
  p4_i17: money(NEXUS.unitario),
  p4_i18: money(NEXUS.total),

  // ── Slide 5 · Línea 03 · Manilla Tenis ────────────────────────────────────
  p6_i5: `LÍNEA 03 · ${TENIS.unidades} UNIDADES`,
  p6_i6: TENIS.titulo,
  p6_i8: TENIS.gemas,
  p6_i10: TENIS.joya,
  p6_i16: 'Precio de la pieza',
  p6_i17: money(TENIS.unitario),
  p6_i18: money(TENIS.total),

  // ── Slide 6 · Línea 04 · Anillo Trinity ───────────────────────────────────
  p7_i7: `LÍNEA 04 · ${TRINITY.unidades} UNIDAD`,
  p7_i8: TRINITY.titulo,
  p7_i10: TRINITY.gemas,
  p7_i12: TRINITY.joya,
  p7_i16: 'Precio de la pieza',
  p7_i17: money(TRINITY.unitario),
  p7_i18: money(TRINITY.total),

  // ── Slide 8 · Cierre · Resumen ────────────────────────────────────────────
  p8_i5: `${TOTAL_UNIDADES} unidades · 4 líneas de producto. Precios en COP, IVA no incluido.`,
  p8_i9: 'Manilla de cuero tipo exportación',
  p8_i10: `${MANILLA.desglose} · ${MANILLA.unidades} unidades`,
  p8_i11: money(MANILLA.unitario),
  p8_i12: money(MANILLA.total),
  p8_i14: NEXUS.titulo,
  p8_i15: `Oro 18 k · esmeralda F2 cuadrada · ${NEXUS.unidades} unidades`,
  p8_i16: money(NEXUS.unitario),
  p8_i17: money(NEXUS.total),
  p8_i19: TENIS.titulo,
  p8_i20: `Oro 18 k · 22 esmeraldas · ${TENIS.unidades} unidades`,
  p8_i21: money(TENIS.unitario),
  p8_i22: money(TENIS.total),
  p8_i24: TRINITY.titulo,
  p8_i25: `Oro 18 k · esmeralda redonda · ${TRINITY.unidades} unidad`,
  p8_i26: money(TRINITY.unitario),
  p8_i27: money(TRINITY.total),
  p8_i36: money(TOTAL_PLAN),
};

// ─── Slides nuevos clonados del Cierre (mismo diseño de filas) ───────────────
// Cada fila del Cierre = [título Cormorant 25.5pt, subtítulo Montserrat 9.75pt,
//                         precio unidad, precio total]
const FILAS_CIERRE = [
  { titulo: 'p8_i9', sub: 'p8_i10', pu: 'p8_i11', pt: 'p8_i12' },
  { titulo: 'p8_i14', sub: 'p8_i15', pu: 'p8_i16', pt: 'p8_i17' },
  { titulo: 'p8_i19', sub: 'p8_i20', pu: 'p8_i21', pt: 'p8_i22' },
  { titulo: 'p8_i24', sub: 'p8_i25', pu: 'p8_i26', pt: 'p8_i27' },
  { titulo: 'p8_i29', sub: 'p8_i30', pu: 'p8_i31', pt: 'p8_i32' },
];
const CIERRE_CABECERAS = ['p8_i6', 'p8_i7'];
const CIERRE_TOTAL = ['p8_i34', 'p8_i35', 'p8_i36'];

/** Construye el mapa de ids para duplicar el Cierre con ids predecibles. */
function mapaIds(prefijo) {
  const m = {
    p8: prefijo,
    p8_i3: `${prefijo}_eyebrow`,
    p8_i4: `${prefijo}_titulo`,
    p8_i5: `${prefijo}_bajada`,
  };
  for (const c of CIERRE_CABECERAS) m[c] = `${prefijo}_${c}`;
  for (const t of CIERRE_TOTAL) m[t] = `${prefijo}_${t}`;
  for (const f of FILAS_CIERRE) {
    m[f.titulo] = `${prefijo}_${f.titulo}`;
    m[f.sub] = `${prefijo}_${f.sub}`;
    m[f.pu] = `${prefijo}_${f.pu}`;
    m[f.pt] = `${prefijo}_${f.pt}`;
  }
  return m;
}

const CONDICIONES_FILAS = [
  ['Fecha', ENCABEZADO.fecha],
  ['Ciudad', ENCABEZADO.ciudad],
  ['Validez', ENCABEZADO.validez],
  ['Moneda', ENCABEZADO.moneda],
  ['IVA', ENCABEZADO.iva],
];

// ─── Ejecución ───────────────────────────────────────────────────────────────
const original = await getPresentation(ORIGEN);
const textosOriginales = indexarTextos(original);

console.log('Original:', original.title, `· ${original.slides.length} slides`);
console.log('\nPlan:');
console.log(`  · Copia nueva: "${NOMBRE_COPIA}"`);
console.log(
  `  · Slides eliminados: ${SLIDES_A_BORRAR.join(', ')} (Módulos, Canutillo, Solitario)`,
);
console.log(`  · Slides nuevos: Condiciones y Notas (clonados del Cierre)`);
console.log(`  · Shapes eliminados: ${SHAPES_A_BORRAR.length}`);
console.log(`  · Textos reescritos: ${Object.keys(TEXTOS).length}`);
console.log(
  `  · Total del plan: ${money(TOTAL_PLAN)} · ${TOTAL_UNIDADES} unidades`,
);

const faltantes = Object.keys(TEXTOS).filter((id) => !textosOriginales.has(id));
if (faltantes.length) {
  console.error(
    '\n✗ objectIds inexistentes en el original:',
    faltantes.join(', '),
  );
  process.exit(1);
}
console.log(
  '\n✓ Los',
  Object.keys(TEXTOS).length,
  'objectIds existen en el original.',
);

if (!APPLY) {
  console.log(
    '\n(dry-run) Ejecuta con --apply para crear la copia y aplicar los cambios.',
  );
  process.exit(0);
}

// 1 · Copiar el archivo
const copiaRes = await fetch(
  `https://www.googleapis.com/drive/v3/files/${ORIGEN}/copy?supportsAllDrives=true&fields=id,name,webViewLink`,
  { method: 'POST', headers: H, body: JSON.stringify({ name: NOMBRE_COPIA }) },
);
if (!copiaRes.ok)
  throw new Error('Copia falló: ' + (await copiaRes.text()).slice(0, 400));
const copia = await copiaRes.json();
console.log('\n✓ Copia creada:', copia.id);

// 2 · Verificar que los objectIds se preservaron en la copia
const presCopia = await getPresentation(copia.id);
const textosCopia = indexarTextos(presCopia);
const perdidos = Object.keys(TEXTOS).filter((id) => !textosCopia.has(id));
if (perdidos.length) {
  console.error('✗ La copia no preservó estos objectIds:', perdidos.join(', '));
  console.error('  Revisa la copia manualmente:', copia.webViewLink);
  process.exit(1);
}
console.log('✓ La copia preservó todos los objectIds.');

// 3 · Construir las peticiones
const reqs = [];

// 3a · Clonar el Cierre dos veces (antes de reescribirlo)
reqs.push({ duplicateObject: { objectId: 'p8', objectIds: mapaIds('condi') } });
reqs.push({ duplicateObject: { objectId: 'p8', objectIds: mapaIds('notas') } });

// 3b · Eliminar slides descartados
for (const id of SLIDES_A_BORRAR) reqs.push({ deleteObject: { objectId: id } });

// 3c · Eliminar shapes sobrantes
for (const id of SHAPES_A_BORRAR) reqs.push({ deleteObject: { objectId: id } });

// 3d · Reescribir textos de los slides existentes
for (const [objectId, nuevo] of Object.entries(TEXTOS)) {
  reqs.push(...reemplazarTexto(objectId, nuevo, textosCopia.get(objectId)));
}

await enviarLote(reqs, 'estructura + textos base');

// 4 · Poblar los dos slides clonados (sus textos son copia del Cierre original)
const reqs2 = [];

for (const [prefijo, cfg] of [
  [
    'condi',
    {
      eyebrow: 'CONDICIONES',
      titulo: 'Condiciones\nde la cotización',
      bajada:
        'Cotización formal · válida por 15 días desde la fecha de emisión.',
      filas: CONDICIONES_FILAS,
    },
  ],
  [
    'notas',
    {
      eyebrow: 'NOTAS',
      titulo: 'Notas\nimportantes',
      bajada: 'Condiciones de producción, entrega y pago.',
      filas: NOTAS.map((n, i) => [String(i + 1).padStart(2, '0'), n]),
    },
  ],
]) {
  const t = (id) => textosCopia.get(id); // el clon hereda el texto del Cierre original
  reqs2.push(...reemplazarTexto(`${prefijo}_eyebrow`, cfg.eyebrow, t('p8_i3')));
  reqs2.push(...reemplazarTexto(`${prefijo}_titulo`, cfg.titulo, t('p8_i4')));
  reqs2.push(...reemplazarTexto(`${prefijo}_bajada`, cfg.bajada, t('p8_i5')));

  // Cabeceras de columna de precios y bloque de total: fuera
  for (const id of [...CIERRE_CABECERAS, ...CIERRE_TOTAL]) {
    reqs2.push({ deleteObject: { objectId: `${prefijo}_${id}` } });
  }

  FILAS_CIERRE.forEach((fila, i) => {
    const dato = cfg.filas[i];
    // Columnas de precio: fuera en ambos slides
    reqs2.push({ deleteObject: { objectId: `${prefijo}_${fila.pu}` } });
    reqs2.push({ deleteObject: { objectId: `${prefijo}_${fila.pt}` } });

    if (!dato) {
      // Fila sin contenido (Notas solo usa 4): se elimina completa
      reqs2.push({ deleteObject: { objectId: `${prefijo}_${fila.titulo}` } });
      reqs2.push({ deleteObject: { objectId: `${prefijo}_${fila.sub}` } });
      return;
    }
    reqs2.push(
      ...reemplazarTexto(`${prefijo}_${fila.titulo}`, dato[0], t(fila.titulo)),
    );
    reqs2.push(
      ...reemplazarTexto(`${prefijo}_${fila.sub}`, dato[1], t(fila.sub)),
    );
  });
}

await enviarLote(reqs2, 'contenido de Condiciones y Notas');

// 4b · Eliminar la fila «Manilla Solitario» heredada del Cierre original.
//      No es una shape suelta sino un elementGroup, por eso no aparece en el
//      mapa de textos; además se clonó a los dos slides nuevos con ids
//      autogenerados, así que hay que buscarla en vivo.
const conGrupos = await getPresentation(copia.id);
const reqsGrupos = [];
for (const s of conGrupos.slides) {
  if (!['p8', 'condi', 'notas'].includes(s.objectId)) continue;
  for (const el of s.pageElements || []) {
    if (el.elementGroup) {
      reqsGrupos.push({ deleteObject: { objectId: el.objectId } });
    }
  }
}
await enviarLote(reqsGrupos, 'fila heredada «Manilla Solitario»');

// 4c · Ajustes de maquetación tras quitar filas.
//   · El título de la Línea 01 ocupa 2 renglones (el original era de 1) y se
//     encima sobre PARA/JOYA. El deck ya traía una variante de 2 renglones
//     (el slide del Canutillo): baja el bloque 0,64" — se replica aquí.
//   · Quedan divisores huérfanos donde se eliminaron filas.
const EMU_PULGADA = 914400;
const yDe = (el) => (el.transform?.translateY || 0) / EMU_PULGADA;
const esDivisor = (el) => {
  const h = (el.size?.height?.magnitude || 0) * (el.transform?.scaleY || 1);
  const w = (el.size?.width?.magnitude || 0) * (el.transform?.scaleX || 1);
  return !!el.shape && h / EMU_PULGADA < 0.05 && w / EMU_PULGADA > 5;
};

/** Divisores sin fila que los acompañe, por slide y rango vertical. */
const DIVISORES_HUERFANOS = {
  p2: (y) => y > 16.0, // filas 2 y 3 de acabados
  p4: (y) => y > 16.0, // fila alternativa premium
  notas: (y) => y > 10.0, // quinta fila (solo hay 4 notas)
};

/** Bloque de la Línea 01 que baja 0,64" para dejar sitio al título de 2 renglones. */
const P2_BAJAR = [
  'p2_i7',
  'p2_i8',
  'p2_i9',
  'p2_i10',
  'p2_i11',
  'p2_i12',
  'p2_i13',
  'p2_i14',
  'p2_i16',
  'p2_i17',
  'p2_i18',
  'p2_i19',
];
const P2_DESPLAZAMIENTO = 0.64;
const P2_NOTA_AL_PIE = { objectId: 'p2_i28', delta: -1.11 };

const reqsMaqueta = [];
const trasGrupos = await getPresentation(copia.id);
for (const s of trasGrupos.slides) {
  const regla = DIVISORES_HUERFANOS[s.objectId];
  if (!regla) continue;
  for (const el of s.pageElements || []) {
    if (esDivisor(el) && regla(yDe(el))) {
      reqsMaqueta.push({ deleteObject: { objectId: el.objectId } });
    }
  }
}
const mover = (objectId, deltaPulgadas) => ({
  updatePageElementTransform: {
    objectId,
    applyMode: 'RELATIVE',
    transform: {
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: Math.round(deltaPulgadas * EMU_PULGADA),
      unit: 'EMU',
    },
  },
});
for (const id of P2_BAJAR) reqsMaqueta.push(mover(id, P2_DESPLAZAMIENTO));
reqsMaqueta.push(mover(P2_NOTA_AL_PIE.objectId, P2_NOTA_AL_PIE.delta));

await enviarLote(reqsMaqueta, 'maquetación (divisores + bloque Línea 01)');

// 5 · Reordenar: Portada · Condiciones · 4 productos · Notas · Cierre
// updateSlidesPosition exige que los ids vayan en el orden ACTUAL de la
// presentación, así que no se puede pedir el orden final de una sola vez.
// Moviendo un slide a la vez a su índice destino, el mazo queda ordenado.
const ORDEN_FINAL = ['p1', 'condi', 'p2', 'p4', 'p6', 'p7', 'notas', 'p8'];
await enviarLote(
  ORDEN_FINAL.map((slideObjectId, i) => ({
    updateSlidesPosition: {
      slideObjectIds: [slideObjectId],
      insertionIndex: i,
    },
  })),
  'orden de slides',
);

const final = await getPresentation(copia.id);
mkdirSync('scripts/.soul', { recursive: true });
writeFileSync(
  'scripts/.soul/presentation-copia.json',
  JSON.stringify(final, null, 2),
);

console.log(`\n✓ Listo — ${final.slides.length} slides`);
console.log('  ' + `https://docs.google.com/presentation/d/${copia.id}/edit`);
console.log('\nOrden final:');
final.slides.forEach((s, i) => {
  const primer = (s.pageElements || []).find((e) => e.shape?.text);
  const txt = primer
    ? primer.shape.text.textElements
        .map((x) => x.textRun?.content || '')
        .join('')
        .trim()
        .split('\n')[0]
    : '(sin texto)';
  console.log(`  ${i + 1}. ${s.objectId.padEnd(6)} ${txt}`);
});

async function enviarLote(requests, etiqueta) {
  if (!requests.length) return;
  const r = await fetch(
    `https://slides.googleapis.com/v1/presentations/${copia.id}:batchUpdate`,
    { method: 'POST', headers: H, body: JSON.stringify({ requests }) },
  );
  if (!r.ok) {
    console.error(`✗ batchUpdate (${etiqueta}) falló:`, r.status);
    console.error((await r.text()).slice(0, 900));
    console.error(
      '  Copia parcial:',
      `https://docs.google.com/presentation/d/${copia.id}/edit`,
    );
    process.exit(1);
  }
  console.log(`✓ batchUpdate (${etiqueta}): ${requests.length} peticiones`);
}
