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
import { normalizarFechaRecepcion } from './fechaSheet';

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

/**
 * Una cifra de la hoja, que llega como texto de display.
 *
 * Sheets devuelve «1,234,567» o «$ 931.931» según el formato de la celda, y
 * `Number()` sobre eso da `NaN`. Un `NaN` en `costoTotalCOP` no revienta: se
 * propaga silencioso hasta el motor y sale como un precio inexistente.
 *
 * Cae a 0 —nunca a `NaN`— porque el 0 SÍ tiene lector: `planificarMigracion`
 * trata el costo 0 como «no se cargó» y lo manda al reporte de excepciones.
 *
 * (`convex/lots.ts:1074` tiene un gemelo inline dentro de
 * `_relinkRowIndexFromSheet`. No se unificó acá para no tocar un camino del riel
 * viejo que ya corrió contra datos reales; si alguno cambia, cambian los dos.)
 */
export function numeroDeHoja(valor: unknown): number {
  const n = Number(String(valor ?? '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Una fila cruda de la hoja: `{ cabecera -> texto }`, como la sirve la API. */
export type FilaCruda = Record<string, unknown>;

const texto = (v: unknown): string => String(v ?? '').trim();

/**
 * Revienta cuando el mapeo se cayó ENTERO: filas leídas, ninguna usable.
 *
 * El defecto que lo motiva, encontrado corriendo el ensayo: la pestaña
 * Inventario trae el id de la pieza en la columna `item`, no `itemId`. Leyendo
 * la clave equivocada, las 513 filas se caían al filtro y el plan reportaba
 * «0 casillas a crear» — un cero con forma de hecho. Una hoja de verdad vacía es
 * otra cosa y no revienta: ahí no hay nada que mapear mal.
 */
function exigeMapeoUtil(
  leidas: number,
  mapeadas: number,
  clave: string,
  ejemplo: FilaCruda | undefined,
): void {
  if (leidas === 0 || mapeadas > 0) return;
  throw new Error(
    `Se leyeron ${leidas} fila(s) y ninguna trae "${clave}": el mapeo está ` +
      `roto, no la hoja vacía. Columnas de la primera fila: ` +
      `${Object.keys(ejemplo ?? {}).join(', ')}`,
  );
}

/**
 * La pestaña Lotes, mapeada.
 *
 * `loteId` es la columna A y la clave natural — la misma que valida el guard de
 * escritura del riel viejo.
 */
export function mapearLotesHoja(filas: readonly FilaCruda[]): LoteHoja[] {
  const out = filas
    .filter((f) => texto(f.loteId))
    .map((f) => ({
      loteId: texto(f.loteId),
      estado: texto(f.estado),
      providerNombre: texto(f.providerNombre),
      // Trunca el sufijo de hora que sirve Sheets sobre una celda datetime
      // (`_lib/fechaSheet.ts`) — sin esto, `configVigenteEn` revienta y el
      // lote nunca cotiza (decisión de Kevin, 2026-08-02).
      fechaRecepcion: normalizarFechaRecepcion(texto(f.fechaRecepcion)),
      costoTotalCOP: numeroDeHoja(f.costoTotalCOP),
      unidadesDeclaradas: numeroDeHoja(f.unidadesDeclaradas),
      formaPago: texto(f.formaPago),
      sede: texto(f.sede) || undefined,
      renombreLote: texto(f.renombreLote) || undefined,
    }));
  exigeMapeoUtil(filas.length, out.length, 'loteId', filas[0]);
  return out;
}

/**
 * La pestaña Inventario, mapeada.
 *
 * **El id de la pieza vive en la columna `item`, no `itemId`.** Es la
 * `KEY_COLUMN.inventory` de `fotoSync`, y la única fuente de verdad sobre ese
 * nombre: `FOTO_INVENTARIO_COLUMNS` la declara `item` y el schema la guarda como
 * `productInventory.itemId`.
 */
export function mapearFilasInventario(filas: readonly FilaCruda[]): FilaHoja[] {
  const out = filas
    .filter((f) => texto(f.item))
    .map((f) => ({
      itemId: texto(f.item),
      loteId: texto(f.loteId),
      estado: texto(f.estado),
      costoBaseCOP: numeroDeHoja(f.costoBaseCOP),
      nombre: texto(f.nombre) || undefined,
    }));
  exigeMapeoUtil(filas.length, out.length, 'item', filas[0]);
  return out;
}

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
  | 'LOTE_SIN_PIEZAS'
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
    const declarado = lote.costoTotalCOP;

    // Sin piezas no hay con qué comparar, así que la comparación se salta. Pero
    // saltarla en silencio dejaba escapar exactamente el caso que hay que
    // auditar: un lote que declara $1.233M y no tiene NI UNA pieza enlazada —
    // la forma de LC-03. La primera corrida del ensayo lo confirmó: LC-03 no
    // aparecía en `COSTO_INCONSISTENTE` porque no llegaba a evaluarse.
    //
    // Solo se reporta cuando además DECLARA un costo: un lote recién abierto,
    // todavía sin inventario cargado, no es una anomalía, y llenar el reporte
    // de esos es cómo se consigue que nadie lo lea.
    if (!suma) {
      if (declarado > 0) {
        excepciones.push({
          codigo: 'LOTE_SIN_PIEZAS',
          referencia: lote.loteId,
          detalle:
            `Declara ${declarado} y no tiene NI UNA pieza enlazada en la hoja, ` +
            `así que la coherencia de costo no se puede evaluar. Puede ser un ` +
            `lote de colección real o el total del lote metido en la fila de un ` +
            `ítem. Se migra TAL CUAL: lo mira un humano antes de que la Fase 2 ` +
            `lo tome por verdad.`,
          requiereAuditoria: true,
        });
      }
      continue;
    }

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

/**
 * El reporte que un humano lee antes de aplicar el plan.
 *
 * Lo que requiere AUDITORÍA va primero, porque es lo único que puede cambiar la
 * decisión de correr o no: LC-03 declarando $1.233M contra $1M en piezas, las
 * casillas que apuntan a un lote fantasma, las que se migran sin costo. Lo
 * informativo —los lotes que van al proveedor centinela— va después: se sabe qué
 * pasó y no bloquea nada.
 *
 * Un plan limpio lo DICE. Un reporte en blanco se lee como «no corrió», y esa
 * ambigüedad es la que hace que alguien aplique una migración creyendo que la
 * revisó.
 */
export function formatearReporteExcepciones(plan: PlanMigracion): string {
  const { excepciones, resumen } = plan;

  // `dryRun` existe para que un humano mire el plan antes de que toque la base,
  // y un plan que solo dice «28 lotes» no se puede mirar. De mayor a menor costo
  // declarado: lo primero que hay que revisar es lo más caro, porque un lote que
  // declara $378M mueve el inventario entero si el número está mal.
  const lotes = [...plan.lotesACrear]
    .sort((a, b) => b.costoTotalCOP - a.costoTotalCOP)
    .map(
      (l) =>
        `  · ${l.loteId} · ${l.estado} · declara ${l.costoTotalCOP} en ` +
        `${l.unidadesDeclaradas} unidad(es) · ` +
        `${l.sinProveedor ? 'proveedor: centinela' : `proveedor: ${l.providerNombre}`}`,
    );

  const cabecera = [
    `PLAN: ${resumen.lotesACrear} lote(s) y ${resumen.casillasACrear} casilla(s) a crear.`,
    ...(lotes.length
      ? ['', `── LOTES A CREAR (${lotes.length}) ──`, ...lotes, '']
      : []),
  ];

  if (!excepciones.length) {
    return [
      ...cabecera,
      '',
      'El plan corrió sin excepciones: ninguna fila necesita que la mire un humano.',
    ].join('\n');
  }

  const bloque = (titulo: string, filas: Excepcion[]): string[] => {
    if (!filas.length) return [];
    const porCodigo = new Map<CodigoExcepcion, Excepcion[]>();
    for (const e of filas) {
      porCodigo.set(e.codigo, [...(porCodigo.get(e.codigo) ?? []), e]);
    }
    const lineas = [`── ${titulo} (${filas.length}) ──`];
    for (const [codigo, grupo] of porCodigo) {
      lineas.push('', `${codigo} × ${grupo.length}`);
      for (const e of grupo) lineas.push(`  · ${e.referencia}: ${e.detalle}`);
    }
    return [...lineas, ''];
  };

  return [
    ...cabecera,
    `EXCEPCIONES: ${resumen.excepciones}, de las cuales ${resumen.requierenAuditoria} requieren auditoría.`,
    '',
    ...bloque(
      'REQUIEREN AUDITORÍA — no se toman por verdad hasta que las mire Kevin',
      excepciones.filter((e) => e.requiereAuditoria),
    ),
    ...bloque(
      'INFORMATIVAS — se aplican, y queda dicho qué se hizo',
      excepciones.filter((e) => !e.requiereAuditoria),
    ),
  ]
    .join('\n')
    .trimEnd();
}
