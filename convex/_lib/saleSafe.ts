/**
 * Las 14 columnas AQ→BE del SOT v3 son de FOTOSÍNTESIS, no de la ficha pública.
 *
 * Se sincronizan a `productInventory` desde 2026-07-30 para que el inventario y
 * la contabilidad las tengan en Convex. Eso NO las convierte en datos de
 * producto: son gramaje de taller, costos de lote, contabilidad de caja,
 * procedencia del dato y notas internas. La ficha de producto y el bot de
 * ventas no muestran nada de esto.
 *
 * El problema concreto que resuelve este módulo: `products:getByItem` devuelve
 * `{ ...row }` y `lotItems:search` devuelve los documentos enteros. Las dos
 * ensanchan solas con cada columna nueva del esquema — nadie decide que salgan,
 * salen porque el spread las arrastra. Sin este filtro, sincronizar habría
 * publicado las 14 en la ficha de producto y al anima-bot el mismo día.
 *
 * Seis son además material delicado, y por eso el filtro no es opcional ni
 * "cosmético":
 *
 *   AR costoLoteCOP        · COSTO
 *   AT precioObjetivoCOP   · COSTO
 *   AV cajaValorPagadoCOP  · PLATA
 *   AW cajaSaldoCOP        · PLATA
 *   AX cajaComprador       · NOMBRE DE UN COMPRADOR — dato personal de un tercero
 *   AY cajaEstadoContable  · PLATA
 *
 * Es una LISTA NEGRA a propósito, no una proyección por nombre. Una proyección
 * exigiría enumerar cada campo que lee cada consumidor de esas dos queries, y
 * olvidarse de uno rompe la UI en silencio. La lista negra garantiza lo único
 * que hay que garantizar —que estas 14 no viajen— sin cambiarle la forma a nada
 * más.
 *
 * SI FOTOSÍNTESIS LAS NECESITA EN LA APP: no las saques de acá. Hacé una query
 * aparte, explícita, que las proyecte a propósito y que sólo consuman las
 * pantallas de `/admin/Fotosintesis`. Que estén en la tabla está bien; que
 * salgan por la query que alimenta la ficha de producto, no.
 *
 * OJO — deuda preexistente que esto NO arregla: `costoBaseCOP` y
 * `precioPotencialCOP` ya salían por estas mismas queries antes de este cambio.
 * Sacarlos ahora podría romper pantallas de admin que sí los muestran, así que
 * se deja como estaba y se reporta. Este módulo sólo se compromete a no
 * EMPEORAR la frontera con las columnas nuevas.
 */

/**
 * Columnas hoja-primero que nunca deben viajar en la respuesta de una query de
 * producto. El orden espeja AQ→BE (sin AS, que es un hueco posicional y no se
 * sincroniza).
 */
export const FOTOSINTESIS_ONLY_FIELDS = [
  'pesoGr', // AQ
  'costoLoteCOP', // AR · COSTO
  'precioObjetivoCOP', // AT · COSTO
  'cajaPrecioVentaCOP', // AU
  'cajaValorPagadoCOP', // AV · PLATA
  'cajaSaldoCOP', // AW · PLATA
  'cajaComprador', // AX · DATO PERSONAL
  'cajaEstadoContable', // AY · PLATA
  'subLote', // AZ
  'productoUrl', // BA
  'carpetaFotosUrl', // BB
  'animaNotas', // BC
  'fuentes', // BD
  'notasConflictos', // BE
] as const;

type FotosintesisOnly = (typeof FOTOSINTESIS_ONLY_FIELDS)[number];

/**
 * Devuelve el documento sin las columnas de Fotosíntesis.
 *
 * El tipo de retorno las excluye, así que si alguien intenta leer
 * `row.cajaComprador` río abajo, falla en compilación y no en producción.
 */
export function omitFotosintesisOnly<T extends Record<string, unknown>>(
  row: T,
): Omit<T, FotosintesisOnly> {
  const out = { ...row };
  for (const k of FOTOSINTESIS_ONLY_FIELDS) delete out[k];
  return out as Omit<T, FotosintesisOnly>;
}

/**
 * Lo mismo, un modelo después: los campos que agregó el SOT v4 a `lots` y a
 * `lotItems`.
 *
 * El mecanismo del defecto es idéntico y por eso vale repetir el remedio.
 * `lots.list`, `lots.get`, `lots.getByLoteId` y `lotItems.listByLote` son
 * queries PÚBLICAS que devuelven el documento entero. Eso era casi inofensivo
 * cuando un lote guardaba una fecha, un costo total y un estado. Con v4 esas
 * mismas filas cargan el costo de compra, el desglose de costos variables, el
 * abono y el **saldo con el proveedor** — cuánto le debe la empresa a un tercero
 * identificable. Nadie decidió publicarlo: el documento ensanchó y el `return`
 * siguió igual. Es el mismo camino por el que las 14 columnas AQ→BE estuvieron
 * saliendo por la ficha de producto.
 *
 * Tres clases de dato, un solo criterio —lo que no le corresponde a quien
 * consulta un lote sin ser de costos—:
 *
 *   · COSTO      costoCompraCOP · costosVariables · joya{costoPorGramoCOP,
 *                presupuestoJoyaCOP} · costoUnitarioRealCOP
 *   · DEUDA      abonoCOP · saldoCOP  (plata que se le debe a un proveedor)
 *   · COMERCIAL  rangoVentaEsperadoCOP  (lo que se espera sacar por la pieza)
 *   · IDENTIDAD  clasificadaPor · publicacionParcial.por  (quién hizo qué)
 *
 * Las superficies v4 no pierden nada: leen por `casillas.*` y `lotsV4.*`, que
 * son actions gateadas por rol (`ROLES_COSTOS` en `_lib/authz.ts`).
 *
 * **`origenModelo` NO está en la lista, a propósito.** `CapturaLotePage`
 * pregunta `origenModelo === 'v4'` para negarse a abrir un lote v4 con el
 * formulario legacy. Filtrarlo apagaría ese guard en silencio —peor que el dato
 * que se quería esconder—, y además no esconde nada: es un marcador, no un
 * número. Mismo criterio para `costoTotalCOP` y `costoBaseCOP`, que ya salían
 * antes de v4: este módulo se compromete a no EMPEORAR la frontera, no a
 * arreglar la deuda que encontró.
 */
export const CAMPOS_INTERNOS_V4 = [
  // lots
  'costoCompraCOP',
  'costosVariables',
  'abonoCOP',
  'saldoCOP',
  'joya',
  'publicacionParcial',
  // lotItems
  'costoUnitarioRealCOP',
  'rangoVentaEsperadoCOP',
  'clasificadaPor',
] as const;

type InternoV4 = (typeof CAMPOS_INTERNOS_V4)[number];

/**
 * Devuelve el documento sin los campos internos de v4.
 *
 * Como su gemela, el tipo de retorno los excluye: leer `lote.saldoCOP` río abajo
 * falla en compilación y no en producción.
 */
export function omitInternosV4<T extends Record<string, unknown>>(
  row: T,
): Omit<T, InternoV4> {
  const out = { ...row };
  for (const k of CAMPOS_INTERNOS_V4) delete out[k];
  return out as Omit<T, InternoV4>;
}
