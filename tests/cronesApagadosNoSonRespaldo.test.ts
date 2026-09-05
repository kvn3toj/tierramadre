/**
 * Los crones de reconciliación están APAGADOS, y el código lo dice.
 *
 * `convex/crons.ts` registra siete crones, y tres de ellos están detrás de una
 * compuerta de entorno. Medido en producción el 2026-09-05:
 *
 *     INVENTORY_PULL_CRON = off
 *     FOTO_RECONCILE_CRON = off
 *
 * Los comentarios describían la POLÍTICA («throttled a diario», «backstop por
 * si el trigger se saltó un evento») y se leían como si describieran el ESTADO.
 * De ahí salía la suposición de que había una red debajo del Apps Script: no la
 * había. Cuando un flush fallaba, la edición no se recuperaba en «la próxima
 * corrida» porque no había próxima corrida.
 *
 * Este test no exige que estén encendidos —esa es una decisión de costo, y la
 * política de free tier del 2026-07-21 es deliberada—. Exige que el archivo
 * DIGA que pueden estar apagados, para que nadie vuelva a contarlos como
 * respaldo sin verificarlo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const crons = readFileSync('convex/crons.ts', 'utf8');

describe('los crones no se pueden dar por encendidos', () => {
  it('el archivo advierte que el pull de inventario puede estar apagado', () => {
    expect(crons).toMatch(/APAGADO EN PRODUCCIÓN/);
    expect(crons).toContain('INVENTORY_PULL_CRON');
  });

  it('nombra el comando para encenderlo, no deja adivinando', () => {
    expect(crons).toMatch(/convex env set --prod INVENTORY_PULL_CRON on/);
  });

  it('advierte que el cron usa el RIEL LEGACY, no el delta sync', () => {
    // Encenderlo no es neutro: arrastra un segundo camino de escritura sobre
    // productInventory. Quien lo encienda tiene que saberlo.
    expect(crons).toMatch(/RIEL LEGACY/);
  });
});
