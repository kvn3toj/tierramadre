import { chromium } from 'playwright';

const OUTPUT_DIR = './screenshots';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  const { mkdirSync } = await import('fs');
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Inject auth bypass before any page loads
  await context.addInitScript(() => {
    const authState = JSON.stringify({ isAuthenticated: true, accessLevel: 'guest' });
    sessionStorage.setItem('tierra-madre-auth', authState);
    const guestInvitation = JSON.stringify({ 'tierra-madre-auth': authState });
    localStorage.setItem('tm_guest_invitation', guestInvitation);
    const googleUser = JSON.stringify({
      email: 'dev@tierramadre.co',
      name: 'Dev User',
      accessLevel: 'asesor',
      picture: '',
    });
    localStorage.setItem('tierramadre-google-user', googleUser);
  });

  async function capture(name, url, opts = {}) {
    const { wait = 8000, fullPage = false, actions } = opts;
    console.log(`Capturing ${name}...`);
    const p = await context.newPage();
    await p.goto(url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
      console.log(`  networkidle timeout for ${name}, continuing...`);
    });
    await p.waitForTimeout(wait);

    if (actions) {
      await actions(p);
    }

    await p.screenshot({
      path: `${OUTPUT_DIR}/${name}.png`,
      fullPage,
    });
    console.log(`  Saved ${OUTPUT_DIR}/${name}.png`);
    await p.close();
  }

  // 1. Home page (viewport)
  await capture('home', 'http://localhost:3000/home');

  // 2. Home page (full scroll)
  await capture('home-full', 'http://localhost:3000/home', { fullPage: true });

  // 3. Treasures page (default view)
  await capture('treasures', 'http://localhost:3000/treasure');

  // 4. Treasures page with filters open — try clicking filter chip or search
  await capture('treasures-filters', 'http://localhost:3000/treasure', {
    actions: async (p) => {
      // Click on the search bar or filter area to open filters
      try {
        // Try clicking search input first
        const searchBar = p.locator('input[type="text"], input[type="search"], [role="searchbox"]').first();
        if (await searchBar.isVisible({ timeout: 3000 })) {
          await searchBar.click();
          await p.waitForTimeout(1000);
        }
      } catch {}
      // Try clicking filter chips
      try {
        const filterChips = p.locator('[class*="Chip"], [class*="chip"], button:has-text("Filtros"), button:has-text("Precio"), button:has-text("Calidad")');
        const count = await filterChips.count();
        if (count > 0) {
          await filterChips.first().click();
          await p.waitForTimeout(2000);
        }
      } catch {}
    },
  });

  // 5. Treasures page scrolled down to show more products
  await capture('treasures-scrolled', 'http://localhost:3000/treasure', {
    actions: async (p) => {
      await p.evaluate(() => {
        const scrollContainer = document.querySelector('[class*="scroll"], [style*="overflow"]') || document.documentElement;
        scrollContainer.scrollTop = 600;
        window.scrollTo(0, 600);
      });
      await p.waitForTimeout(2000);
    },
  });

  // 6. Ambassadors page
  await capture('ambassadors', 'http://localhost:3000/ambassadors');

  // 7. Product detail (viewport)
  await capture('product-detail', 'http://localhost:3000/product/32');

  // 8. Product detail scrolled down (specs, details)
  await capture('product-detail-scroll1', 'http://localhost:3000/product/32', {
    actions: async (p) => {
      await p.evaluate(() => window.scrollTo(0, 500));
      await p.waitForTimeout(2000);
    },
  });

  // 9. Product detail scrolled further (CTA buttons, more info)
  await capture('product-detail-scroll2', 'http://localhost:3000/product/32', {
    actions: async (p) => {
      await p.evaluate(() => window.scrollTo(0, 1000));
      await p.waitForTimeout(2000);
    },
  });

  // 10. Product detail full page
  await capture('product-detail-full', 'http://localhost:3000/product/32', { fullPage: true });

  // 11. "Más" (More) sheet — click the More tab in bottom nav
  await capture('mas-sheet', 'http://localhost:3000/home', {
    actions: async (p) => {
      try {
        // Tab uses role="button" aria-label="Más"
        const moreTab = p.locator('[role="button"][aria-label="Más"]');
        const count = await moreTab.count();
        console.log(`  Found ${count} "Más" candidates (role=button)`);
        if (count > 0) {
          await moreTab.first().click();
          await p.waitForTimeout(3000);
        } else {
          // Fallback: find the last tab in the nav
          const allTabs = p.locator('nav[aria-label="Primary navigation"] [role="button"]');
          const tabCount = await allTabs.count();
          console.log(`  Found ${tabCount} nav buttons, clicking last one`);
          if (tabCount > 0) {
            await allTabs.nth(tabCount - 1).click();
            await p.waitForTimeout(3000);
          }
        }
      } catch (e) {
        console.log(`  Could not click Más: ${e.message}`);
      }
    },
  });

  await browser.close();
  console.log('Done! All screenshots captured.');
}

main().catch(console.error);
