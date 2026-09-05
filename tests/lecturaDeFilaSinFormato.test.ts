/**
 * La fila que se lee para CONSERVARLA no puede leerse formateada.
 *
 * `admin-product-update` y `admin-table-update` localizan la fila, la leen
 * entera, pisan sólo los campos del payload y reescriben TODO lo demás tal cual
 * salió. Ese viaje de ida y vuelta es el que obliga: si la lectura devuelve lo
 * que se VE en vez de lo que HAY, el formato de pantalla se convierte en el
 * dato guardado.
 *
 * El default de la API de Sheets es `FORMATTED_VALUE`, así que omitir el
 * parámetro basta para provocarlo. Medido el 2026-09-05 sobre las 576 filas del
 * SOT: **3631 celdas** salían distintas de como estaban y **1039 numéricas** no
 * volvían al mismo valor.
 *
 *   · `preponderancia` 0.1785 se leía "17.9%" y volvía 0.179 — 41 filas. Es el
 *     campo que convex/products.ts omite del payload justo para no pisar esa
 *     celda: la guarda preservaba la celda y esta lectura la degradaba igual.
 *   · `costoBaseCOP` perdía decimales en 55 filas.
 *   · Un cero con formato contable se leía "-" y volvía como el TEXTO "-".
 *     Le pasó a #483 y #484 en `Costo lote (fórmula)` ese mismo día.
 *
 * Que no fuera peor fue SUERTE: la hoja está en `es_MX`, que usa punto decimal,
 * así que "244,231" vuelve a ser 244231. En `es_CO` o `es_ES` esa misma cadena
 * vale 244,231 — cada costo dividido por mil, en cada push. Un cambio de idioma
 * de la hoja, hecho por cualquiera y sin tocar el repo, bastaba.
 *
 * Por eso la regla se prueba sobre el fuente y no sobre el locale de hoy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { preservar } from '../api/admin-product-update';

/** Los dos endpoints que leen una fila y la vuelven a escribir. */
const IDA_Y_VUELTA = [
  'api/admin-product-update.ts',
  'api/admin-table-update.ts',
];

describe('la lectura de ida y vuelta pide el valor sin formato', () => {
  it.each(IDA_Y_VUELTA)('%s lee la fila con UNFORMATTED_VALUE', (ruta) => {
    const fuente = readFileSync(ruta, 'utf8');

    // La asignación que alimenta el merge. Si cambia de nombre, esta prueba
    // falla en vez de pasar por vacío — que es lo que se quiere.
    const asignacion = fuente.indexOf('existingRow = existing.data.values');
    expect(
      asignacion,
      `no se encontró la lectura de la fila en ${ruta}; si se renombró, ` +
        `actualizá esta prueba en vez de borrarla`,
    ).toBeGreaterThan(0);

    // El `values.get({ … })` inmediatamente anterior es el que la produce.
    const apertura = fuente.lastIndexOf('values.get({', asignacion);
    expect(apertura).toBeGreaterThan(0);
    const llamada = fuente.slice(apertura, asignacion);

    expect(
      llamada.includes("valueRenderOption: 'UNFORMATTED_VALUE'"),
      `${ruta} lee la fila SIN valueRenderOption, así que la API la devuelve ` +
        `FORMATEADA y el push guarda el formato de pantalla como dato. ` +
        `Agregá  valueRenderOption: 'UNFORMATTED_VALUE'  a esa llamada.`,
    ).toBe(true);
  });

  it.each(IDA_Y_VUELTA)(
    '%s no vuelve a tipar la fila como string[]',
    (ruta) => {
      const fuente = readFileSync(ruta, 'utf8');
      // Sin formato, la API devuelve números y booleanos de verdad. Tiparlos
      // como string[] no cambia el runtime, pero esconde que `merged` recibe
      // valores que NO son cadenas y hace pensar que `s()` es decorativo.
      expect(
        /existingRow:\s*string\[\]/.test(fuente),
        `${ruta} declara existingRow como string[]; con UNFORMATTED_VALUE ` +
          `las celdas numéricas llegan como number. Usá unknown[].`,
      ).toBe(false);
    },
  );

  it.each(IDA_Y_VUELTA)(
    '%s conserva las celdas intactas con preservar(), no con s()',
    (ruta) => {
      const fuente = readFileSync(ruta, 'utf8');
      // `s(existingRow[i])` convierte 0.1785 en la cadena "0.1785", y
      // USER_ENTERED la parsea contra el idioma de la hoja. Leer sin formato
      // sin esto arregla media vuelta y deja la otra media rota.
      expect(
        /merged\[i\]\s*=\s*s\(existingRow/.test(fuente),
        `${ruta} conserva la celda con s(), que la convierte en texto y la ` +
          `deja a merced del locale al reescribirla. Usá preservar().`,
      ).toBe(false);
      expect(
        /merged\[i\]\s*=\s*preservar\(existingRow/.test(fuente),
        `${ruta} debería conservar las celdas intactas con preservar()`,
      ).toBe(true);
    },
  );
});

/**
 * La otra mitad del arreglo. Leer sin formato trae 0.1785 en vez de "17.9%",
 * pero si esa celda se escribe como la CADENA "0.1785", `USER_ENTERED` la
 * vuelve a parsear contra el idioma de la hoja y el locale reaparece por la
 * puerta de atrás. Devolver el número tal cual no pasa por ningún parser.
 */
describe('preservar deja los números como números', () => {
  it('un número intacto sigue siendo número, no texto', () => {
    for (const n of [244231, 0.1785, 0, -5, 107692.30769230769, 45961]) {
      expect(preservar(n)).toBe(n);
      expect(typeof preservar(n)).toBe('number');
    }
  });

  it('el cero se conserva — nunca se convierte en celda vacía', () => {
    // Un `|| ''` acá borraría todo saldo en cero. Es el mismo error que
    // `coerceCell('num','')` ya tiene documentado en CLAUDE.md.
    expect(preservar(0)).toBe(0);
    expect(preservar(0)).not.toBe('');
  });

  it('el texto sigue siendo texto y el vacío sigue vacío', () => {
    expect(preservar('DISPONIBLE')).toBe('DISPONIBLE');
    expect(preservar('')).toBe('');
    expect(preservar(null)).toBe('');
    expect(preservar(undefined)).toBe('');
  });

  it('un booleano se escribe como TRUE/FALSE legible por la hoja', () => {
    expect(preservar(false)).toBe('false');
    expect(preservar(true)).toBe('true');
  });

  it('NaN e Infinity no viajan como números a la hoja', () => {
    // `values.update` rechaza un JSON con NaN/Infinity: se degradan a texto.
    expect(typeof preservar(NaN)).toBe('string');
    expect(typeof preservar(Infinity)).toBe('string');
  });
});
