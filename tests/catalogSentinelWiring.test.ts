/**
 * Fix 1C — the sentinel's WIRING, as opposed to its decision logic.
 *
 * `tests/catalogVersionSentinel.test.ts` already covers the helper: given a
 * before/after pair, does it bump? That file even has a case named "the SALE
 * case". It passed on the branch that shipped `sales.create` WITHOUT a single
 * call to `bumpCatalogVersion` — because it exercises the helper in isolation
 * and never asserts that the sale path invokes it. Apparent coverage over a
 * real hole, and the hole was the one thing Fix 1C existed to prevent: with no
 * bump, a sold stone stays "available" in every visitor's cached catalog until
 * the 5-minute TTL floor expires, which for one-of-a-kind emeralds means two
 * customers believing they can buy the same piece.
 *
 * The honest fix is a test that fails when a write path forgets — which is the
 * exact risk convex/_lib/catalogVersion.ts names in its own doc comment ("the
 * honest risk is that a future one forgets"). There is no `convex-test` harness
 * in this repo (the suite tests extracted logic, not Convex handlers), so this
 * guard is structural: any Convex module that reads `productInventory` and
 * patches an `estado` onto it is changing what `publishedCatalog` projects, and
 * must therefore reference the sentinel.
 *
 * It is deliberately coarse. It cannot prove a bump sits on the right branch —
 * only that the module knows the sentinel exists. That is enough to catch the
 * failure that actually happened (a whole file with zero calls) and cheap
 * enough to never be the reason someone deletes a test.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const CONVEX_DIR = join(__dirname, '..', 'convex');

/** Reads `productInventory` rows. */
const READS_INVENTORY = /query\(\s*['"]productInventory['"]\s*\)/;

/**
 * Patches an object literal that sets `estado`. `estado` is projected by
 * `products.publishedCatalog` and the client paints availability from it, so
 * moving it changes what the public catalog renders.
 */
const PATCHES_ESTADO = /\.patch\([^)]*?,\s*\{[^}]*?\bestado:/s;

const MENTIONS_SENTINEL = /bumpCatalogVersion/;

function convexModules(): string[] {
  return readdirSync(CONVEX_DIR).filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_'),
  );
}

describe('catalog sentinel wiring', () => {
  const offenders: string[] = [];
  const covered: string[] = [];

  for (const file of convexModules()) {
    const src = readFileSync(join(CONVEX_DIR, file), 'utf8');
    if (!READS_INVENTORY.test(src) || !PATCHES_ESTADO.test(src)) continue;
    (MENTIONS_SENTINEL.test(src) ? covered : offenders).push(file);
  }

  it('every module that moves productInventory.estado references the sentinel', () => {
    expect(offenders).toEqual([]);
  });

  it('actually inspected the modules it claims to guard', () => {
    // Guards the guard: if a refactor renames the table or the patch shape, the
    // regexes above would match nothing and this suite would pass vacuously
    // while covering literally nothing. These five are the known movers of
    // catalog-visible state as of 2026-08-19 (ghl.ts added for online payments).
    expect(covered.sort()).toEqual([
      'asesorMovements.ts',
      'ghl.ts',
      'lots.ts',
      'migrations.ts',
      'sales.ts',
    ]);
  });
});

describe('the sale path specifically', () => {
  const salesSrc = readFileSync(join(CONVEX_DIR, 'sales.ts'), 'utf8');

  it('sales.ts bumps the sentinel — the regression this file exists for', () => {
    expect(MENTIONS_SENTINEL.test(salesSrc)).toBe(true);
  });

  it('bumps on both the sale and its cancellation', () => {
    // A cancellation returns stock to DISPONIBLE; without a bump the piece
    // stays invisible until the TTL expires.
    const calls = salesSrc.match(/bumpCatalogVersion\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('guards the bump on mostrarEnCatalogo rather than firing it blindly', () => {
    // Bumping unconditionally would invalidate every visitor's catalog when an
    // UNpublished piece sells — reproducing the blow-up through another door.
    expect(salesSrc).toMatch(/mostrarEnCatalogo === true/);
  });
});
