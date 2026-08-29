/**
 * DRY-RUN del modelo de niveles A/B/C sobre el inventario en alcance.
 *
 * Lee EXCLUSIVAMENTE del respaldo `scripts/.backups/precios-y-costos-ANTES-2026-08-21.json`
 * (hoja + prod + dev, 576 filas c/u, tomado el 2026-08-21 antes de tocar nada).
 * NO toca la hoja, NO toca Convex, NO hace red. Solo calcula y reporta.
 *
 * Alcance dictado por Kevin el 2026-08-21: SOLO `DISPONIBLE`, `ASESOR` y
 * `CONSIGNACION`. Todo lo demás se deja intacto — en particular `VENDIDA`, cuyas
 * 193 filas SON el dataset que calibró el modelo (2.63× realizado).
 *
 * Modelo: nota Anima `2026-08-20-modelo-niveles-piso-lista-calibrado`.
 * El precio vigente se lee del respaldo de prod/hoja, NUNCA de
 * `api/get-treasure-sheets.ts` — hasta el PR #146 ese endpoint sirve el COSTO
 * como precio en 22 ítems (hallazgo de la auditoría de rieles).
 */
import { readFileSync } from 'node:fs';

const BACKUP = 'scripts/.backups/precios-y-costos-ANTES-2026-08-21.json';
const EN_ALCANCE = new Set(['DISPONIBLE', 'ASESOR', 'CONSIGNACION']);

// Los 13 que la sesión Conductor ya dejó a precio de nivel hoy (PR #146).
const YA_HECHOS = new Set([
  577, 578, 579, 584,                                  // dijes/manillas lote TM-001
  544, 545, 546, 549, 550, 551, 553, 554, 482,         // Lote Origen / 170
]);

const NIVELES = {
  A: { lista: 4.5, piso: 3.5 },
  B: { lista: 3.5, piso: 2.8 },
  C: { lista: 2.0, piso: 1.5 },
};

const POR_CALIDAD = new Map(Object.entries({
  'FINA SUBLIME': 'A', 'FINA ESENCIAL': 'A', 'F1': 'A',
  'FINA': 'B', 'FINA COMERCIAL': 'B', 'F2': 'B', 'COMERCIAL SÚPER FINA': 'B',
  'COMERCIAL SUPERIOR': 'B', 'NO OIL': 'B', 'MORRALLA FINA': 'B',
  'COMERCIAL FINA': 'C', 'COMERCIAL ESTÁNDAR': 'C', 'MORRALLA COMERCIAL': 'C',
  'PLATA COMERCIAL': 'C', 'VARIADA': 'C', 'INSUMO': 'C', 'MARKETING': 'C', 'TOPITOS': 'C',
}));

/** Vacío → B provisional (lo dice el modelo). Un valor que NO está en la tabla
 *  no es "vacío": es una calidad sin clasificar, y adivinarla sería inventar. */
function nivelDe(calidad) {
  const c = (calidad ?? '').trim();
  if (c === '') return { nivel: 'B', provisional: true };
  const n = POR_CALIDAD.get(c.toUpperCase());
  return n ? { nivel: n, provisional: false } : { nivel: null, provisional: false };
}

/** Ticket mínimo con MESETA. `min(costo, 100k)` es toda la corrección: por
 *  debajo de $100.000 da el 3.0×/2.5× de la regla; por encima congela el piso
 *  del ticket en $300.000/$250.000 hasta que el multiplicador del nivel lo
 *  alcanza. Sin ese `min`, un ítem C de $100.001 lista MÁS BARATO que uno de
 *  $99.999 — un salto de −33% por costar un peso más. */
const ticketMinLista = (costo) => Math.min(costo, 100_000) * 3.0;
const ticketMinPiso  = (costo) => Math.min(costo, 100_000) * 2.5;

function redondeo(v) {
  const paso = v < 1_000_000 ? 10_000 : v < 100_000_000 ? 100_000 : 1_000_000;
  return Math.ceil(v / paso) * paso;
}

const raw = JSON.parse(readFileSync(BACKUP, 'utf8'));
const prod = new Map(raw.prod);
const hoja = new Map(raw.hoja);

const cubetas = {
  sube: [], nuncaBajar: [], sinCosto: [], sinClasificar: [], yaHecho: [], igual: [],
};

for (const [itemId, row] of prod) {
  if (!EN_ALCANCE.has(row.estado)) continue;
  const n = Number(itemId);
  const ficha = {
    item: n, nombre: row.nombre, calidad: row.calidad ?? '', estado: row.estado,
    costo: row.costoBaseCOP ?? 0, vigente: row.precioFinalCOP ?? 0,
    manual: row.precioFinalManual === true,
    costoHoja: hoja.get(itemId)?.costo ?? null,
  };

  if (YA_HECHOS.has(n)) { cubetas.yaHecho.push(ficha); continue; }

  // Un 0 en costo significa «todavía no lo tecleé», no un costo real
  // (CLAUDE.md + spec de campos protegidos, clase `dinero`). Multiplicarlo
  // daría 0, y un 0 estampado como precio es un dato inventado.
  if (!ficha.costo) { cubetas.sinCosto.push(ficha); continue; }

  const { nivel, provisional } = nivelDe(ficha.calidad);
  if (!nivel) { cubetas.sinClasificar.push(ficha); continue; }

  const m = NIVELES[nivel];
  const lista = redondeo(Math.max(ficha.costo * m.lista, ticketMinLista(ficha.costo)));
  const piso  = redondeo(Math.max(ficha.costo * m.piso,  ticketMinPiso(ficha.costo)));
  const conMeseta = ficha.costo >= 100_000 && ficha.costo * m.lista < ticketMinLista(ficha.costo);

  Object.assign(ficha, { nivel, provisional, lista, piso, conMeseta,
    mult: +(lista / ficha.costo).toFixed(2) });

  if (ficha.vigente > lista) cubetas.nuncaBajar.push(ficha);
  else if (ficha.vigente === lista) cubetas.igual.push(ficha);
  else cubetas.sube.push(ficha);
}

const cop = (v) => '$' + Math.round(v).toLocaleString('es-CO');
const total = Object.values(cubetas).reduce((a, b) => a + b.length, 0);

console.log(`\n═══ DRY-RUN · modelo de niveles A/B/C — ${total} ítems en alcance ═══`);
console.log(`    (DISPONIBLE + ASESOR + CONSIGNACION · nada más se toca)\n`);
for (const [k, v] of Object.entries(cubetas)) {
  console.log(`  ${k.padEnd(15)} ${String(v.length).padStart(4)}`);
}

const sumaVig = cubetas.sube.reduce((a, f) => a + f.vigente, 0);
const sumaNue = cubetas.sube.reduce((a, f) => a + f.lista, 0);
console.log(`\n─── SUBEN (${cubetas.sube.length}) ───`);
console.log(`  lista vigente: ${cop(sumaVig)}  →  lista nueva: ${cop(sumaNue)}   (+${cop(sumaNue - sumaVig)})`);
const porNivel = {};
for (const f of cubetas.sube) (porNivel[f.nivel] ??= []).push(f);
for (const [niv, fs] of Object.entries(porNivel).sort()) {
  const prov = fs.filter((f) => f.provisional).length;
  console.log(`   Nivel ${niv}: ${String(fs.length).padStart(3)} ítems` + (prov ? `  (${prov} por calidad vacía → B provisional)` : ''));
}
const meseta = cubetas.sube.filter((f) => f.conMeseta);
console.log(`   Con meseta del ticket mínimo activa: ${meseta.length}`);

console.log(`\n  Los 12 saltos más grandes:`);
for (const f of [...cubetas.sube].sort((a, b) => (b.lista - b.vigente) - (a.lista - a.vigente)).slice(0, 12)) {
  console.log(`   #${String(f.item).padStart(3)} ${(f.nombre ?? '').slice(0, 26).padEnd(26)} ${f.nivel} ` +
    `costo ${cop(f.costo).padStart(13)}  ${cop(f.vigente).padStart(13)} → ${cop(f.lista).padStart(13)}  (piso ${cop(f.piso)})`);
}

console.log(`\n─── NUNCA BAJAR (${cubetas.nuncaBajar.length}) — el vigente ya supera la lista, se respeta ───`);
for (const f of [...cubetas.nuncaBajar].sort((a, b) => (b.vigente / b.lista) - (a.vigente / a.lista)).slice(0, 8)) {
  console.log(`   #${String(f.item).padStart(3)} ${(f.nombre ?? '').slice(0, 26).padEnd(26)} ${f.nivel} ` +
    `vigente ${cop(f.vigente).padStart(13)} vs lista ${cop(f.lista).padStart(13)}  (${(f.vigente / f.lista).toFixed(1)}× la lista)`);
}

console.log(`\n─── SIN COSTO (${cubetas.sinCosto.length}) — no se puede calcular, necesitan costo tecleado ───`);
console.log(`   ${cubetas.sinCosto.map((f) => '#' + f.item).join(' ')}`);
const conPrecioSinCosto = cubetas.sinCosto.filter((f) => f.vigente);
console.log(`   de esos, ${conPrecioSinCosto.length} YA tienen precio vigente (dictado, no derivado) y ${cubetas.sinCosto.length - conPrecioSinCosto.length} no tienen ninguno`);

console.log(`\n─── SIN CLASIFICAR (${cubetas.sinClasificar.length}) — calidad fuera del vocabulario A/B/C ───`);
for (const f of cubetas.sinClasificar) {
  console.log(`   #${String(f.item).padStart(3)} ${(f.nombre ?? '').slice(0, 26).padEnd(26)} calidad=${JSON.stringify(f.calidad)}  costo ${cop(f.costo)}`);
}

console.log(`\n─── Manillas y dijes en alcance ───`);
const manillas = [...cubetas.sube, ...cubetas.nuncaBajar, ...cubetas.igual, ...cubetas.sinCosto, ...cubetas.yaHecho]
  .filter((f) => /manilla|dije|pulsera/i.test(f.nombre ?? ''))
  .sort((a, b) => a.item - b.item);
for (const f of manillas) {
  const destino = f.lista ? `${cop(f.vigente)} → ${cop(f.lista)} (piso ${cop(f.piso)})`
    : YA_HECHOS.has(f.item) ? `${cop(f.vigente)} · ya fijado hoy por el Conductor`
    : `${cop(f.vigente)} · SIN COSTO, no calculable`;
  console.log(`   #${String(f.item).padStart(3)} ${(f.nombre ?? '').slice(0, 28).padEnd(28)} ${(f.nivel ?? '-')} ${destino}`);
}
console.log();
