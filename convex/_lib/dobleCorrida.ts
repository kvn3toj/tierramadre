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

export interface FilaV3Item {
  itemId: string;
  /** Ausente cuando la hoja no tiene precio fijado para el ítem. */
  precioFinalCOP?: number;
}

export interface PrecioV4Item {
  precioObjetivoUnidadCOP: number;
}

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
        motivo: 'sin precioFinalCOP en el SOT v3',
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
      });
      continue;
    }

    const diferenciaCOP = v4.precioObjetivoUnidadCOP - v3;
    salida.push({
      itemId: fila.itemId,
      precioV3COP: v3,
      precioV4COP: v4.precioObjetivoUnidadCOP,
      diferenciaCOP,
      diferenciaPct: diferenciaCOP / v3,
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
  };
}
