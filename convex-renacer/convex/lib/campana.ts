/**
 * El tiempo de la campaña.
 *
 * Vive en `lib/` y no en `stats.ts` por la misma razón que `codigos.ts` y `bolsas.ts`:
 * los módulos de `lib/` no importan `_generated/server`, así que un test los puede
 * ejecutar sin levantar Convex. La regla que este archivo hace cumplir es de las que
 * conviene tener bajo test, no bajo disciplina.
 */

const UN_DIA = 86_400_000;

/**
 * "Cuántos días va la campaña" — pedido en la reunión del 31-08, junto a las familias
 * inscritas y el recaudo.
 *
 * **Devuelve `null` mientras nadie haya fijado el arranque, y eso es la función, no un
 * caso borde** (D-0901-3). El día en que arrancó la campaña es un hecho del negocio: solo
 * Kevin lo sabe. Derivarlo del primer registro, del primer contador o de `Date.now()`
 * sería un default que rellena un campo vacío — un dato inventado con forma de dato, y a
 * las 24 horas ya no se distingue de uno medido. La pantalla que recibe `null` no pinta
 * el contador; el hueco lo dice, no simula.
 *
 * El primer día de campaña es el día 1, no el día 0: es un número que se lee en voz alta.
 */
export function diasDeCampana(
  iniciadaEn: number | undefined | null,
  ahora = Date.now(),
): number | null {
  if (!iniciadaEn) return null;
  return Math.max(1, Math.floor((ahora - iniciadaEn) / UN_DIA) + 1);
}
