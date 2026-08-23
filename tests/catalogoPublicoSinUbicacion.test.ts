import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import schema from '../convex/schema';
import {
  CAMPOS_PUBLICOS_CATALOGO,
  CAMPOS_RESERVADOS_CATALOGO,
  proyectaCatalogoPublico,
} from '../convex/products';

/**
 * La frontera de `products.publishedCatalog` y `products.getPublicByItem`.
 *
 * Las dos son `query({})` de Convex — o sea PÚBLICAS, y la URL del deployment
 * viaja dentro del bundle de la página. Un `curl` sin credencial a
 * `valuable-mule-753.convex.cloud/api/query` bajaba el catálogo entero con la
 * UBICACIÓN FÍSICA de 409 piezas, el asesor de 310 y el estado contable de 180
 * (medido en producción el 2026-08-21; ver
 * docs/audits/2026-08-21-rieles-precio-costo.md §1). Nadie decidió publicar
 * eso: la proyección se escribió una vez copiando la fila y las columnas
 * nuevas se fueron colando.
 *
 * Por eso la proyección ahora se DERIVA de una lista blanca, y este archivo la
 * ata por los dos lados:
 *
 *  1. Lo que sale ⊆ lista blanca (nadie agrega un campo a la salida sin
 *     declararlo, porque no hay literal donde agregarlo).
 *  2. Toda columna de `productInventory` está clasificada en exactamente una
 *     de las dos listas. Una columna nueva del SOT rompe ESTE test hasta que
 *     alguien decida, a mano, de qué lado va. Falla CERRADO.
 */

const CAMPOS_DEL_ESQUEMA = Object.keys(
  (
    schema as unknown as {
      tables: Record<
        string,
        { validator: { fields: Record<string, unknown> } }
      >;
    }
  ).tables.productInventory.validator.fields,
);

/** Los seis del hallazgo #1: dato de tercero o inventario geolocalizado. */
const LOS_SEIS_QUE_SE_FUGABAN = [
  'ubicacion',
  'asesor',
  'qr',
  'caja',
  'asesorActual',
  'estadoAsesor',
] as const;

/** Una fila con TODAS las columnas del esquema pobladas con algo reconocible. */
const filaCompleta = (): Record<string, unknown> =>
  Object.fromEntries(CAMPOS_DEL_ESQUEMA.map((k) => [k, `valor-${k}`]));

describe('lista blanca del catálogo público', () => {
  it('clasifica TODA columna de productInventory en exactamente una lista', () => {
    const publicos = new Set<string>(CAMPOS_PUBLICOS_CATALOGO);
    const reservados = new Set<string>(CAMPOS_RESERVADOS_CATALOGO);

    const sinClasificar = CAMPOS_DEL_ESQUEMA.filter(
      (k) => !publicos.has(k) && !reservados.has(k),
    );
    expect(sinClasificar, 'columnas del SOT sin clasificar').toEqual([]);

    const enLasDos = CAMPOS_DEL_ESQUEMA.filter(
      (k) => publicos.has(k) && reservados.has(k),
    );
    expect(enLasDos, 'columnas clasificadas dos veces').toEqual([]);

    const inventadas = [...publicos, ...reservados].filter(
      (k) => !CAMPOS_DEL_ESQUEMA.includes(k),
    );
    expect(
      inventadas,
      'campos listados que ya no existen en el esquema',
    ).toEqual([]);
  });

  it('los seis campos del hallazgo #1 están del lado reservado', () => {
    for (const campo of LOS_SEIS_QUE_SE_FUGABAN) {
      expect(
        CAMPOS_RESERVADOS_CATALOGO as readonly string[],
        `${campo} debe quedar fuera del catálogo público`,
      ).toContain(campo);
    }
  });

  it('deja pasar `coleccion` y `estado` — la web los pinta', () => {
    expect(CAMPOS_PUBLICOS_CATALOGO as readonly string[]).toContain(
      'coleccion',
    );
    expect(CAMPOS_PUBLICOS_CATALOGO as readonly string[]).toContain('estado');
  });
});

describe('proyectaCatalogoPublico', () => {
  it('no deja salir NINGUNO de los seis, ni con la fila entera poblada', () => {
    const salida = proyectaCatalogoPublico(filaCompleta()) as Record<
      string,
      unknown
    >;
    for (const campo of LOS_SEIS_QUE_SE_FUGABAN) {
      expect(salida, `${campo} se sigue fugando`).not.toHaveProperty(campo);
    }
  });

  it('no emite ninguna clave fuera de la lista blanca', () => {
    const salida = proyectaCatalogoPublico(filaCompleta());
    const fuera = Object.keys(salida).filter(
      (k) => !(CAMPOS_PUBLICOS_CATALOGO as readonly string[]).includes(k),
    );
    expect(fuera).toEqual([]);
  });

  it('tampoco deja salir el costo ni los precios internos', () => {
    const salida = proyectaCatalogoPublico(filaCompleta()) as Record<
      string,
      unknown
    >;
    for (const campo of [
      'costoBaseCOP',
      'precioCOP',
      'precioPotencialCOP',
      'precioConscienteCOP',
      'precioEmbajadorCOP',
      'cajaComprador',
      'cajaSaldoCOP',
      'syncStatus',
      'rowIndex',
    ]) {
      expect(salida).not.toHaveProperty(campo);
    }
  });

  it('conserva lo que la ficha sí necesita', () => {
    const salida = proyectaCatalogoPublico({
      itemId: '182',
      nombre: 'Secreto de Tena',
      precioFinalCOP: 635000,
      estado: 'DISPONIBLE',
      coleccion: '#4000',
      ubicacion: 'OFI.CALI',
      asesor: 'M.Campuzano',
    }) as Record<string, unknown>;
    expect(salida).toEqual({
      itemId: '182',
      nombre: 'Secreto de Tena',
      precioFinalCOP: 635000,
      estado: 'DISPONIBLE',
      coleccion: '#4000',
    });
  });

  it('omite las claves ausentes en vez de emitirlas en `undefined`', () => {
    const salida = proyectaCatalogoPublico({ itemId: '1' });
    expect(Object.keys(salida)).toEqual(['itemId']);
  });
});

/**
 * Las dos queries, leídas del fuente.
 *
 * No hay `convex-test` en este repo (ver tests/saleSafe.test.ts, mismo
 * criterio), y de todas formas lo que hay que impedir no es un bug de runtime:
 * es que alguien vuelva a escribir el literal a mano y le sume una columna.
 * Mientras la proyección se DERIVE de la lista blanca, no hay dónde escribirla.
 */
describe('publishedCatalog y getPublicByItem, sobre el fuente', () => {
  const FUENTE = readFileSync(
    resolve(__dirname, '..', 'convex/products.ts'),
    'utf8',
  );

  /** Recorta desde `export const <nombre>` hasta el siguiente `export const`. */
  const bloque = (nombre: string) => {
    const i = FUENTE.indexOf(`export const ${nombre}`);
    expect(i, `no se encontró ${nombre}`).toBeGreaterThan(-1);
    const resto = FUENTE.slice(i + 10);
    const j = resto.indexOf('\nexport const ');
    return j === -1 ? resto : resto.slice(0, j);
  };

  for (const nombre of ['publishedCatalog', 'getPublicByItem']) {
    it(`${nombre} deriva su respuesta de la lista blanca`, () => {
      expect(bloque(nombre), `${nombre} arma la fila a mano`).toContain(
        'proyectaCatalogoPublico',
      );
    });

    it(`${nombre} no le agrega ninguna clave de contrabando encima`, () => {
      // La lista blanca sólo sirve si nadie escribe `ubicacion: row.ubicacion`
      // DESPUÉS del spread. Se recorta el literal que sigue a la proyección y
      // se enumeran sus claves (`campo:` y también la forma corta `campo,`).
      //
      // Leer un campo reservado adentro del handler sí está permitido y es
      // necesario: las dos filtran por `row.loteId`. Lo que se prohíbe es
      // EMITIRLO.
      const cuerpo = bloque(nombre);
      const inicio = cuerpo.indexOf('...proyectaCatalogoPublico(row)');
      expect(inicio, `${nombre} no proyecta por lista blanca`).toBeGreaterThan(
        -1,
      );
      let profundidad = 1;
      let fin = inicio;
      while (fin < cuerpo.length && profundidad > 0) {
        if (cuerpo[fin] === '{') profundidad++;
        else if (cuerpo[fin] === '}') profundidad--;
        fin++;
      }
      const literal = cuerpo.slice(inicio, fin);
      const extras = [...literal.matchAll(/^\s*([A-Za-z_]\w*)\s*[,:]/gm)].map(
        (m) => m[1],
      );
      // Lo único que se puede sumar: lo DERIVADO (no vive en la fila) y la
      // procedencia que `getPublicByItem` resuelve leyendo el lote.
      expect(
        extras.filter(
          (k) => !['precioEspecial', 'mina', 'tratamiento'].includes(k),
        ),
        `${nombre} emite claves fuera de la lista blanca`,
      ).toEqual([]);
      for (const campo of CAMPOS_RESERVADOS_CATALOGO) {
        expect(extras, `${nombre} vuelve a emitir \`${campo}\``).not.toContain(
          campo,
        );
      }
    });
  }
});
