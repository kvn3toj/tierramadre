/**
 * El planificador de la migración de ensayo v3 → v4.
 *
 * Corre primero en dev, y de ahí sale el inventario con el que la doble corrida
 * puede comparar precios. Hasta que corra, dev reparte el gasto fijo entre menos
 * lotes de los que existen —66 contra los 88 del SOT— y ningún número suyo es
 * comparable con la operación (ver `REFERENCIA_SOT` en `previewLote.ts`).
 *
 * **Puro a propósito: devuelve un PLAN, no escribe.** El ensayo se puede repetir
 * y revisar a ojo cuantas veces haga falta antes de que algo toque la base. La
 * mutación que lo aplica es un shim delgado sobre `ctx.db`.
 *
 * Tres reglas, en orden de daño si se rompen:
 *
 *  1. **No se inventa un costo.** D6: el costo unitario se CAPTURA. Una fila sin
 *     costo va al reporte de excepciones, nunca a un prorrateo — el defecto que
 *     produjo el «Choker + Piedra» de $52.500.
 *  2. **No se corrige nada por cuenta propia.** Lo anómalo se REPORTA para que lo
 *     mire un humano. Dictamen de Kevin sobre LC-03 ($1.233M): «va al reporte de
 *     excepciones como fila a auditar ANTES de que la Fase 2 la tome como
 *     verdad. No la corrijas por tu cuenta.»
 *  3. **Idempotente.** Correr el ensayo dos veces no duplica nada, porque lo que
 *     ya existe en Convex no se planifica.
 */

/** El estado de una pieza que existe y todavía no se clasificó. */
export const ESTADO_PENDIENTE_CLASIFICAR = 'PENDIENTE_CLASIFICAR';

/**
 * Cuánto puede separarse el costo declarado de un lote de la suma de sus piezas
 * antes de que valga la pena que lo mire alguien.
 *
 * 20% es ancho a propósito: la hoja tiene redondeos, piezas cargadas después del
 * lote y costos variables que nunca bajaron a las filas. Lo que se busca no es
 * el descuadre normal sino el absurdo — LC-03 declara $1.233M contra $1M en
 * piezas, tres órdenes de magnitud.
 */
export const TOLERANCIA_COHERENCIA = 0.2;

export interface LoteHoja {
  loteId: string;
  estado: string;
  providerNombre?: string;
  fechaRecepcion?: string;
  costoTotalCOP: number;
  unidadesDeclaradas: number;
  formaPago?: string;
  sede?: string;
  renombreLote?: string;
}

export interface FilaHoja {
  itemId: string;
  loteId: string;
  /** Vacío en las 25 filas dictaminadas como inventario vivo. */
  estado: string;
  costoBaseCOP: number;
  nombre?: string;
}

export interface LoteACrear extends LoteHoja {
  /**
   * El lote no trae proveedor y NO se le pone uno por defecto: atribuirle
   * piedras ajenas a un proveedor real es un error invisible una vez guardado.
   * Quien aplique el plan decide qué hace con estos —hoy, el proveedor centinela
   * de agrupaciones reconstruidas— y queda registrado en las excepciones.
   */
  sinProveedor: boolean;
}

export interface CasillaACrear {
  itemId: string;
  loteId: string;
  estadoCasilla: string;
  ordenEnLote: number;
  /** Ausente si la hoja no lo trae. Nunca derivado. */
  costoUnitarioRealCOP?: number;
  nombre?: string;
}

export type CodigoExcepcion =
  | 'LOTE_SIN_PROVEEDOR'
  | 'CASILLA_SIN_COSTO'
  | 'CASILLA_SIN_LOTE'
  | 'COSTO_INCONSISTENTE';

export interface Excepcion {
  codigo: CodigoExcepcion;
  /** El loteId o el itemId al que se refiere. */
  referencia: string;
  detalle: string;
  /** `true` = no se aplica hasta que un humano lo mire. */
  requiereAuditoria: boolean;
}

export interface PlanMigracion {
  lotesACrear: LoteACrear[];
  casillasACrear: CasillaACrear[];
  excepciones: Excepcion[];
  resumen: {
    lotesACrear: number;
    casillasACrear: number;
    excepciones: number;
    requierenAuditoria: number;
  };
}

export interface EntradaMigracion {
  lotesHoja: LoteHoja[];
  lotesConvex: { loteId: string }[];
  filasHoja: FilaHoja[];
  casillasConvex: { itemId: string }[];
}

export function planificarMigracion(entrada: EntradaMigracion): PlanMigracion {
  const { lotesHoja, lotesConvex, filasHoja, casillasConvex } = entrada;

  const lotesExistentes = new Set(lotesConvex.map((l) => l.loteId));
  const casillasExistentes = new Set(casillasConvex.map((c) => c.itemId));
  const excepciones: Excepcion[] = [];

  // ── Lotes ──────────────────────────────────────────────────────────────
  const lotesACrear: LoteACrear[] = [];
  for (const lote of lotesHoja) {
    if (lotesExistentes.has(lote.loteId)) continue;

    const sinProveedor = !lote.providerNombre?.trim();
    if (sinProveedor) {
      excepciones.push({
        codigo: 'LOTE_SIN_PROVEEDOR',
        referencia: lote.loteId,
        detalle:
          `La hoja no le declara proveedor. Se crea con el centinela de ` +
          `agrupaciones reconstruidas: ponerle uno real le atribuiría piedras ` +
          `ajenas, y ese error es invisible una vez guardado.`,
        requiereAuditoria: false,
      });
    }

    // El estado viaja como viene. `reconstruido` describe una agrupación
    // retroactiva armada desde colecciones legadas, no una compra; mapearlo a
    // «abierto» la volvería indistinguible de una compra real.
    lotesACrear.push({ ...lote, sinProveedor });
  }

  // Un lote que se va a crear también cuenta como destino válido para una
  // casilla: si no, la primera corrida reportaría huérfanas todas sus piezas.
  const lotesDestino = new Set([
    ...lotesExistentes,
    ...lotesACrear.map((l) => l.loteId),
  ]);

  // ── Casillas ───────────────────────────────────────────────────────────
  const casillasACrear: CasillaACrear[] = [];
  const ordenPorLote = new Map<string, number>();

  for (const fila of filasHoja) {
    if (casillasExistentes.has(fila.itemId)) continue;

    if (!lotesDestino.has(fila.loteId)) {
      excepciones.push({
        codigo: 'CASILLA_SIN_LOTE',
        referencia: fila.itemId,
        detalle:
          `Apunta al lote ${fila.loteId}, que ni existe en Convex ni está en ` +
          `la hoja. La casilla quedaría colgando de un id fantasma.`,
        requiereAuditoria: true,
      });
      continue;
    }

    // Las 25 filas con ESTADO en blanco son inventario vivo con la carga a
    // medias (dictamen de Kevin, 2026-08-01). `PENDIENTE_CLASIFICAR` es
    // exactamente el estado que v4 tiene para eso.
    const estadoCasilla = fila.estado.trim() || ESTADO_PENDIENTE_CLASIFICAR;

    // El costo se CAPTURA. Un 0 en la hoja significa «no se cargó», no «gratis»:
    // dejarlo pasar como cero haría cotizar la pieza sobre puro gasto fijo, que
    // es el caso C-085 que el preview ya se niega a cotizar.
    const tieneCosto =
      Number.isFinite(fila.costoBaseCOP) && fila.costoBaseCOP > 0;
    if (!tieneCosto) {
      excepciones.push({
        codigo: 'CASILLA_SIN_COSTO',
        referencia: fila.itemId,
        detalle:
          `Sin costo en la hoja. Se migra sin costo: repartir el del lote ` +
          `entre sus piezas es el prorrateo que D6 prohíbe. Hay que capturarlo.`,
        requiereAuditoria: true,
      });
    }

    const orden = (ordenPorLote.get(fila.loteId) ?? 0) + 1;
    ordenPorLote.set(fila.loteId, orden);

    casillasACrear.push({
      itemId: fila.itemId,
      loteId: fila.loteId,
      estadoCasilla,
      ordenEnLote: orden,
      costoUnitarioRealCOP: tieneCosto ? fila.costoBaseCOP : undefined,
      nombre: fila.nombre,
    });
  }

  // ── Coherencia de costo, solo para REPORTAR ────────────────────────────
  const sumaPorLote = new Map<string, number>();
  for (const fila of filasHoja) {
    sumaPorLote.set(
      fila.loteId,
      (sumaPorLote.get(fila.loteId) ?? 0) + (fila.costoBaseCOP || 0),
    );
  }

  for (const lote of lotesHoja) {
    const suma = sumaPorLote.get(lote.loteId);
    // Sin piezas no hay con qué comparar. Compararlo contra cero marcaría como
    // anómalo a todo lote que todavía no tiene inventario cargado.
    if (!suma) continue;

    const declarado = lote.costoTotalCOP;
    if (!declarado) continue;

    const desvio = Math.abs(declarado - suma) / declarado;
    if (desvio <= TOLERANCIA_COHERENCIA) continue;

    excepciones.push({
      codigo: 'COSTO_INCONSISTENTE',
      referencia: lote.loteId,
      detalle:
        `Declara ${declarado} y sus piezas suman ${suma} (${Math.round(desvio * 100)}% ` +
        `de desvío). Se migra TAL CUAL: corregirlo acá sería decidir cuál de los ` +
        `dos números es el bueno, y eso lo mira un humano antes de que la Fase 2 ` +
        `lo tome por verdad.`,
      requiereAuditoria: true,
    });
  }

  return {
    lotesACrear,
    casillasACrear,
    excepciones,
    resumen: {
      lotesACrear: lotesACrear.length,
      casillasACrear: casillasACrear.length,
      excepciones: excepciones.length,
      requierenAuditoria: excepciones.filter((e) => e.requiereAuditoria).length,
    },
  };
}
