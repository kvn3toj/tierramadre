/**
 * El push a la hoja no puede BORRAR un campo que sólo vive en Convex.
 *
 * EL INCIDENTE (2026-09-05). Cuatro certificados desaparecieron del SOT:
 * #483, #484, #551 y #552. Sus URLs estaban escritas en la hoja desde el
 * 23-ago; Convex nunca las supo. Una corrección de `caja`/`coleccion` disparó
 * un push, el push reescribe la FILA ENTERA desde Convex, y
 * `certificadoUrl: row.certificadoUrl ?? ''` mandó cadena vacía a la columna
 * AM. La auditoría sólo registró los campos que se querían cambiar: el borrado
 * viajó de polizón.
 *
 * Sobrevivieron #544, #545, #546 y #550 por una única razón: su `lastPushedAt`
 * es del 19-ago, anterior a que existieran los certificados. No estaban a
 * salvo — estaban en la fila para el mismo borrado en su próximo push.
 *
 * LA REGLA. `fotoUrl` y `certificadoUrl` son de CONVEX desde el 2026-08-15 (el
 * incidente que costó 9 fotos): se excluyeron de `WRITABLE.inventory` para que
 * un pull con la celda vacía no pisara lo que Convex acababa de guardar. La
 * hoja es su ESPEJO, no su casa. Y esa exclusión, que los protege del pull, es
 * exactamente lo que los vuelve frágiles al push: como no hay camino de vuelta,
 * un '' escrito por error es definitivo.
 *
 * De ahí la invariante, que vale para todo campo push-only presente y futuro:
 *
 *     lo que el allowlist del pull NO lee, el push NO puede mandar como ''.
 *
 * `undefined` en Convex significa «Convex no se enteró», no «lo borraron», así
 * que la clave se OMITE y `api/admin-product-update.ts` conserva la celda.
 * Un '' explícito sí se manda: eso sí es un borrado deliberado.
 *
 * Esta prueba lee el fuente porque el payload se arma dentro de una action, sin
 * función pura que invocar. Es el mismo recurso que `sinMarcadoresDeConflicto`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { WRITABLE } from '../convex/_lib/sheetPullMaps';

const FUENTE = readFileSync('convex/products.ts', 'utf8');

/** El bloque `fields: { … }` que viaja a /api/admin-product-update. */
function bloqueDelPayload(): string {
  // Anclar en la llamada misma: `precioFinalCOP: row.precioFinalCOP` y
  // `qr: row.qr` aparecen antes en el archivo, en otros contextos.
  const llamada = FUENTE.indexOf('/api/admin-product-update`');
  expect(llamada, 'no se encontró la llamada de push').toBeGreaterThan(0);
  const desde = FUENTE.indexOf('qr: row.qr', llamada);
  const hasta = FUENTE.indexOf('precioFinalCOP: row.precioFinalCOP', desde);
  expect(desde, 'no se encontró el inicio del payload de push').toBeGreaterThan(
    llamada,
  );
  expect(hasta, 'no se encontró el final del payload de push').toBeGreaterThan(
    desde,
  );
  return FUENTE.slice(desde, hasta + 80);
}

describe('el push no borra campos que sólo viven en Convex', () => {
  it('ningún campo push-only se colapsa a cadena vacía', () => {
    const bloque = bloqueDelPayload();

    // Claves que el push manda: `clave: row.clave …` en cualquiera de sus dos
    // formas (directa o dentro de un spread condicional).
    const claves = [
      ...new Set(
        [...bloque.matchAll(/\b([a-zA-Z][a-zA-Z0-9]*):\s*row\.\1\b/g)].map(
          (m) => m[1],
        ),
      ),
    ];
    expect(claves.length).toBeGreaterThan(10);

    const lee = (k: string) =>
      Object.prototype.hasOwnProperty.call(WRITABLE.inventory, k);

    // mostrarEnCatalogo es push-only igual que los otros, pero es el único
    // BOOLEANO del grupo y por eso no puede perder información: en Convex es
    // `v.optional(v.boolean())` y TODA lectura del código es `=== true` o
    // `?? false`, así que `undefined` y `false` son el mismo estado. Empujar
    // 'FALSE' cuando Convex no sabe nada describe el estado con fidelidad.
    // La invariante protege el caso contrario —el de los campos de texto—,
    // donde `undefined` («no sé») y `''` («no tiene») son cosas distintas y
    // escribir la segunda encima de la primera destruye el único dato que había.
    const BOOLEANO_SIN_PERDIDA = new Set(['mostrarEnCatalogo']);

    const culpables = claves.filter((k) => {
      if (lee(k)) return false; // el pull lo devuelve: '' es seguro
      if (BOOLEANO_SIN_PERDIDA.has(k)) return false;
      // push-only ⇒ tiene que estar bajo un spread condicional, nunca `?? ''`
      const colapsa = new RegExp(`${k}:\\s*row\\.${k}\\s*\\?\\?\\s*''`).test(
        bloque,
      );
      const omite = new RegExp(`row\\.${k}\\s*!==\\s*undefined`).test(bloque);
      return colapsa || !omite;
    });

    expect(
      culpables,
      `Estos campos NO los devuelve el pull, así que mandarlos como '' borra la ` +
        `celda para siempre. Emitilos con un spread condicional:\n` +
        culpables
          .map(
            (k) => `  ...(row.${k} !== undefined ? { ${k}: row.${k} } : {}),`,
          )
          .join('\n'),
    ).toEqual([]);
  });

  it('los tres campos push-only conocidos están protegidos', () => {
    const bloque = bloqueDelPayload();
    for (const k of ['preponderancia', 'fotoUrl', 'certificadoUrl']) {
      expect(
        Object.prototype.hasOwnProperty.call(WRITABLE.inventory, k),
        `${k} dejó de ser push-only: si ahora el pull lo devuelve, revisá esta prueba`,
      ).toBe(false);
      expect(
        new RegExp(`row\\.${k}\\s*!==\\s*undefined`).test(bloque),
        `${k} tiene que emitirse sólo cuando está definido`,
      ).toBe(true);
    }
  });
});
