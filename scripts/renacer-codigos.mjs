/**
 * ⚠️ RETIRADO DEL CAMINO PRINCIPAL (2026-08-31).
 *
 * Este registro local (`scripts/.data/renacer-registro-codigos.json`) era la tabla madre
 * de códigos por kit del diseño del 25-08. Con el pivote del 31-08 los códigos los emite
 * una raíz (líder comunitario) desde Convex: ver `convex-renacer/README.md` → "Operación".
 * Este script queda como referencia del camino legado; no escribe en Convex y nada lo lee.
 */
/**
 * Registro de códigos de kit de la campaña Renacer — la "tabla madre" del §7.3
 * de `docs/superpowers/specs/2026-08-25-renacer-qr-flow-design.md`.
 *
 * Un código por KIT comprado (no por manilla, no global). Todas las manillas de
 * un kit — la propia y las N aportadas — llevan el mismo código impreso en su
 * estuche. **El código ES la relación aportador↔beneficiarios**: quien se registra
 * con el código X queda vinculado al kit X y, por él, a su aportador. No hay ni
 * hace falta una tabla de "relación" aparte.
 *
 * Compuerta ratificada por Kevin el 2026-08-25 (spec §3.4 · G-A.2), que este
 * script hace cumplir por código y no por disciplina:
 *
 *  - **Numérico, secuencial, arranque en 101, techo 9999** (3–4 dígitos). Sin
 *    letras, sin checksum, sin ceros a la izquierda.
 *  - **Sin huecos y sin reutilizar.** El código de un kit anulado NO vuelve a
 *    emitirse: se marca `cerrado` y la secuencia sigue de largo. Un código
 *    reutilizado vincularía beneficiarios nuevos a un aportador viejo.
 *  - **El código se emite al CONFIRMAR EL PAGO** (webhook → venta confirmada),
 *    nunca antes: por eso `--emitir` exige `--sale-id` y `--fecha-pago`.
 *  - **`manillas_total` se DERIVA de `kit_tipo`**, jamás se acepta del input.
 *    Un total tecleado a mano es un dato inventado con forma de dato.
 *  - **`manillas_registradas` arranca en 0** y solo sube contando registros de
 *    beneficiario con ese código — es el insumo de la visibilidad agregada del
 *    aportador (§4.9: "8 de tus 10 manillas ya fueron registradas").
 *
 * Otras reglas de la casa que aplica:
 *
 *  - **Dry-run por defecto.** Sin `--apply` no escribe nada.
 *  - **Respaldo** del registro entero en `scripts/.backups/` antes de tocarlo.
 *  - **Relee y verifica** después de escribir; si lo releído no coincide con lo
 *    que dijo haber escrito, sale con código 1 y lo dice.
 *
 * NOTA sobre una extensión documentada a las columnas del §7.3: el spec lista
 * `codigo · kit_tipo · saleId · aportador · fecha_pago · manillas_total ·
 * manillas_registradas · estado`. Este registro añade **`producto`**
 * (`manillas` | `dijes`), porque el precio ratificado y el conteo dependen de
 * él (§11.1: manillas $111.000/u, dijes $166.500/u) y sin esa columna el
 * registro no se puede reconciliar contra las ventas. Es la única columna que
 * este script agrega sobre el §7.3, y queda dicha aquí a propósito.
 *
 * Uso:
 *   node scripts/renacer-codigos.mjs --kits
 *   node scripts/renacer-codigos.mjs --listar
 *   node scripts/renacer-codigos.mjs --emitir --kit 1+10 --producto manillas \
 *        --aportador "Juan Pérez <3001234567>" --sale-id j57xk... --fecha-pago 2026-08-26
 *   node scripts/renacer-codigos.mjs --emitir ... --apply
 *   node scripts/renacer-codigos.mjs --estado 101 impreso --apply
 *   node scripts/renacer-codigos.mjs --registradas 101 8 --apply
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRO = join(__dirname, '.data', 'renacer-registro-codigos.json');
const BACKUPS = join(__dirname, '.backups');

/** Compuerta §3.4 · G-A.2 — ratificada 2026-08-25. No cambiar sin una nueva compuerta. */
const CODIGO_INICIAL = 101;
const CODIGO_TECHO = 9999;

/** Decisión ratificada #4 (25-08): 4 kits fijos, sin calculadora. */
const KITS = {
  '1+1': { manillas: 2 },
  '1+5': { manillas: 6 },
  '1+10': { manillas: 11 },
  '1+100': { manillas: 101 },
};

/** Precios ratificados — spec §11.1 (aritmética lineal, Kevin 2026-08-25). En COP. */
const PRECIO_UNITARIO = { manillas: 111000, dijes: 166500 };

const ESTADOS = ['emitido', 'impreso', 'entregando', 'cerrado'];
const PRODUCTOS = ['manillas', 'dijes'];

const cop = (n) => n.toLocaleString('es-CO');

function morir(msg) {
  console.error(`\n⛔ ${msg}\n`);
  process.exit(1);
}

function cargar() {
  if (!existsSync(REGISTRO)) return { kits: [] };
  const raw = JSON.parse(readFileSync(REGISTRO, 'utf8'));
  if (!Array.isArray(raw.kits)) morir(`${REGISTRO} no tiene un arreglo "kits".`);
  return raw;
}

function guardar(registro, { apply }) {
  if (!apply) {
    console.log('\n🔎 DRY-RUN — no se escribió nada. Repetí con --apply para aplicar.\n');
    return;
  }
  mkdirSync(dirname(REGISTRO), { recursive: true });
  if (existsSync(REGISTRO)) {
    mkdirSync(BACKUPS, { recursive: true });
    const sello = new Date().toISOString().replace(/[:.]/g, '-');
    const destino = join(BACKUPS, `renacer-registro-codigos.${sello}.json`);
    copyFileSync(REGISTRO, destino);
    console.log(`   respaldo: ${destino}`);
  }
  writeFileSync(REGISTRO, JSON.stringify(registro, null, 2) + '\n', 'utf8');

  // Releer y verificar — no basta con que writeFileSync no haya tirado.
  const releido = JSON.parse(readFileSync(REGISTRO, 'utf8'));
  if (JSON.stringify(releido) !== JSON.stringify(registro)) {
    morir('lo releído del disco NO coincide con lo que se dijo haber escrito.');
  }
  console.log(`\n✅ Escrito y verificado por relectura: ${REGISTRO} (${releido.kits.length} kits)\n`);
}

function siguienteCodigo(registro) {
  if (registro.kits.length === 0) return CODIGO_INICIAL;
  const max = Math.max(...registro.kits.map((k) => k.codigo));
  const siguiente = max + 1;
  if (siguiente > CODIGO_TECHO) {
    morir(
      `secuencia agotada: el último código es ${max} y el techo ratificado es ${CODIGO_TECHO}.\n` +
        '   Ampliar el rango es una compuerta nueva (cambia lo impreso), no una decisión de este script.'
    );
  }
  return siguiente;
}

function arg(nombre) {
  const i = process.argv.indexOf(nombre);
  return i === -1 ? undefined : process.argv[i + 1];
}
const tiene = (nombre) => process.argv.includes(nombre);

// ─────────────────────────────────────────────────────────────────────────────

function mostrarKits() {
  console.log('\nCuadrícula ratificada — spec §11.1 (Kevin, 2026-08-25). Precios en COP.\n');
  console.log('  kit      unidades   manillas          dijes');
  console.log('  ' + '─'.repeat(48));
  for (const [kit, { manillas: u }] of Object.entries(KITS)) {
    console.log(
      `  ${kit.padEnd(8)} ${String(u).padStart(5)}   ${cop(u * PRECIO_UNITARIO.manillas).padStart(12)}   ${cop(u * PRECIO_UNITARIO.dijes).padStart(12)}`
    );
  }
  console.log(
    '\n  Esta tabla ES la tabla de servidor del §5.3: el endpoint de orden valida\n' +
      '  el kit contra ella y calcula el monto. Ningún monto ni cantidad viaja\n' +
      '  desde el cliente.\n'
  );
}

function listar(registro) {
  if (registro.kits.length === 0) {
    console.log('\nRegistro vacío. Ningún código emitido todavía.');
    console.log(`El primero será el ${CODIGO_INICIAL} (compuerta §3.4 · G-A.2).\n`);
    return;
  }
  console.log(`\n${registro.kits.length} kit(s) en el registro:\n`);
  console.log('  código  kit     producto   total  registradas  estado       fecha_pago   aportador');
  console.log('  ' + '─'.repeat(96));
  for (const k of registro.kits) {
    console.log(
      `  ${String(k.codigo).padEnd(7)} ${k.kit_tipo.padEnd(7)} ${k.producto.padEnd(10)} ` +
        `${String(k.manillas_total).padStart(5)}  ${String(k.manillas_registradas).padStart(11)}  ` +
        `${k.estado.padEnd(12)} ${(k.fecha_pago || '—').padEnd(12)} ${k.aportador}`
    );
  }
  const totU = registro.kits.reduce((s, k) => s + k.manillas_total, 0);
  const totR = registro.kits.reduce((s, k) => s + k.manillas_registradas, 0);
  console.log(`\n  Totales: ${totR} de ${totU} unidades registradas por beneficiarios.\n`);
}

function emitir(registro, apply) {
  const kit = arg('--kit');
  const producto = arg('--producto');
  const aportador = arg('--aportador');
  const saleId = arg('--sale-id');
  const fechaPago = arg('--fecha-pago');

  if (!KITS[kit]) morir(`--kit inválido: ${kit ?? '(falta)'}. Válidos: ${Object.keys(KITS).join(', ')}`);
  if (!PRODUCTOS.includes(producto)) morir(`--producto inválido: ${producto ?? '(falta)'}. Válidos: ${PRODUCTOS.join(', ')}`);
  if (!aportador) morir('falta --aportador "nombre <contacto>" — el código no significa nada sin su aportador.');
  if (!saleId) morir('falta --sale-id: el código se emite al CONFIRMAR EL PAGO (§7.3), y eso implica una venta en Convex.');
  if (!fechaPago || !/^\d{4}-\d{2}-\d{2}$/.test(fechaPago)) morir('falta --fecha-pago YYYY-MM-DD.');

  const dup = registro.kits.find((k) => k.saleId === saleId);
  if (dup) morir(`la venta ${saleId} ya emitió el código ${dup.codigo}. Un kit, un código — no se emite dos veces.`);

  const codigo = siguienteCodigo(registro);
  const total = KITS[kit].manillas;
  const precio = total * PRECIO_UNITARIO[producto];

  const fila = {
    codigo,
    kit_tipo: kit,
    producto,
    saleId,
    aportador,
    fecha_pago: fechaPago,
    manillas_total: total,
    manillas_registradas: 0,
    estado: 'emitido',
  };

  console.log('\nA emitir:\n');
  console.log(`  código              ${codigo}`);
  console.log(`  kit / producto      ${kit} · ${producto}`);
  console.log(`  unidades            ${total}  (derivadas de kit_tipo, no del input)`);
  console.log(`  precio ratificado   $${cop(precio)} COP  (§11.1)`);
  console.log(`  aportador           ${aportador}`);
  console.log(`  venta (Convex)      ${saleId}`);
  console.log(`  fecha de pago       ${fechaPago}`);
  console.log(`  estado              emitido`);
  console.log(`\n  URL impresa:        https://tierramadre.app/renacer/k/${codigo}`);
  console.log(`  Texto bajo el QR:   «Código ${codigo}»`);

  registro.kits.push(fila);
  guardar(registro, { apply });
}

function cambiarEstado(registro, apply) {
  const i = process.argv.indexOf('--estado');
  const codigo = Number(process.argv[i + 1]);
  const nuevo = process.argv[i + 2];
  const kit = registro.kits.find((k) => k.codigo === codigo);
  if (!kit) morir(`no existe el código ${codigo} en el registro.`);
  if (!ESTADOS.includes(nuevo)) morir(`estado inválido: ${nuevo}. Válidos: ${ESTADOS.join(', ')}`);
  console.log(`\n  ${codigo}: ${kit.estado} → ${nuevo}`);
  kit.estado = nuevo;
  guardar(registro, { apply });
}

function fijarRegistradas(registro, apply) {
  const i = process.argv.indexOf('--registradas');
  const codigo = Number(process.argv[i + 1]);
  const n = Number(process.argv[i + 2]);
  const kit = registro.kits.find((k) => k.codigo === codigo);
  if (!kit) morir(`no existe el código ${codigo} en el registro.`);
  if (!Number.isInteger(n) || n < 0) morir(`--registradas exige un entero ≥ 0, llegó: ${process.argv[i + 2]}`);
  if (n > kit.manillas_total) {
    morir(
      `${n} registradas supera las ${kit.manillas_total} del kit ${kit.kit_tipo}.\n` +
        '   Si de verdad hay más registros que unidades, el problema está en los registros\n' +
        '   (¿alguien adivinó el código?, §3.4 · G-A.2), no en este número.'
    );
  }
  console.log(`\n  ${codigo}: ${kit.manillas_registradas} → ${n} de ${kit.manillas_total} registradas`);
  kit.manillas_registradas = n;
  guardar(registro, { apply });
}

// ─────────────────────────────────────────────────────────────────────────────

const apply = tiene('--apply');
const registro = cargar();

if (tiene('--kits')) mostrarKits();
else if (tiene('--emitir')) emitir(registro, apply);
else if (tiene('--estado')) cambiarEstado(registro, apply);
else if (tiene('--registradas')) fijarRegistradas(registro, apply);
else if (tiene('--listar')) listar(registro);
else {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0] + '*/');
}
