/**
 * Las consultas que se cachean contra el centinela no leen el reloj.
 *
 * Convex reutiliza el resultado de una query para llamadas con los mismos
 * argumentos mientras su read set no cambie — y cobra cero I/O por esas
 * lecturas. Eso exige queries deterministas: su guía dice literalmente «Don't
 * use Date.now() in queries». `publishedCatalog` llamaba
 * `precioEspecialDeObservacion(row.observacion)` por fila, y ese helper tenía
 * `ahora = Date.now()` como valor por defecto: 430 lecturas del reloj dentro de
 * la transacción, en la query más cara del proyecto (737,82 MB del 1 al 5 de
 * septiembre de 2026, 1:1 con su conteo de llamadas).
 *
 * Si quitar el reloj hace que la caché de Convex empiece a servir esa query,
 * el dashboard lo muestra en 24 h (cache hit rate y MB/llamada). Si no, la
 * hipótesis queda falsificada a costo cero — y la guarda sigue valiendo por
 * la razón de fondo: una query que lee el reloj no puede ser cacheada por
 * nadie, ni por Convex ni por nosotros, sin servir un dato que depende de
 * cuándo se leyó.
 *
 * Alcance deliberado: sólo las queries que el catálogo público cachea. Otras
 * queries leen el reloj con sentido (vencimiento de una vitrina, un lock) y no
 * pasan por ninguna caché.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const QUERIES_CACHEADAS = [
  'catalogVersion',
  'publishedCatalog',
  'fotoUrls',
  'publishedGroups',
];

const LEE_EL_RELOJ = /Date\.now\(|new Date\(|Math\.random\(/;

/** Los comentarios pueden NOMBRAR el reloj para explicar por qué no se usa. */
function sinComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function bloqueDeQuery(src: string, nombre: string): string {
  const inicio = src.search(
    new RegExp(`^export const ${nombre} = (?:internalQuery|query)\\(`, 'm'),
  );
  expect(inicio, `no se encontró la query ${nombre}`).toBeGreaterThan(-1);
  const resto = src.slice(inicio + 1);
  const fin = resto.search(/^export /m);
  return fin === -1 ? src.slice(inicio) : src.slice(inicio, inicio + 1 + fin);
}

describe('las consultas cacheadas contra el centinela son deterministas', () => {
  const productos = readFileSync('convex/products.ts', 'utf8');

  for (const nombre of QUERIES_CACHEADAS) {
    it(`products.${nombre} no lee el reloj`, () => {
      const cuerpo = sinComentarios(bloqueDeQuery(productos, nombre));
      expect(
        LEE_EL_RELOJ.test(cuerpo),
        `products.${nombre} lee Date.now()/new Date()/Math.random(): deja de ` +
          `ser determinista y ninguna caché puede reutilizarla sin servir un ` +
          `dato que depende de cuándo se leyó.`,
      ).toBe(false);
    });
  }

  it('el helper de precio especial no tiene el reloj como valor por defecto', () => {
    // El agujero concreto: `ahora = Date.now()` en la firma hacía que cada
    // llamada sin segundo argumento leyera el reloj — invisible en la query.
    const src = sinComentarios(
      readFileSync('convex/_lib/precioEspecial.ts', 'utf8'),
    );
    expect(/=\s*Date\.now\(\)/.test(src)).toBe(false);
  });
});
