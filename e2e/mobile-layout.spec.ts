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
import {
  AMBASSADOR,
  primeAdminSession,
  seedAmbassador,
  seedCatalog,
} from './helpers/session';

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
      await seedAmbassador(page);
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

    // The sweep only protects surfaces it VISITS. The ambassador category
    // list proved that the hard way: it shipped a 455px-wide card inside a
    // 358px container for as long as it existed, invisible to this file
    // because no case ever navigated there. Add routes here, not comments.
    const OVERFLOW_ROUTES: { path: string; anchor?: RegExp }[] = [
      { path: '/treasure' },
      { path: '/product/401' },
      { path: `/ambassadors/${AMBASSADOR.slug}/c/joyas`, anchor: /Collar/ },
    ];

    for (const { path: route, anchor } of OVERFLOW_ROUTES) {
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
        // Routes whose loader text is not "Cargando tesoros" pin their own
        // positive anchor, so an empty render cannot pass the negative below.
        if (anchor) await expect(page.getByText(anchor).first()).toBeVisible();

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

    test('the ambassador catalog never leaks the custody field', async ({
      page,
    }) => {
      await page.goto(`/ambassadors/${AMBASSADOR.slug}/c/joyas`);
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // Positive anchor first — an empty list satisfies any absence check.
      await expect(page.getByText(/Collar/).first()).toBeVisible();

      // `ubicacion` is internal custody, not product information. Verified
      // read-only across all three inventory books: its entire domain is
      // ASESOR · OFI.CALI · OFI.BOGOTA · EMBAJADOR · RETORNADO. The card
      // used to print it under every product name, so a client browsing an
      // ambassador's catalog read "EMBAJADOR" as if it were a spec.
      await expect(page.getByText(/^\s*(EMBAJADOR|ASESOR|OFI\.)/)).toHaveCount(
        0,
      );
    });

    test('the ambassador detail shows the MINE as Origen', async ({ page }) => {
      await page.goto(`/ambassadors/${AMBASSADOR.slug}/product/400`);
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // The Origen cell read `ubicacion`, so it told clients
      // "Origen: OFI.CALI". The mine lives in `procedencia`.
      const origenLabel = page.getByText('Origen', { exact: true }).first();
      await expect(origenLabel).toBeVisible();
      await expect(
        origenLabel.locator('xpath=following-sibling::*[1]'),
      ).toHaveText('MUZO');
    });

    test('the ambassador detail hides Origen when there is no mine', async ({
      page,
    }) => {
      // Item 401 has no `procedencia` — the COMMON case in production, where
      // the legacy book has no such column at all and SOT v3 fills 89 of 513.
      // Before this guard the cell rendered a bare "-" for every item; the
      // suite went green only because the fixture gave every row a mine.
      await page.goto(`/ambassadors/${AMBASSADOR.slug}/product/401`);
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // Positive anchor: the spec grid rendered, so this is a real absence
      // and not an unmounted page.
      await expect(page.getByText('Calidad', { exact: true })).toBeVisible();
      await expect(page.getByText('Origen', { exact: true })).toHaveCount(0);
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
      const labels = ['Filtros', 'Cerrar aviso', 'Seleccionar varias piezas'];

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

    /**
     * Selección múltiple para compartir una vitrina (TM-VITRINA-MULTISEL).
     *
     * Lo que este test protege es el minuto que la iniciativa vino a borrar:
     * curar varias piezas SIN salir del catálogo. Por eso las dos aserciones
     * de URL no son decoración — si el toque de una tarjeta navegara, o si el
     * gesto de atrás sacara de la página, el asesor perdería la curaduría y la
     * posición de scroll de golpe, que es exactamente el flujo viejo.
     */
    test('el modo selección cura sin salir del catálogo', async ({ page }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      // Ancla positiva ANTES de cualquier negativa: una grilla vacía pasaría
      // "no navegó" sin haber renderizado una sola pieza.
      await expect(page.getByRole('article').first()).toBeVisible();

      await page
        .getByRole('button', { name: 'Seleccionar varias piezas' })
        .click();

      const casillas = page.getByRole('checkbox');
      await expect(casillas.first()).toBeVisible();
      await casillas.nth(0).click();
      await casillas.nth(1).click();

      await expect(page.getByText('2 piezas seleccionadas')).toBeVisible();
      // El toque alternó; no navegó.
      expect(new URL(page.url()).pathname).toBe('/treasure');

      // Compartir existe y está habilitado con piezas dentro. NO se acuña acá:
      // el diálogo pega contra /api/vitrina, y este spec es de layout.
      await expect(
        page.getByRole('button', { name: /Compartir/ }),
      ).toBeEnabled();

      // El gesto de atrás cierra el modo y DEJA al asesor en el catálogo.
      await page.goBack();
      await expect(page.getByRole('checkbox')).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe('/treasure');
      await expect(
        page.getByRole('button', { name: 'Seleccionar varias piezas' }),
      ).toBeVisible();
    });

    test('la barra de selección no tapa la última fila de la grilla', async ({
      page,
    }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      await page
        .getByRole('button', { name: 'Seleccionar varias piezas' })
        .click();
      await page.getByRole('checkbox').first().click();

      const barra = page.getByRole('region', {
        name: 'Piezas seleccionadas para compartir',
      });
      await expect(barra).toBeVisible();

      const caja = await barra.boundingBox();
      expect(caja).not.toBeNull();
      // Dentro del viewport: una barra fija que se sale por abajo es una barra
      // cuyos botones no se pueden presionar.
      expect(caja!.y + caja!.height).toBeLessThanOrEqual(vp.height + 1);
      expect(caja!.y).toBeGreaterThan(0);
      // 44px de alcance por botón (DS3 §6.3).
      for (const nombre of ['Limpiar', 'Compartir', 'Listo']) {
        const b = await barra
          .getByRole('button', { name: new RegExp(nombre) })
          .boundingBox();
        expect(b, `${nombre} sin caja`).not.toBeNull();
        expect(b!.height, `${nombre} alto`).toBeGreaterThanOrEqual(44);
      }
    });

    test('the menu sheet never exposes the scrim at the bottom edge', async ({
      page,
    }) => {
      await page.goto('/treasure');
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      await page.getByRole('button', { name: /Men/i }).first().click();

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
          contentHeight: Math.round(
            rect.height - parseFloat(style.paddingBottom),
          ),
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

      await page.getByRole('button', { name: /Men/i }).first().click();
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

/**
 * Desktop regression for the shared-root fixes.
 *
 * P0.1's acceptance criteria asked for a desktop pass, and the spec claimed
 * the mobile sweep covered it. It did not: every `describe` above pins a
 * phone viewport, so a desktop-only regression in the global box-model reset
 * would have shipped green. RC-A/RC-B live in `css-variables.css` at document
 * scope — they are not mobile-only code, and the spec's own Non-Goals allow
 * shared-root fixes to touch desktop *provided they are regression-checked
 * there*. This is that check.
 *
 * Deliberately a subset: the phone blocks assert things that are meaningless
 * or actively different at 1280 (bottom tab bar geometry, sheet anchoring,
 * 44px touch targets). Only the shared-root invariants belong here.
 */
test.describe('desktop regression @ 1280×800', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
  });

  test.beforeEach(async ({ page }) => {
    await primeAdminSession(page);
    await seedCatalog(page);
    await seedAmbassador(page);
  });

  test('the box-model reset holds at desktop width', async ({ page }) => {
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
    expect(box.bodyX).toBe(0);
    expect(box.bodyWidth).toBe(box.innerWidth);
  });

  for (const route of ['/treasure', '/product/401']) {
    test(`${route} has no horizontal overflow at desktop`, async ({ page }) => {
      await page.goto(route);
      await waitForAppReady(page);
      await page.waitForTimeout(1_500);

      await expect(
        page.getByText('Cargando tesoros', { exact: false }),
      ).toHaveCount(0);

      const metrics = await page.evaluate(() => {
        const main = document.getElementById('main-content');
        return {
          innerWidth: window.innerWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          mainScrollWidth: main?.scrollWidth ?? null,
          mainClientWidth: main?.clientWidth ?? null,
        };
      });

      expect(metrics.docScrollWidth).toBeLessThanOrEqual(
        metrics.innerWidth + 1,
      );
      // <main> clips rather than scrolls, so this is the assertion that can
      // actually see content wider than its container (see P0.6).
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
        `Elements escaping the 1280px viewport:\n${JSON.stringify(overflowing, null, 2)}`,
      ).toEqual([]);
    });
  }

  /**
   * The `[data-foto-admin]` coexistence check (P0.1 AC #4).
   *
   * WHAT THIS COVERS: that the global reset and the Fotosíntesis scoped patch
   * do not fight. `css-variables.css` sets `html { border-box }` +
   * `*,::before,::after { box-sizing: inherit }` globally, while
   * `[data-foto-admin] input|textarea|select` separately pins `border-box`
   * and `min-width: 0`. The worry the AC names is "double-application
   * breakage": a form control inside the marker must end up border-box with
   * a zero min-width, and a `width:100%` + padding field must NOT exceed its
   * container — which is the original Fotosíntesis bug the scoped patch was
   * written for.
   *
   * WHY A DOM FIXTURE AND NOT THE REAL ROUTE: `/admin/fotosintesis` cannot be
   * driven under `VITE_TEST_MODE` today. `CopilotPanel.tsx:43` imports
   * `useQuery` directly from `convex/react` instead of going through
   * `convex-safe` (which `vite.config.ts` aliases to the in-memory stub), so
   * the page issues a live `fotosintesisAi:workspaceSnapshot` query, the
   * server errors, and the error boundary replaces the whole layout — the
   * marker never mounts. Routing CopilotPanel through `convex-safe` would
   * make the real route testable; until then this asserts the CSS contract
   * against the real stylesheet, which is the part P0.1 actually asks about.
   */
  test('the foto-admin box-sizing patch survives the global reset', async ({
    page,
  }) => {
    await page.goto('/treasure');
    await waitForAppReady(page);

    const result = await page.evaluate(() => {
      const host = document.createElement('div');
      host.setAttribute('data-foto-admin', '');
      // A NARROW GRID CELL is the shape that matters. `1fr` is
      // minmax(auto, 1fr), and an `auto` minimum floors the track at the
      // item's min-content width — for an <input> that is its default
      // ~20-character intrinsic size, far wider than 120px. Without
      // `min-width: 0` the track inflates and the field escapes its cell.
      // (Same mechanism as P0.6, one layer down.)
      host.style.cssText =
        'width:120px;display:grid;grid-template-columns:1fr;position:fixed;top:-9999px;left:0';
      host.innerHTML = `
        <input style="width:100%;padding:8px;border:1px solid #000" />
        <textarea style="width:100%;padding:8px;border:1px solid #000"></textarea>
        <select style="width:100%;padding:8px;border:1px solid #000"></select>`;
      document.body.appendChild(host);

      const read = (sel: string) => {
        const el = host.querySelector(sel) as HTMLElement;
        const cs = getComputedStyle(el);
        return {
          boxSizing: cs.boxSizing,
          minWidth: cs.minWidth,
          outerWidth: el.getBoundingClientRect().width,
        };
      };
      const out = {
        hostWidth: host.getBoundingClientRect().width,
        input: read('input'),
        textarea: read('textarea'),
        select: read('select'),
      };
      host.remove();
      return out;
    });

    for (const field of ['input', 'textarea', 'select'] as const) {
      expect(result[field].boxSizing, `${field} box-sizing`).toBe('border-box');
      expect(result[field].minWidth, `${field} min-width`).toBe('0px');
      // The regression itself: border-box means padding+border are inside
      // the 100%, so the field never grows past its 320px cell.
      expect(
        result[field].outerWidth,
        `${field} escapes its container`,
      ).toBeLessThanOrEqual(result.hostWidth);
    }
  });
});
