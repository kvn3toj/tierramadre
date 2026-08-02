/**
 * La doble corrida ítem por ítem (SOT-V4-FASE1, punto 8).
 *
 * Compara lo que la OPERACIÓN cobra hoy (`precioFinalCOP` del SOT v3 vivo,
 * columna M, SHEET-OWNED desde 2026-07-23 — ver `_lib/sheetPullMaps.ts`) contra
 * lo que el motor v4 recomendaría cobrar (`precioObjetivoUnidadCOP`: piso +30%
 * de margen neto, el equivalente de un precio de catálogo — no
 * `equilibrioRealUnidadCOP`, que es el piso de no perder plata, ni `KUnidadCOP`,
 * que ni siquiera viaja al espejo).
 *
 * **Es reporte, no corrección** (dictamen de Kevin para el punto 8): esta
 * función mide, no decide cuál precio es el correcto en cada ítem.
 *
 * Puro: sin IO. La lectura de la hoja y de Convex vive en `convex/dobleCorrida.ts`.
 */
import { numeroDeHoja } from './migracionV4';

export interface FilaV3Item {
  itemId: string;
  /** Ausente cuando la hoja no tiene precio fijado para el ítem. */
  precioFinalCOP?: number;
}

export interface PrecioV4Item {
  precioObjetivoUnidadCOP: number;
  /**
   * De dónde salió la `categoriaFiscal` del lote de este ítem (decisión de
   * Kevin, 2026-08-02). Habilita el bonus de detección §2d: una inferencia
   * mal hecha diverge fuerte contra el precio real, y esa divergencia es la
   * señal — no hace falta un matching de palabras clave más fino.
   */
  categoriaFiscalOrigen?: 'capturada' | 'inferida' | 'revisada';
}

/** |diferenciaPct| por encima de esto, en un ítem `inferida`, pide revisión. */
const UMBRAL_REVISION_INFERENCIA = 0.3;

export interface ComparacionItem {
  itemId: string;
  precioV3COP?: number;
  precioV4COP?: number;
  /** v4 − v3. Positiva: el motor pide MÁS de lo que se cobra hoy. */
  diferenciaCOP?: number;
  /** Sobre el precio v3 — la vara vigente, no la nueva. */
  diferenciaPct?: number;
  /** Por qué no se pudo comparar. Ausente cuando sí hay diferencia. */
  motivo?: string;
  categoriaFiscalOrigen?: 'capturada' | 'inferida' | 'revisada';
  /**
   * `true` solo cuando `categoriaFiscalOrigen === 'inferida'` Y
   * `|diferenciaPct| > 30%`. La propia doble corrida es el detector de
   * inferencias equivocadas (decisión de Kevin, §2d) — no hace falta que
   * alguien lea las 513 filas para encontrarlas.
   */
  revisarInferencia: boolean;
}

/** Una fila cruda de `/api/get-inventory-rows`: `{ cabecera -> texto }`. */
export type FilaCruda = Record<string, unknown>;

/**
 * La pestaña Inventario, mapeada para la comparación.
 *
 * **El id de la pieza vive en la columna `item`, no `itemId`** — el mismo
 * defecto que `_lib/migracionV4.ts` encontró corriendo el ensayo: leer la
 * clave equivocada tira las 513 filas al filtro y el resultado se ve como una
 * hoja vacía, no como un mapeo roto. Revienta si se leyeron filas y ninguna
 * quedó usable; una hoja de verdad vacía no revienta.
 */
export function mapearInventarioParaComparar(
  filas: readonly FilaCruda[],
): FilaV3Item[] {
  const texto = (v: unknown): string => String(v ?? '').trim();
  const out = filas
    .filter((f) => texto(f.item))
    .map((f) => ({
      itemId: texto(f.item),
      precioFinalCOP: numeroDeHoja(f.precioFinalCOP) || undefined,
    }));

  if (filas.length > 0 && out.length === 0) {
    throw new Error(
      `Se leyeron ${filas.length} fila(s) y ninguna trae "item": el mapeo ` +
        `está roto, no la hoja vacía. Columnas de la primera fila: ` +
        `${Object.keys(filas[0] ?? {}).join(', ')}`,
    );
  }
  return out;
}

/**
 * Compara, ítem por ítem, la unión de lo que trae la hoja y lo que el motor
 * v4 sabe cotizar. Nunca descarta un ítem en silencio: el que no se puede
 * comparar sale igual, con su motivo.
 */
export function compararPreciosItemV3vsV4(
  filasV3: readonly FilaV3Item[],
  preciosV4: ReadonlyMap<string, PrecioV4Item>,
): ComparacionItem[] {
  const salida: ComparacionItem[] = [];
  const vistos = new Set<string>();

  for (const fila of filasV3) {
    if (vistos.has(fila.itemId)) continue;
    vistos.add(fila.itemId);

    const v4 = preciosV4.get(fila.itemId);
    const v3 = fila.precioFinalCOP;

    if (!v3 || v3 <= 0) {
      salida.push({
        itemId: fila.itemId,
        precioV4COP: v4?.precioObjetivoUnidadCOP,
        categoriaFiscalOrigen: v4?.categoriaFiscalOrigen,
        motivo: 'sin precioFinalCOP en el SOT v3',
        revisarInferencia: false,
      });
      continue;
    }

    if (!v4) {
      salida.push({
        itemId: fila.itemId,
        precioV3COP: v3,
        motivo:
          'v4 no cotiza el ítem (sin casilla, sin costo capturado, o lote ' +
          'sin categoría fiscal)',
        revisarInferencia: false,
      });
      continue;
    }

    const diferenciaCOP = v4.precioObjetivoUnidadCOP - v3;
    const diferenciaPct = diferenciaCOP / v3;
    salida.push({
      itemId: fila.itemId,
      precioV3COP: v3,
      precioV4COP: v4.precioObjetivoUnidadCOP,
      diferenciaCOP,
      diferenciaPct,
      categoriaFiscalOrigen: v4.categoriaFiscalOrigen,
      revisarInferencia:
        v4.categoriaFiscalOrigen === 'inferida' &&
        Math.abs(diferenciaPct) > UMBRAL_REVISION_INFERENCIA,
    });
  }

  // Lo que v4 sabe cotizar y la hoja no trae: desincronía a reportar, no a
  // callar. No debería pasar con la hoja al día, pero si pasa el reporte lo
  // muestra en vez de perderlo silenciosamente en el filtro de `filasV3`.
  for (const [itemId, v4] of preciosV4) {
    if (vistos.has(itemId)) continue;
    salida.push({
      itemId,
      precioV4COP: v4.precioObjetivoUnidadCOP,
      categoriaFiscalOrigen: v4.categoriaFiscalOrigen,
      revisarInferencia: false,
      motivo: 'ítem en v4 sin fila correspondiente en la hoja v3',
    });
  }

  return salida;
}

export interface ResumenComparacion {
  /** Ítems con precio en ambos lados — sobre los que se calculó diferencia. */
  comparables: number;
  /**
   * Mediana, no promedio ni suma: la lección del divisor (`2026-08-01-tabla-
   * comparativa-divisor.md`) es que unos pocos lotes de nueve cifras ahogan
   * cualquier agregado lineal.
   */
  medianaDiferenciaPct: number;
  /** |diferenciaPct| > 5%. */
  sobre5Pct: number;
  /** |diferenciaPct| > 10%. */
  sobre10Pct: number;
  /** Por qué un ítem no entró a la mediana, agrupado y contado. */
  sinComparar: { motivo: string; cantidad: number }[];
  /**
   * `itemId`s con `revisarInferencia: true` — el bonus de detección de la
   * decisión de Kevin, §2d. Van directo a la lista de revisión, no perdidos
   * dentro de la mediana.
   */
  paraRevisarInferencia: string[];
}

function mediana(valores: readonly number[]): number {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const mitad = Math.floor(ordenados.length / 2);
  return ordenados.length % 2 === 1
    ? ordenados[mitad]
    : (ordenados[mitad - 1] + ordenados[mitad]) / 2;
}

/** Agrega la salida de `compararPreciosItemV3vsV4` en un resumen reportable. */
export function resumirComparacion(
  comparaciones: readonly ComparacionItem[],
): ResumenComparacion {
  const comparables = comparaciones.filter(
    (c): c is ComparacionItem & { diferenciaPct: number } =>
      c.diferenciaPct !== undefined,
  );
  const pcts = comparables.map((c) => c.diferenciaPct);

  const motivos = new Map<string, number>();
  for (const c of comparaciones) {
    if (!c.motivo) continue;
    motivos.set(c.motivo, (motivos.get(c.motivo) ?? 0) + 1);
  }

  return {
    comparables: comparables.length,
    medianaDiferenciaPct: mediana(pcts),
    sobre5Pct: pcts.filter((p) => Math.abs(p) > 0.05).length,
    sobre10Pct: pcts.filter((p) => Math.abs(p) > 0.1).length,
    sinComparar: [...motivos.entries()].map(([motivo, cantidad]) => ({
      motivo,
      cantidad,
    })),
    paraRevisarInferencia: comparaciones
      .filter((c) => c.revisarInferencia)
      .map((c) => c.itemId),
  };
}
