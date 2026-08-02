/**
 * El motor por unidad — el precio de CADA casilla.
 *
 * El nudo: D2 define el gasto fijo **por lote**, y para precificar una pieza hay
 * que decidir cuánto de ese fijo absorbe. Las tres salidas obvias son las tres
 * malas: cobrar el fijo entero N veces infla el precio con las unidades; repartir
 * el PRECIO del lote hace que el valor de una pieza dependa de cuántas hermanas
 * tenga; cambiar el divisor a unidades activas es otro D2, o sea otro modelo.
 *
 * La salida buena (Kevin, 2026-08-01), validada en campo por la auditoría del
 * 2026-07-25 sobre el lote 10:
 *
 *   **el lote absorbe UN SOLO fijo (D2 intacto), y ese fijo se reparte entre las
 *   casillas POR PESO DEL COSTO CAPTURADO** — no en partes iguales.
 *
 * **No viola D6.** D6 prohíbe DERIVAR el costo capturado prorrateando el lote.
 * Acá el costo capturado es el INSUMO y solo el OVERHEAD se asigna por peso: es
 * asignación de absorción de libro, el método con el que la auditoría verificó
 * que los ítems 372–375 tenían 32,9% de margen real cada uno.
 *
 * **Bonus estructural:** vender el lote completo o por partes suma EXACTAMENTE un
 * fijo. El +18% accidental de las modalidades de venta muere por diseño, no por
 * parche.
 *
 * ## La escalera de divisores es una sola lógica
 *
 * Todo —comisión, IVA y el margen deseado— se paga SOBRE EL PRECIO DE VENTA, no
 * sobre el costo. Lo que se quiere conservar va restando dentro del paréntesis:
 *
 * | Escalón         | Gema   | Joya   | Qué significa                       |
 * | --------------- | ------ | ------ | ----------------------------------- |
 * | K               | K      | K      | Costos. **Vender acá es perder.**   |
 * | Equilibrio real | K/0,90 | K/0,71 | Supervivencia exacta, utilidad cero |
 * | Precio objetivo | K/0,60 | K/0,41 | Supervivencia + 30% de margen neto  |
 *
 * (0,90 − 0,30 = 0,60 · 0,71 − 0,30 = 0,41 — por eso el margen del modelo es
 * «sobre precio» y no «sobre costo».)
 *
 * La hoja **nunca calculó el escalón del medio**: saltaba de K al objetivo, y por
 * eso nadie veía el piso real. El lote 14 se ofrecía a $1.922.677 con su
 * equilibrio real en $1.895.597 — a $27.080 de perder plata.
 *
 * ## Nomenclatura, fijada por Kevin
 *
 * `equilibrioReal*` = piso real, SIEMPRE. `precioEquilibrio*` = K, y solo existe
 * a nivel lote. **K_unidad no tiene columna propia en Casillas**: K disfrazado de
 * «equilibrio» fue el habilitador del defecto ③ de la hoja, y no vuelve. Acá
 * `KUnidadCOP` se devuelve porque el reparto lo necesita y el Léeme lo explica,
 * pero no viaja al espejo.
 *
 * Puro: sin IO y sin reloj.
 */
import {
  divisorObjetivo,
  exigeCategoriaFiscal,
  type CategoriaFiscal,
  type ConfigPrecios,
} from './motorPrecios';
import { conciliarCostos } from './casillaW2';
import type { CategoriaFiscalLote } from './loteV4';

export interface CasillaParaMotor {
  itemId: string;
  /** CAPTURADO en la casilla. Jamás derivado del lote (D6). */
  costoUnitarioRealCOP: number;
  /** La de la casilla, o la heredada del lote. Sin default: ausente ⇒ throw. */
  categoriaFiscal: CategoriaFiscal;
}

export interface RepartirPorPesoInput {
  casillas: readonly CasillaParaMotor[];
  /** Del LOTE. Se reparte por peso, igual que el fijo. */
  costosVariablesLoteCOP: number;
  /** UN solo fijo por lote (D2). No se multiplica por las unidades. */
  costoFijoUnitarioLoteCOP: number;
  config: ConfigPrecios;
}

export interface PrecioUnidad {
  itemId: string;
  categoriaFiscal: CategoriaFiscal;
  /** `costo / Σ costos`. Suma 1 sobre el lote. */
  peso: number;
  /**
   * Costo capturado + su parte del overhead, redondeado con el residuo en la
   * última casilla del lote para que Σ = K del lote exacto.
   *
   * **No viaja al espejo.** Ver la nota de nomenclatura en la cabecera.
   */
  KUnidadCOP: number;
  /** `K/0,90` gema · `K/0,71` joya. El piso: de acá para abajo, ni con descuento. */
  equilibrioRealUnidadCOP: number;
  /** `K/0,60` gema · `K/0,41` joya. Supervivencia + el 30% de margen neto. */
  precioObjetivoUnidadCOP: number;
  /**
   * `['CATEGORIA_INFERIDA']` cuando el lote cotizó con una `categoriaFiscal`
   * que nadie capturó — sembrada por palabras clave (decisión de Kevin,
   * 2026-08-02). Ausente en cualquier otro caso: el candado del motor solo
   * exige que la categoría EXISTA, este aviso es lo que dice de dónde salió.
   */
  avisos?: string[];
}

/**
 * Reparte el overhead del lote entre sus casillas y precifica cada una.
 *
 * ## Por qué el redondeo es así
 *
 * `K_unidad` se mantiene **sin redondear** para derivar los dos precios. Es lo
 * que hizo la auditoría, y se puede verificar en su propia tabla (§5.2 de
 * `tierramadre-modelo-fijacion-precios-v2`): lista K_unidad #372 = $399.408 y
 * objetivo #372 = $665.681 en la misma fila, cuando `399.408 / 0,60` da $665.680
 * exacto. Si se redondeara K antes de dividir, los cuatro objetivos sumarían
 * $2.306.349 y el invariante contra el objetivo del lote se rompería por un peso.
 *
 * El **residuo va a la última casilla**, por separado en cada nivel (K,
 * equilibrio real, objetivo) y **dentro de cada grupo de misma categoría
 * fiscal**. En un lote de categoría uniforme —el caso normal— eso es exactamente
 * la regla dictada. En un lote MIXTO no existe «el objetivo del lote» (son dos
 * divisores), así que el invariante se sostiene por grupo, que es donde la suma
 * tiene sentido.
 */
export function repartirPorPeso(input: RepartirPorPesoInput): PrecioUnidad[] {
  const { casillas, costosVariablesLoteCOP, costoFijoUnitarioLoteCOP, config } =
    input;

  if (casillas.length === 0) return [];

  for (const c of casillas) {
    // Sin costo no hay peso, y sin peso el reparto se desbalancea en silencio:
    // los pesos dejarían de sumar 1 y el overhead se repartiría de más entre las
    // que sí tienen costo. El llamador debe gatear con la conciliación del lote
    // (`conciliarCostos(...).cuadra`) antes de llegar acá.
    if (
      !Number.isFinite(c.costoUnitarioRealCOP) ||
      c.costoUnitarioRealCOP <= 0
    ) {
      throw new Error(
        `la casilla ${c.itemId} no tiene costo capturado (recibí ` +
          `${c.costoUnitarioRealCOP}): el motor por unidad solo corre sobre un ` +
          `lote conciliado. Repartir el costo del lote es el prorrateo que D6 ` +
          `prohíbe.`,
      );
    }
    exigeCategoriaFiscal(c.categoriaFiscal);
  }

  const totalCosto = casillas.reduce((a, c) => a + c.costoUnitarioRealCOP, 0);
  const overhead = costoFijoUnitarioLoteCOP + costosVariablesLoteCOP;
  if (!Number.isFinite(overhead) || overhead < 0) {
    throw new Error(`overhead del lote inválido (recibí ${overhead}).`);
  }

  // Sin redondear: los tres números salen de acá.
  const exactos = casillas.map((c) => {
    const peso = c.costoUnitarioRealCOP / totalCosto;
    return {
      itemId: c.itemId,
      categoriaFiscal: c.categoriaFiscal,
      peso,
      K: c.costoUnitarioRealCOP + overhead * peso,
    };
  });

  const retenido = (cat: CategoriaFiscal): number =>
    1 - config.comisionPct - (cat === 'joya' ? config.ivaJoyaPct : 0);

  /**
   * Redondea una columna dejando el residuo en la ÚLTIMA casilla de cada grupo
   * fiscal, para que Σ del grupo sea exactamente el total del grupo.
   */
  const conResiduo = (
    valor: (e: (typeof exactos)[number]) => number,
  ): number[] => {
    const salida = exactos.map((e) => Math.round(valor(e)));
    const grupos = new Map<CategoriaFiscal, number[]>();
    exactos.forEach((e, i) => {
      grupos.set(e.categoriaFiscal, [
        ...(grupos.get(e.categoriaFiscal) ?? []),
        i,
      ]);
    });
    for (const indices of grupos.values()) {
      const total = Math.round(
        indices.reduce((a, i) => a + valor(exactos[i]), 0),
      );
      const parcial = indices.slice(0, -1).reduce((a, i) => a + salida[i], 0);
      salida[indices[indices.length - 1]] = total - parcial;
    }
    return salida;
  };

  const kRedondeado = conResiduo((e) => e.K);
  const equilibrio = conResiduo((e) => e.K / retenido(e.categoriaFiscal));
  const objetivo = conResiduo(
    (e) => e.K / divisorObjetivo(e.categoriaFiscal, config),
  );

  return exactos.map((e, i) => ({
    itemId: e.itemId,
    categoriaFiscal: e.categoriaFiscal,
    peso: e.peso,
    KUnidadCOP: kRedondeado[i],
    equilibrioRealUnidadCOP: equilibrio[i],
    precioObjetivoUnidadCOP: objetivo[i],
  }));
}

export interface CasillaDelLote {
  itemId: string;
  /** Ausente mientras W2 no lo capture. */
  costoUnitarioRealCOP?: number;
  /** Solo la declaran las casillas de un lote `mixta`. */
  categoriaFiscal?: CategoriaFiscal;
}

export interface PreciosDelLoteInput {
  /** El costo de compra PURO, sin variables — contra el que se concilia. */
  costoCompraLoteCOP: number;
  casillas: readonly CasillaDelLote[];
  categoriaFiscalLote?: CategoriaFiscalLote;
  costosVariablesLoteCOP: number;
  costoFijoUnitarioLoteCOP: number;
  config: ConfigPrecios;
  /**
   * De dónde salió `categoriaFiscalLote`. `'inferida'` estampa
   * `CATEGORIA_INFERIDA` en cada precio que sale (decisión de Kevin,
   * 2026-08-02) — el candado de arriba no distingue, este campo sí.
   */
  categoriaFiscalOrigen?: 'capturada' | 'inferida' | 'revisada';
}

export interface PreciosDelLote {
  cotiza: boolean;
  /** Por qué no cotiza. Vacío cuando sí. */
  motivo?: string;
  /** Vacío cuando no cotiza: o cotizan todas, o ninguna. */
  porItem: Map<string, PrecioUnidad>;
}

/**
 * Decide si un lote puede precificar sus casillas, y las precifica.
 *
 * **La regla de escritura al espejo** (Kevin, 2026-08-01): la celda de precio por
 * unidad se escribe SOLO cuando la casilla tiene costo capturado Y el lote pasó
 * la conciliación Σ≈costo. Si no, vacía — y el Léeme lo explica, para que una
 * casilla PENDIENTE sin precio se lea como pendiente y no como «el motor falló».
 *
 * **O cotizan todas, o ninguna.** No es rigor de más: el reparto es POR PESO, así
 * que sin el costo de una hermana los pesos de TODAS están mal. Cotizar «las que
 * se puede» produciría números plausibles y equivocados — que es peor que una
 * celda vacía, porque una celda vacía se nota.
 *
 * La categoría se hereda del lote, salvo en un lote `mixta`, donde cada casilla
 * declara la suya. Una casilla mixta sin declarar NO hereda por descarte:
 * heredar «gema» cotizaría una joya 46% por debajo.
 */
export function preciosDelLote(input: PreciosDelLoteInput): PreciosDelLote {
  const vacio = {
    cotiza: false as const,
    porItem: new Map<string, PrecioUnidad>(),
  };

  if (input.casillas.length === 0) {
    return { ...vacio, motivo: 'el lote todavía no tiene casillas.' };
  }

  const conciliacion = conciliarCostos(
    input.costoCompraLoteCOP,
    input.casillas.map((c) => c.costoUnitarioRealCOP),
  );
  if (!conciliacion.cuadra) {
    return { ...vacio, motivo: conciliacion.aviso };
  }

  // `cuadra` ya garantiza que ninguna quedó sin costo, pero se re-estrecha el
  // tipo acá en vez de confiar en esa implicación a distancia.
  const resueltas: CasillaParaMotor[] = [];
  for (const c of input.casillas) {
    const categoria =
      c.categoriaFiscal ??
      (input.categoriaFiscalLote === 'gema' ||
      input.categoriaFiscalLote === 'joya'
        ? input.categoriaFiscalLote
        : undefined);
    if (!categoria) {
      return {
        ...vacio,
        motivo:
          `la casilla ${c.itemId} no declara categoría fiscal y el lote es ` +
          `${input.categoriaFiscalLote ?? 'sin categoría'}: no hay divisor que ` +
          `aplicarle. Heredar uno por descarte cotizaría una joya 46% por debajo.`,
      };
    }
    if (c.costoUnitarioRealCOP === undefined) {
      return {
        ...vacio,
        motivo: `la casilla ${c.itemId} no tiene costo capturado.`,
      };
    }
    resueltas.push({
      itemId: c.itemId,
      costoUnitarioRealCOP: c.costoUnitarioRealCOP,
      categoriaFiscal: categoria,
    });
  }

  const precios = repartirPorPeso({
    casillas: resueltas,
    costosVariablesLoteCOP: input.costosVariablesLoteCOP,
    costoFijoUnitarioLoteCOP: input.costoFijoUnitarioLoteCOP,
    config: input.config,
  });

  const conAvisos =
    input.categoriaFiscalOrigen === 'inferida'
      ? precios.map((p) => ({ ...p, avisos: ['CATEGORIA_INFERIDA'] }))
      : precios;

  return {
    cotiza: true,
    porItem: new Map(conAvisos.map((p) => [p.itemId, p])),
  };
}
