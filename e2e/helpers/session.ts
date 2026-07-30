/**
 * Shared e2e session priming.
 *
 * Extracted from `admin-products.spec.ts` so the layout sweep can reuse
 * the same auth bootstrap. Everything here must run BEFORE the app's
 * bootstrap in `main.tsx` reads storage or fires `/api/validate`, so
 * callers invoke it in `beforeEach`, ahead of any `page.goto`.
 */

import type { Page } from '@playwright/test';

export const ADMIN_USER = {
  id: 'playwright-admin',
  email: 'playwright@tierramadre.test',
  name: 'Playwright Admin',
  givenName: 'Playwright',
  familyName: 'Admin',
  picture: '',
  role: 'admin',
  accessLevel: 'admin',
};

/**
 * Deterministic catalog fixture.
 *
 * Three shapes matter, and each exists on purpose:
 *
 *  - UNWEIGHED GEM (`isJewelry: false`, `peso: 0`) — the ONLY shape that
 *    reproduced "Gema · 0.00 ct". The old catalog branch checked just
 *    `typeof peso === 'number'`, so a gem with 0 fell straight into
 *    `formatCarats(0)`. A joya does NOT reproduce it: it takes the metal
 *    branch. Remove this shape and the regression test passes vacuously.
 *  - JOYA (`isJewelry: true`, `metalType` set) — must show its metal.
 *  - WEIGHED GEM — a real carat weight, so the spec can assert a positive
 *    match before asserting an absence.
 */
export const CATALOG_FIXTURE = Array.from({ length: 24 }, (_, i) => {
  const isJewelry = i % 4 === 0;
  // Every 4th non-joya is an unweighed gem — the 0.00 ct reproducer.
  const isUnweighedGem = !isJewelry && i % 4 === 1;
  return {
    item: String(400 + i),
    nombre: isJewelry
      ? `Joya ${400 + i}`
      : isUnweighedGem
        ? `Insumo ${400 + i}`
        : `Esmeralda ${400 + i}`,
    peso: isJewelry || isUnweighedGem ? 0 : Number((2.4 + i * 0.13).toFixed(2)),
    precioCOP: 1_500_000 + i * 25_000,
    categoria: isJewelry ? 'Joya' : 'Gema',
    color: ['Verde', 'Aguamarina', 'Azul', 'Chivor'][i % 4],
    calidad: i % 3 === 0 ? 'C. SuperFina' : 'F2',
    talla: 'Esmeralda',
    procedencia: 'MUZO',
    estado: 'DISPONIBLE',
    cantidad: i % 7 === 0 ? 12 : 1,
    isJewelry,
    metalType: isJewelry ? 'Plata' : '',
  };
});

const CACHE_KEY = 'tierramadre-treasure-sheets-cache';

/**
 * Seeds an authenticated admin session plus a synchronous catalog cache,
 * and stubs the API surface the catalog touches.
 *
 * The catalog seed matters for determinism: `useSheetsTreasure`
 * initializes its state synchronously from this localStorage key and
 * skips the network entirely while the entry is fresh, so the grid
 * renders without a single API round-trip.
 */
export async function primeAdminSession(page: Page) {
  await page.addInitScript(
    ({ adminUser, products, cacheKey }) => {
      try {
        window.localStorage.setItem(
          'tierramadre-google-user',
          JSON.stringify(adminUser),
        );
        window.sessionStorage.setItem(
          'tierra-madre-auth',
          JSON.stringify({ isAuthenticated: true, accessLevel: 'admin' }),
        );
        // Skip the 4s SplashScreen (App.tsx checks `tm_session_active`
        // before showing it). Without this, the splash burns the test
        // timeout before any content renders.
        window.sessionStorage.setItem('tm_session_active', 'true');
        window.localStorage.setItem('tm_last_activity', String(Date.now()));
      } catch {
        // Ignore quota or access errors — the mock falls through and the
        // test fails visibly on the auth gate instead of silently.
      }
    },
    { adminUser: ADMIN_USER },
  );

  const json =
    (body: unknown) => async (route: import('@playwright/test').Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    };

  await page.route(
    '**/api/validate*',
    json({
      success: true,
      isAuthorized: true,
      user: {
        email: ADMIN_USER.email,
        name: ADMIN_USER.name,
        role: 'admin',
        accessLevel: 'admin',
      },
    }),
  );
  await page.route(
    '**/api/get-drive-images*',
    json({ success: true, folderId: null, images: [] }),
  );
  await page.route(
    '**/api/get-batch-thumbnails*',
    json({ success: true, thumbnails: {} }),
  );
  await page.route('**/api/health*', json({ ok: true }));
}

/**
 * Seeds a deterministic catalog so the treasure grid renders without a
 * network round-trip.
 *
 * `useSheetsTreasure` initializes its state synchronously from this
 * localStorage key (`getCachedData`, useSheetsTreasure.ts:60) and skips
 * the background refetch while the entry is inside its 5-minute TTL, so
 * the grid paints on first frame with zero flake.
 *
 * Kept separate from `primeAdminSession` so specs that don't render a
 * catalog (e.g. `admin-products.spec.ts`, which drives the Convex stub)
 * are not handed inventory they never asked for.
 */
export async function seedCatalog(page: Page) {
  await page.addInitScript(
    ({ products, cacheKey }) => {
      try {
        window.localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: products, timestamp: Date.now() }),
        );
      } catch {
        // Ignore quota errors — the route stub below still serves the data.
      }
    },
    { products: CATALOG_FIXTURE, cacheKey: CACHE_KEY },
  );

  const json =
    (body: unknown) => async (route: import('@playwright/test').Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    };

  await page.route(
    '**/api/get-treasure-sheets*',
    json({ success: true, data: CATALOG_FIXTURE }),
  );
  await page.route('**/api/product-views*', json({ success: true, views: {} }));
}
