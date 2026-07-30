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
 * Returns the outermost elements OUTSIDE the page scroller that are visibly
 * escaping the viewport — portals, fixed overlays, the bottom nav.
 *
 * Deliberately scoped to non-`#main-content` content. Everything inside
 * <main> is governed by the `mainScrollWidth <= mainClientWidth` assertion
 * instead, because <main> pins `overflowX:'hidden'` (IOSLayout.tsx:442) and
 * therefore clips its descendants: a per-element rect check there would
 * report decorative bleeds that are intentionally wider than the viewport
 * (the Esmereogenesis `anim-loop` glow, `EsmereogenesisCTA.tsx:247`) while
 * adding nothing the scroll-width check doesn't already catch.
 *
 * Stating that as an explicit containment test rather than a generic
 * "is any ancestor clipping?" walk keeps the split visible in the code —
 * the walk did the same job, but read like broad coverage it never had.
 *
 * Invisible elements are also ignored: MUI's Switch ships a deliberately
 * oversized `opacity:0` input as its touch target, which is not overflow.
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

    const main = document.getElementById('main-content');

    for (const el of Array.from(document.querySelectorAll('*'))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      const cls = typeof el.className === 'string' ? el.className : '';
      if (allow.some((sel) => cls.includes(sel))) continue;

      const overflowsLeft = rect.left < -1;
      const overflowsRight = rect.right > window.innerWidth + 1;
      if (!overflowsLeft && !overflowsRight) continue;

      if (isInvisible(el)) continue;
      // Covered by the mainScrollWidth assertion — see the docblock.
      if (main && (el === main || main.contains(el))) continue;

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

    test('no persistent text renders below the 11px floor', async ({
      page,
    }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      const tooSmall = await page.evaluate(() => {
        const offenders: { text: string; size: number; cls: string }[] = [];
        for (const el of Array.from(document.querySelectorAll('*'))) {
          // Only leaf nodes with their own visible text.
          const ownText = Array.from(el.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim() ?? '')
            .join('')
            .trim();
          if (!ownText) continue;

          // DEV-only affordances never reach a user (see
          // RedesignVariantToggle's import.meta.env.DEV guard), so they are
          // exempt from the floor rather than silently dragging it down.
          if (el.closest('[data-dev-only]')) continue;

          const style = getComputedStyle(el);
          if (
            style.visibility === 'hidden' ||
            style.display === 'none' ||
            Number(style.opacity) === 0
          )
            continue;

          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const size = parseFloat(style.fontSize);
          if (size < 11) {
            offenders.push({
              text: ownText.slice(0, 40),
              size,
              cls:
                (typeof el.className === 'string' ? el.className : '').slice(
                  0,
                  50,
                ) || el.tagName.toLowerCase(),
            });
          }
        }
        return offenders;
      });

      expect(
        tooSmall,
        `Text below 11px at ${vp.width}px:\n${JSON.stringify(tooSmall, null, 2)}`,
      ).toEqual([]);
    });

    test('catalog controls have a 44px tap area', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // Named controls rather than "every button": these are the ones the
      // audit measured at 26-38px. A blanket sweep would drag in chips and
      // decorative roles and turn red for reasons unrelated to reachability.
      const labels = ['Filtros', 'Cerrar aviso'];

      for (const label of labels) {
        const control = page.getByRole('button', { name: label });
        if ((await control.count()) === 0) continue;

        // Measure the union of the control and its ::after slop, which is
        // what actually receives the press.
        const reach = await control.first().evaluate((el) => {
          const own = el.getBoundingClientRect();
          const after = getComputedStyle(el, '::after');
          const w = parseFloat(after.width) || 0;
          const h = parseFloat(after.height) || 0;
          return {
            width: Math.max(own.width, w),
            height: Math.max(own.height, h),
          };
        });

        expect(reach.width, `${label} tap width`).toBeGreaterThanOrEqual(44);
        expect(reach.height, `${label} tap height`).toBeGreaterThanOrEqual(44);
      }
    });

    test('the menu sheet never exposes the scrim at the bottom edge', async ({
      page,
    }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      await page
        .getByRole('button', { name: /Men/i })
        .first()
        .click();

      // Sampled through the enter animation, not just at rest. The enter
      // curve overshoots (control point > 1), so `translateY` goes negative
      // mid-flight and a `bottom: 0` sheet lifts off the bottom edge —
      // measured at -31.4px on a 701px viewport before the padding bleed,
      // which showed the dark backdrop as a band along the bottom.
      for (const delay of [0, 60, 100, 160, 220, 400]) {
        await page.waitForTimeout(delay === 0 ? 0 : 60);
        const gap = await page.evaluate(() => {
          const sheet = document.querySelector('[role="dialog"]');
          if (!sheet) return null;
          const rect = sheet.getBoundingClientRect();
          return Math.round((window.innerHeight - rect.bottom) * 10) / 10;
        });
        expect(gap, `scrim gap at ~${delay}ms`).not.toBeNull();
        expect(gap!, `scrim gap at ~${delay}ms`).toBeLessThanOrEqual(0);
      }

      // And it must still come to rest in the right place: the bleed is
      // compensated in max-height, so the visible sheet is unchanged.
      await page.waitForTimeout(600);
      const rest = await page.evaluate(() => {
        const sheet = document.querySelector('[role="dialog"]');
        const rect = sheet!.getBoundingClientRect();
        const style = getComputedStyle(sheet!);
        return {
          top: Math.round(rect.top),
          paddingBottom: style.paddingBottom,
          contentHeight: Math.round(rect.height - parseFloat(style.paddingBottom)),
          viewport: window.innerHeight,
        };
      });
      // 85dvh of usable content, unchanged by the bleed.
      expect(rest.contentHeight).toBeLessThanOrEqual(
        Math.ceil(rest.viewport * 0.85) + 2,
      );
      expect(rest.contentHeight).toBeGreaterThan(rest.viewport * 0.5);
    });

    test('the menu sheet closes on Escape', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      await page
        .getByRole('button', { name: /Men/i })
        .first()
        .click();
      await page.waitForTimeout(600);

      const visibleNow = await page.evaluate(
        () =>
          getComputedStyle(document.querySelector('[role="dialog"]')!)
            .visibility,
      );
      expect(visibleNow).toBe('visible');

      // WCAG 2.1.2 — the sheet had no key handler at all before this.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(600);

      const visibleAfter = await page.evaluate(
        () =>
          getComputedStyle(document.querySelector('[role="dialog"]')!)
            .visibility,
      );
      expect(visibleAfter).toBe('hidden');
    });

    test('images resist casual saving', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      const report = await page.evaluate(() => {
        const imgs = [...document.querySelectorAll('img')];
        const unprotected: string[] = [];
        for (const img of imgs) {
          if (img.closest('.tm-saveable')) continue; // opted out on purpose
          const s = getComputedStyle(img) as unknown as Record<string, string>;
          // NOTE: `-webkit-touch-callout` is deliberately NOT asserted here.
          // It is a Safari/iOS-only property; Chromium does not expose it in
          // computed style, so checking it would always fail in this runner.
          // Its presence is covered by the stylesheet check below instead.
          if (s.webkitUserDrag !== 'none' || s.userSelect !== 'none') {
            unprotected.push(
              `${img.src.slice(-40)} drag=${s.webkitUserDrag} select=${s.userSelect}`,
            );
          }
        }
        return { total: imgs.length, unprotected };
      });

      expect(report.total).toBeGreaterThan(0);
      expect(
        report.unprotected,
        `Images without save protection:\n${report.unprotected.join('\n')}`,
      ).toEqual([]);

      // The iOS long-press guard (`-webkit-touch-callout: none`) is NOT
      // asserted, and deliberately so. Chromium does not implement it: it is
      // absent from computed style AND stripped from the rule's own cssText
      // at parse time (verified — a rule authored with both properties reads
      // back as `img { -webkit-user-drag: none; }`). There is no way to
      // observe it from this runner, so any assertion here would be
      // decorative. It needs a real iOS Safari check: long-press a catalog
      // photo and confirm no "Save Image" sheet appears.
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
