/**
 * El editor de inventario escribe el precio que el catálogo LEE.
 *
 * Lo que se fija aquí es dinero que ya se perdió una vez.
 *
 * `productInventory` tiene dos campos de precio y sólo uno está vivo:
 *
 *   · `precioFinalCOP` — columna M del SOT. Es lo que pinta el catálogo
 *     público (`convex/products.ts` publishedCatalog → `precioFinalCOP ?? 0`,
 *     y `src/hooks/useFotosintesisCatalog.ts` → `row.precioFinalCOP ?? 0`).
 *   · `precioCOP` — el riel LEGACY. Perdió su columna en el espejo SOT el
 *     2026-05-29, NO está en el allowlist de pull (`convex/_lib/sheetPullMaps.ts`)
 *     y está en `CAMPOS_RESERVADOS_CATALOGO`, así que jamás llega al payload
 *     público. Escribirlo deja el valor en un campo que ninguna query lee y
 *     en ninguna celda.
 *
 * El 19 y 20 de agosto de 2026 se pusieron precios a doce piezas del lote
 * TM-001 desde este editor. El editor mandaba `precioCOP`. Las piezas salieron
 * a producción como «Consultar precio» y así estuvieron dos semanas, hasta que
 * un cliente lo notó en la vitrina. El valor además se perdió: hoy `precioCOP`
 * está en 0 en las cinco que lo habían recibido.
 *
 * Hay un segundo motivo, más silencioso, para que el campo correcto sea
 * `precioFinalCOP`: `_saveEdit` estampa `precioFinalManual: true` SÓLO cuando
 * el patch nombra `precioFinalCOP` (convex/products.ts). Sin ese sello, el
 * re-fan del lote devuelve el precio a `costoBaseCOP × 2.6` — que para TM-001,
 * con costo 0, es CERO. Es exactamente lo que separa a las piezas que
 * sobrevivieron de las que no.
 *
 * Por eso esto se prueba sobre el código y no sobre el render: el fallo no es
 * visual ni lanza error. Es un identificador equivocado que compila, guarda,
 * responde 200 y audita «saved».
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MODULO = join(process.cwd(), 'src/pages/admin/ProductManagement');

const archivos = readdirSync(MODULO).filter(
  (f) => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.test.'),
);

/**
 * La ÚNICA excepción viva, y es deliberada: el modo creación del drawer sigue
 * mandando `precioCOP` porque `createProductFieldsArgs` en convex/products.ts
 * todavía no acepta `precioFinalCOP` — verificado contra producción con
 * `npx convex function-spec --prod` el 2026-09-04. Cerrarla pide una rama desde
 * `main` que agregue el campo a `createProductFieldsArgs` + `_createProduct` y
 * un `convex deploy`. Mientras siga acá, una pieza creada con precio desde el
 * drawer nace sin precio público y hay que reeditarla.
 *
 * Se enumera línea por línea a propósito: si la excepción se mueve o se
 * multiplica, el test falla y alguien tiene que volver a decidir.
 */
const EXCEPCION_CREACION = ['EditDrawer.tsx:228'];

/** Quita comentarios de línea y de bloque: el incidente se documenta en prosa
 *  dentro de estos archivos, y esa prosa no es una escritura. */
function sinComentarios(src: string): string[] {
  const sinBloques = src.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, ' '),
  );
  return sinBloques
    .split('\n')
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? '' : l.replace(/\/\/.*$/, '')));
}

describe('el editor de inventario escribe el campo de precio vivo', () => {
  it('ningún archivo del módulo admin ESCRIBE el campo legacy `precioCOP`', () => {
    const culpables: string[] = [];
    for (const f of archivos) {
      sinComentarios(readFileSync(join(MODULO, f), 'utf8')).forEach(
        (linea, i) => {
          // `\b` a secas marcaría también `precioFinalCOP`; el lookbehind
          // negativo exige que no venga precedido de un carácter de identificador.
          if (/(?<![A-Za-z0-9_])precioCOP\b/.test(linea)) {
            culpables.push(`${f}:${i + 1}`);
          }
        },
      );
    }
    expect(
      culpables,
      'El campo legacy `precioCOP` volvió al editor de inventario. El catálogo ' +
        'lee `precioFinalCOP`; lo que se escriba aquí no lo verá ningún cliente ' +
        'y el re-fan del lote lo borrará. Ver el encabezado de este test.',
    ).toEqual(EXCEPCION_CREACION);
  });

  it('el módulo sí nombra `precioFinalCOP` — la prueba anterior no pasa por vacío', () => {
    const usos = archivos.filter((f) =>
      readFileSync(join(MODULO, f), 'utf8').includes('precioFinalCOP'),
    );
    expect(usos.length).toBeGreaterThan(0);
  });
});
