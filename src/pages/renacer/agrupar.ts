/**
 * Agrupa necesidades por bolsa para "Conocer las necesidades" (31-08).
 *
 * Solo agrupa: **no reordena** el turno (§9). Dentro de cada bolsa el orden es el que
 * trae la lista (más recientes primero, como la sirve el backend). Las que no tienen
 * bolsa van juntas al final bajo `SIN_BOLSA`.
 */

export const SIN_BOLSA = 'Otras necesidades';

export interface ConBolsa {
  categoria: string | null;
}

export interface Bolsa<T extends ConBolsa> {
  nombre: string;
  necesidades: T[];
}

export function agruparPorBolsa<T extends ConBolsa>(necesidades: T[]): Bolsa<T>[] {
  const mapa = new Map<string, T[]>();
  for (const n of necesidades) {
    const clave = n.categoria?.trim() || SIN_BOLSA;
    const lista = mapa.get(clave) ?? [];
    lista.push(n);
    mapa.set(clave, lista);
  }

  const bolsas = [...mapa.entries()].map(([nombre, lista]) => ({ nombre, necesidades: lista }));

  // Las más pedidas primero; `SIN_BOLSA` siempre al final aunque sea la más grande —
  // "otras" no compite con una bolsa nombrada.
  bolsas.sort((a, b) => {
    if (a.nombre === SIN_BOLSA) return 1;
    if (b.nombre === SIN_BOLSA) return -1;
    return b.necesidades.length - a.necesidades.length || a.nombre.localeCompare(b.nombre, 'es');
  });

  return bolsas;
}
