/**
 * Los códigos de invitación, después del pivote del 2026-08-31.
 *
 * Antes: un código por kit comprado, secuencial desde 101. Ahora: cada **raíz** (el líder
 * comunitario que invita — Mitchell, Pablo/Casamangles) recibe un **bloque** de códigos
 * numéricos; los reparte uno por persona, y cualquier código del bloque se lee como "esta
 * persona viene por esta raíz". El formato sigue siendo numérico de 3–4 dígitos: la URL
 * impresa `/renacer/k/{codigo}` (§3.4 · G-A.1) no cambia, y un código de kit viejo sigue
 * resolviendo por la tabla `kits`.
 *
 * Ejemplo: raíz con base 100 y tamaño 100 → el código de la raíz es 100 y reparte 101…199.
 */

export const CODIGO_MIN = 100;
export const CODIGO_MAX = 9999;

/** Formato de entrada: 3–4 dígitos sin cero a la izquierda, dentro del rango. */
export function parseCodigo(valor: unknown): number | null {
  const s = String(valor ?? '').trim();
  if (!/^[1-9][0-9]{2,3}$/.test(s)) return null;
  const n = Number(s);
  return n >= CODIGO_MIN && n <= CODIGO_MAX ? n : null;
}

export interface Bloque {
  codigoBase: number;
  tamano: number;
}

/** El código de la raíz misma es `codigoBase`; los repartibles son base+1 … base+tamano-1. */
export function codigoEnBloque(b: Bloque, codigo: number): boolean {
  return codigo > b.codigoBase && codigo < b.codigoBase + b.tamano;
}

export function esCodigoDeRaiz(b: Bloque, codigo: number): boolean {
  return codigo === b.codigoBase;
}

export function bloquesSeSolapan(a: Bloque, b: Bloque): boolean {
  const finA = a.codigoBase + a.tamano; // exclusivo
  const finB = b.codigoBase + b.tamano;
  return a.codigoBase < finB && b.codigoBase < finA;
}

export function bloqueValido(b: Bloque): boolean {
  return (
    Number.isInteger(b.codigoBase) &&
    Number.isInteger(b.tamano) &&
    b.codigoBase >= CODIGO_MIN &&
    b.tamano >= 2 &&
    b.codigoBase + b.tamano - 1 <= CODIGO_MAX
  );
}

/**
 * Los códigos que una raíz puede repartir: `base+1 … base+tamano-1`.
 *
 * **Nunca incluye la base**, que identifica a la raíz misma y no se entrega a nadie
 * (`raices.resolverCodigo` la rechaza con `motivo: 'es_raiz'`). Que esa exclusión viva
 * acá y no en la pantalla es el punto: el panel de la raíz y el resolvedor de códigos
 * comparten la misma definición de "repartible", en vez de repetirla y desincronizarse.
 */
export function codigosRepartibles(b: Bloque): number[] {
  const cs: number[] = [];
  for (let c = b.codigoBase + 1; c < b.codigoBase + b.tamano; c++) cs.push(c);
  return cs;
}

/**
 * El próximo código libre del bloque, o `null` si el cupo está agotado.
 *
 * Devuelve el **más bajo** que nadie usó, no "el siguiente al último": si el 201 quedó
 * libre porque una persona no terminó el registro, se vuelve a ofrecer. Los huecos no
 * queman cupo — la raíz tiene un bloque finito y cada código perdido es una familia que
 * se queda afuera.
 */
export function proximoLibre(b: Bloque, usados: ReadonlySet<number>): number | null {
  return codigosRepartibles(b).find((c) => !usados.has(c)) ?? null;
}
