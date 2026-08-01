/**
 * El contrato del drenaje híbrido.
 *
 * Dos pisos, y cada uno resuelve lo que el otro no puede:
 *
 *  - **Por evento** (`runAfter(0)` desde cada mutación que encola): el espejo se
 *    pone al día al instante y el costo es proporcional a los eventos reales.
 *    No sirve si el proceso agendado muere o Sheets está caído.
 *  - **Cron de rescate** cada 30 min: recoge lo atascado. No puede ser el motor
 *    principal —un barrido periódico es lo que apagó los crons de v3—, así que
 *    sale apagado por flag.
 *
 * Estos tests leen los archivos reales: lo que puede regresar en silencio no es
 * la lógica, es que alguien agregue una encolada nueva y se olvide de agendar el
 * drenaje. Esa fila se quedaría en la cola hasta que el cron la encuentre — y el
 * cron está apagado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const raiz = join(__dirname, '..');
const leer = (rel: string) => readFileSync(join(raiz, rel), 'utf8');

const CONVEX = [
  'convex/lotsV4.ts',
  'convex/casillas.ts',
  'convex/movimientos.ts',
];

describe('toda encolada agenda su drenaje', () => {
  for (const archivo of CONVEX) {
    it(`${archivo} agenda el drenaje tantas veces como encola`, () => {
      const fuente = leer(archivo);
      const encoladas = (fuente.match(/ctx\.db\.insert\('espejoOutbox'/g) ?? [])
        .length;
      const agendas = (
        fuente.match(
          /ctx\.scheduler\.runAfter\(0, internal\.espejo\.drenar/g,
        ) ?? []
      ).length;

      expect(encoladas).toBeGreaterThan(0);
      // No exige 1:1 — `movimientos` encola N casillas + 1 movimiento y agenda
      // UNA vez, porque el drenaje toma la cola entera. Lo que no puede pasar es
      // encolar sin agendar nada.
      expect(agendas).toBeGreaterThan(0);
    });
  }
});

describe('el cron de rescate', () => {
  const crons = leer('convex/crons.ts');
  const espejo = leer('convex/espejo.ts');

  it('está registrado cada 30 minutos', () => {
    expect(crons).toMatch(/rescate del espejo v4/);
    expect(crons).toMatch(/minutes: 30/);
    expect(crons).toMatch(/internal\.espejo\.rescatar/);
  });

  it('sale APAGADO salvo que ESPEJO_CRON esté en "on"', () => {
    // El idioma del repo: `INVENTORY_PULL_CRON` y `FOTO_RECONCILE_CRON` hacen lo
    // mismo. Un cron que sale encendido es cómo se vuelve a gastar el ancho de
    // banda que apagó los crons de v3.
    expect(espejo).toMatch(/process\.env\.ESPEJO_CRON !== 'on'/);
  });

  it('el rescate no reimplementa el drenaje: llama al mismo', () => {
    const bloque = espejo.slice(espejo.indexOf('export const rescatar'));
    expect(bloque).toMatch(/internal\.espejo\.drenar/);
  });
});

describe('el fallo no revienta la mutación de origen', () => {
  const espejo = leer('convex/espejo.ts');

  it('el drenaje atrapa el error por fila y sigue con las demás', () => {
    // Convex es la verdad; la hoja es una vista. Una fila que no se puede
    // escribir no puede tumbar a las otras 24 del lote.
    const bloque = espejo.slice(espejo.indexOf('export const drenar'));
    expect(bloque).toMatch(/try \{/);
    expect(bloque).toMatch(/catch \(err\)/);
    expect(bloque).toMatch(/_marcarError/);
  });

  it('el error incrementa intentos en vez de perder la fila', () => {
    // La cuenta se lleva; lo que cambia con el tope es a dónde va la fila
    // cuando se agota (ver `tests/espejoCola.test.ts`).
    expect(espejo).toMatch(/const nuevos = intentos \+ 1/);
    expect(espejo).toMatch(/intentos: nuevos/);
  });
});
