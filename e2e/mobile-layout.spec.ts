/**
 * Playwright spec — mobile layout integrity across phone widths.
 *
 * Guards the regression class fixed by the global box-model reset in
 * `src/design-system/tokens/css-variables.css`: before it, the app ran
 * on `content-box` with the UA's default 8px body margin, so the
 * app-shell container in `IOSLayout.tsx` (`width:100%` + `px:2` +
 * `mx:auto`) overflowed its parent by 32px and resolved
 * `margin-right:auto` to -32px. The visible result was a catalog grid
 * shifted right and clipped at the viewport edge.
 *
 * Runs as per-viewport `describe` blocks rather than Playwright
 * projects: `playwright.config.ts` declares a single chromium project
 * with `fullyParallel:false, workers:1`, so adding projects would
 * re-run the desktop-only admin specs once per viewport for zero
 * coverage.
 */

import { test, expect, type Page } from '@playwright/test';
import { primeAdminSession, seedCatalog } from './helpers/session';

const VIEWPORTS = [
  { width: 360, height: 800, label: '360 — small Android' },
  { width: 390, height: 844, label: '390 — iPhone 14/15' },
  { width: 412, height: 915, label: '412 — Pixel' },
  { width: 430, height: 932, label: '430 — iPhone Pro Max' },
];

/** Elements allowed to exceed the viewport (none today — kept explicit). */
const OVERFLOW_ALLOWLIST: string[] = [];

/**
 * Waits until the app has actually painted.
 *
 * `domcontentloaded` is not enough: it fires before stylesheets are
 * applied, so on a cold Vite start the box-model assertions would read
 * UA defaults off an unstyled document and fail spuriously. `load`
 * guarantees CSS has landed; the `#root` check guarantees React has
 * committed something to the DOM.
 */
async function waitForAppReady(page: Page) {
  await page.waitForLoadState('load');
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return !!root && root.children.length > 0;
  });
}

/**
 * Returns the outermost elements that are VISIBLY escaping the viewport.
 *
 * Three filters keep this from crying wolf:
 *  - Outermost-only, so one over-wide container doesn't report every
 *    descendant and bury the actual cause.
 *  - Invisible elements are ignored. MUI's Switch ships a deliberately
 *    oversized `opacity:0` input as its touch target; that is not overflow.
 *  - Elements clipped by an ancestor with `overflow: hidden|clip|auto` are
 *    ignored. Decorative bleeds (the Esmereogenesis `anim-loop` glow at
 *    `EsmereogenesisCTA.tsx:247`) intentionally exceed the viewport and are
 *    clipped by <main>, which pins `overflowX:'hidden'`. What matters for
 *    those is the `mainScrollWidth <= mainClientWidth` assertion, not their
 *    raw rect.
 */
async function findOverflowingElements(page: Page, allowlist: string[]) {
  return page.evaluate((allow) => {
    const escaped: Element[] = [];
    const described: {
      tag: string;
      cls: string;
      left: number;
      right: number;
    }[] = [];

    const isInvisible = (el: Element) => {
      const s = getComputedStyle(el);
      return (
        s.visibility === 'hidden' ||
        s.display === 'none' ||
        Number(s.opacity) === 0 ||
        s.clipPath === 'inset(50%)' // MUI's visually-hidden idiom
      );
    };

    const clips = (v: string) =>
      v === 'hidden' || v === 'clip' || v === 'auto' || v === 'scroll';

    const isClippedByAncestor = (el: Element) => {
      let parent = el.parentElement;
      while (parent && parent !== document.documentElement) {
        const s = getComputedStyle(parent);
        if (clips(s.overflowX) || clips(s.overflow)) return true;
        parent = parent.parentElement;
      }
      return false;
    };

    for (const el of Array.from(document.querySelectorAll('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const cls = typeof el.className === 'string' ? el.className : '';
      if (allow.some((sel) => cls.includes(sel))) continue;

      const overflowsLeft = rect.left < -1;
      const overflowsRight = rect.right > window.innerWidth + 1;
      if (!overflowsLeft && !overflowsRight) continue;

      if (isInvisible(el)) continue;
      if (isClippedByAncestor(el)) continue;

      // Skip if an already-recorded ancestor explains this one.
      if (escaped.some((ancestor) => ancestor.contains(el))) continue;

      escaped.push(el);
      described.push({
        tag: el.tagName.toLowerCase(),
        cls: cls.slice(0, 80),
        left: Math.round(rect.left * 10) / 10,
        right: Math.round(rect.right * 10) / 10,
      });
    }

    return described;
  }, allowlist);
}

for (const vp of VIEWPORTS) {
  test.describe(`mobile layout @ ${vp.label}`, () => {
    test.use({
      viewport: { width: vp.width, height: vp.height },
      isMobile: true,
      hasTouch: true,
    });

    test.beforeEach(async ({ page }) => {
      await primeAdminSession(page);
      await seedCatalog(page);
    });

    test('the box-model reset is in effect', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);

      const box = await page.evaluate(() => ({
        html: getComputedStyle(document.documentElement).boxSizing,
        body: getComputedStyle(document.body).boxSizing,
        bodyMargin: getComputedStyle(document.body).margin,
        bodyX: document.body.getBoundingClientRect().x,
        bodyWidth: document.body.getBoundingClientRect().width,
        innerWidth: window.innerWidth,
      }));

      expect(box.html).toBe('border-box');
      expect(box.body).toBe('border-box');
      expect(box.bodyMargin).toBe('0px');
      // The 8px UA margin used to offset the whole app and shrink it by 16px.
      expect(box.bodyX).toBe(0);
      expect(box.bodyWidth).toBe(box.innerWidth);
    });

    for (const route of ['/treasure', '/product/401']) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        await page.goto(route);
        await waitForAppReady(page);
        // Let the virtualized grid settle before measuring.
        await page.waitForTimeout(1_500);

        // Anchor on real content BEFORE asserting the negative. An empty
        // grid trivially "has no overflow", so without this the sweep
        // would go green while rendering nothing at all.
        await expect(
          page.getByText('Cargando tesoros', { exact: false }),
        ).toHaveCount(0);

        const metrics = await page.evaluate(() => {
          const main = document.getElementById('main-content');
          return {
            innerWidth: window.innerWidth,
            docScrollWidth: document.documentElement.scrollWidth,
            bodyScrollWidth: document.body.scrollWidth,
            mainScrollWidth: main?.scrollWidth ?? null,
            mainClientWidth: main?.clientWidth ?? null,
          };
        });

        expect(metrics.docScrollWidth).toBeLessThanOrEqual(
          metrics.innerWidth + 1,
        );
        expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(
          metrics.innerWidth + 1,
        );

        // `IOSLayout.tsx` pins `overflowX:'hidden'` on <main>, which hides
        // horizontal overflow from documentElement.scrollWidth. Without
        // this assertion the spec goes green on a visibly broken layout.
        if (
          metrics.mainScrollWidth !== null &&
          metrics.mainClientWidth !== null
        ) {
          expect(metrics.mainScrollWidth).toBeLessThanOrEqual(
            metrics.mainClientWidth + 1,
          );
        }

        const overflowing = await findOverflowingElements(
          page,
          OVERFLOW_ALLOWLIST,
        );
        expect(
          overflowing,
          `Elements escaping the ${vp.width}px viewport:\n${JSON.stringify(overflowing, null, 2)}`,
        ).toEqual([]);
      });
    }

    test('/treasure gutters are symmetric', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      const gutters = await page.evaluate(() => {
        const main = document.getElementById('main-content');
        const container = main?.firstElementChild;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        const style = getComputedStyle(container);
        return {
          left: rect.x,
          right: window.innerWidth - rect.right,
          marginRight: style.marginRight,
          boxSizing: style.boxSizing,
        };
      });

      test.skip(gutters === null, 'app shell container not rendered');
      if (!gutters) return;

      expect(gutters.boxSizing).toBe('border-box');
      // Used to compute as -32px, which is what pushed the grid right.
      expect(gutters.marginRight).toBe('0px');
      expect(Math.abs(gutters.left - gutters.right)).toBeLessThanOrEqual(1);
    });

    test('no piece renders a 0.00 ct weight', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // Positive anchor first: prove the fixture actually rendered, so a
      // virtualized-away or empty grid cannot satisfy the absence check.
      await expect(
        page.getByText('Cargando tesoros', { exact: false }),
      ).toHaveCount(0);
      await expect(page.getByText(/ct\b/).first()).toBeVisible();

      // The fixture seeds joyas with peso: 0 (item 400, 404, ...), which
      // used to render "Gema · 0.00 ct" on the default catalog card.
      await expect(page.getByText(/0[.,]00\s*ct/i)).toHaveCount(0);
    });

    test('the tab bar sits fully inside the viewport', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // Matched by tag, not by aria-label: the label is localized
      // ("Navegación principal" in the default Spanish locale), so an
      // English-literal selector silently matches nothing and the test
      // skips itself into meaninglessness. NOTE: the CSS in
      // css-variables.css keyed on `nav[aria-label='Primary navigation']`
      // has exactly that bug and is dead for Spanish users.
      const nav = page.locator('nav');
      await expect(nav).toHaveCount(1);

      const box = await nav.first().boundingBox();
      expect(box).not.toBeNull();
      if (!box) return;

      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
    });
  });
}
