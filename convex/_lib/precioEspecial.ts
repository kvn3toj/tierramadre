/**
 * Precio especial por cierre de temporada — flag estructurado derivado de
 * `observacion` (2026-07-25).
 *
 * La promoción se escribió en producción como TEXTO, no como campo: hoy hay
 * ~156 filas de `productInventory` cuya `observacion` TERMINA con la etiqueta
 * canónica. Puede venir sola o concatenada tras una observación previa con
 * ` · ` de separador:
 *
 *   "Precio especial por cierre de temporada"
 *   "Transformada 2026-07-24: engastada en la joya #398 … · Precio especial por cierre de temporada"
 *
 * Parsear ese texto en el cliente sería frágil (cada vista repetiría el
 * `endsWith`, y el vencimiento quedaría regado por la UI). En vez de eso las
 * queries públicas de `convex/products.ts` denormalizan `precioEspecial` sobre
 * cada fila usando este helper, y el frontend solo pregunta si el objeto está.
 *
 * NO se agrega columna al `schema.ts`: esto se DERIVA en tiempo de lectura. Si
 * mañana la promo se modela de verdad (campo propio, fechas por ítem), este
 * archivo es el único punto que cambia.
 */

/**
 * Texto exacto que marca un ítem en promoción. Debe coincidir carácter por
 * carácter con lo escrito en producción — es la única marca que existe.
 */
export const ETIQUETA_PRECIO_ESPECIAL =
  'Precio especial por cierre de temporada';

/** Último día en que la promoción se considera vigente (ISO, YYYY-MM-DD). */
export const PRECIO_ESPECIAL_HASTA = '2026-08-31';

/**
 * Offset de Colombia (COT). Fijo todo el año — el país no observa horario de
 * verano —, así que basta la constante y no hace falta una librería de zonas.
 */
export const OFFSET_HORARIO_COLOMBIA = '-05:00';

/**
 * Instante exacto en que la promoción deja de estar vigente: el final del día
 * `PRECIO_ESPECIAL_HASTA` en hora Colombia (= 2026-09-01T05:00:00Z).
 */
export const PRECIO_ESPECIAL_VENCE_MS = Date.parse(
  `${PRECIO_ESPECIAL_HASTA}T23:59:59.999${OFFSET_HORARIO_COLOMBIA}`,
);

/** Forma que consume la UI. Presente SOLO cuando la promoción está vigente. */
export type PrecioEspecial = {
  /** El texto de la promoción, listo para mostrar. */
  etiqueta: string;
  /** Fecha de vencimiento en ISO corto (YYYY-MM-DD). */
  hasta: string;
};

/**
 * Deriva el flag de precio especial a partir de la `observacion` de un ítem.
 *
 * Devuelve el objeto SOLO si la observación termina con la etiqueta canónica
 * Y la promoción sigue vigente en `ahora`. En cualquier otro caso devuelve
 * `undefined` — sin etiqueta, sin observación, o promoción ya vencida.
 *
 * Puro y sin IO de Convex, para poder testearlo.
 *
 * @param observacion  La observación cruda de la fila (puede faltar).
 * @param ahora        Instante de evaluación (ms epoch o Date). Por defecto, ya.
 */
export function precioEspecialDeObservacion(
  observacion?: string | null,
  ahora: number | Date = Date.now(),
): PrecioEspecial | undefined {
  if (!observacion) return undefined;

  // `trimEnd` tolera el espacio/salto que a veces deja el pegado desde Sheets;
  // la etiqueta debe seguir siendo lo ÚLTIMO del texto.
  if (!observacion.trimEnd().endsWith(ETIQUETA_PRECIO_ESPECIAL)) {
    return undefined;
  }

  const ahoraMs = ahora instanceof Date ? ahora.getTime() : ahora;
  if (ahoraMs > PRECIO_ESPECIAL_VENCE_MS) return undefined;

  return { etiqueta: ETIQUETA_PRECIO_ESPECIAL, hasta: PRECIO_ESPECIAL_HASTA };
}
