import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Guard for the 2026-08-21 fix to `migrations:backfillPrecioFinal`.
 *
 * `precioFinalCOP` stopped being a projection of cost on 2026-07-23: the SHEET
 * owns column M and a pulled price stamps `precioFinalManual: true`
 * (convex/_lib/pricing.ts, convex/_lib/sheetPullMaps.ts). The lote re-fan was
 * taught to respect that flag — `precioFinalRefanPatch` returns `{}` — but this
 * migration was not, and it stays disparable in prod forever because
 * convex/migrations.ts ships whole (`npx convex run --prod`).
 *
 * Measured against prod on 2026-08-21, a re-run of the unguarded version would
 * have erased 8 hand-typed prices whose cost is 0 ($38.273.001, among them
 * #548 "Anillo Semilla" at $36.200.000) and reverted 352 more to
 * costoBaseCOP × 2.6 — the whole real price list back to the flat markup.
 *
 * No convex-test harness in this repo (same reasoning as
 * tests/precioFinalRefan.test.ts and tests/saleSafe.test.ts), so the branch is
 * pinned on the source: what must never come back is a loop that patches every
 * row regardless of who owns the price.
 */
describe('migrations:backfillPrecioFinal — no pisa el precio humano', () => {
  const bloque = () => {
    const root = path.resolve(__dirname, '..');
    const src = fs.readFileSync(
      path.join(root, 'convex/migrations.ts'),
      'utf8',
    );
    const i = src.indexOf('export const backfillPrecioFinal');
    expect(i, 'no se encontró backfillPrecioFinal').toBeGreaterThan(-1);
    const resto = src.slice(i + 10);
    const j = resto.indexOf('\nexport const ');
    return j === -1 ? resto : resto.slice(0, j);
  };

  it('salta las filas con precioFinalManual antes de recalcular', () => {
    const b = bloque();
    expect(b, 'la migración no consulta precioFinalManual').toContain(
      'precioFinalManual',
    );
    // El guard tiene que estar ANTES del patch, no ser una lectura decorativa.
    const iFlag = b.indexOf('row.precioFinalManual');
    const iPatch = b.indexOf('ctx.db.patch');
    expect(iFlag, 'no lee row.precioFinalManual').toBeGreaterThan(-1);
    expect(iPatch, 'no escribe — ¿cambió de forma?').toBeGreaterThan(-1);
    expect(
      iFlag,
      'el guard de precioFinalManual quedó DESPUÉS del patch',
    ).toBeLessThan(iPatch);
    expect(b, 'el guard no corta la iteración').toMatch(
      /if\s*\(\s*row\.precioFinalManual\s*\)[\s\S]{0,120}continue;/,
    );
  });

  it('reporta cuántas saltó, para que la corrida no mienta', () => {
    expect(bloque()).toContain('skippedManual');
  });
});
