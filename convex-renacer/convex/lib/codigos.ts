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
