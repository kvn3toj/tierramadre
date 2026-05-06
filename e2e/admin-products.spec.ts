/**
 * Playwright spec — atelier admin panel at `/admin/products`.
 *
 * Verifies the optimistic edit flow with a stubbed Convex client
 * (configured by `VITE_TEST_MODE=1` in `playwright.config.ts`):
 *
 *   1. Page renders the seeded inventory rows.
 *   2. Clicking a row opens the EditDrawer.
 *   3. Editing "Nombre" + Save closes the drawer and the row in the
 *      ledger updates immediately (the optimistic UI guarantee).
 *   4. Reopening the row surfaces the new audit row in "Historial".
 *
 * The spec does not exercise the real Convex backend — that lives at
 * `wandering-parrot-148.convex.cloud` and is covered by manual smoke
 * tests after every Convex deploy. This spec is a structural guard
 * against regressions in the page shell, the optimistic mirror patch
 * pattern, and the audit log surface.
 */

import { test, expect, type Page } from "@playwright/test";

const ADMIN_USER = {
  id: "playwright-admin",
  email: "playwright@tierramadre.test",
  name: "Playwright Admin",
  givenName: "Playwright",
  familyName: "Admin",
  picture: "",
  role: "admin",
  accessLevel: "admin",
};

/**
 * Pre-seed storage and route mocks before navigation. Both must run
 * before the app's bootstrap in `main.tsx` reads localStorage or fires
 * `/api/validate`, so they live in `beforeEach`.
 */
async function primeAdminSession(page: Page) {
  await page.addInitScript((adminUser) => {
    try {
      window.localStorage.setItem(
        "tierramadre-google-user",
        JSON.stringify(adminUser),
      );
      window.sessionStorage.setItem(
        "tierra-madre-auth",
        JSON.stringify({ isAuthenticated: true, accessLevel: "admin" }),
      );
      // Skip the 4s SplashScreen (App.tsx checks `tm_session_active`
      // before showing it). Without this, the splash burns the test
      // timeout before the inventory rows ever render.
      window.sessionStorage.setItem("tm_session_active", "true");
      window.localStorage.setItem("tm_last_activity", String(Date.now()));
    } catch {
      // Ignore quota or access errors — the mock will fall through and
      // the test will fail visibly on the AdminRoute gate.
    }
  }, ADMIN_USER);

  await page.route("**/api/validate*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        isAuthorized: true,
        user: {
          email: ADMIN_USER.email,
          name: ADMIN_USER.name,
          role: "admin",
          accessLevel: "admin",
        },
      }),
    });
  });

  await page.route("**/api/get-drive-images*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, folderId: null, images: [] }),
    });
  });

  await page.route("**/api/get-batch-thumbnails*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, thumbnails: {} }),
    });
  });

  await page.route("**/api/health*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe("/admin/products — atelier inventory", () => {
  test.beforeEach(async ({ page }) => {
    await primeAdminSession(page);
  });

  test("renders the seeded inventory rows", async ({ page }) => {
    await page.goto("/admin/products");

    // Wait for the seeded inventory to land — three rows render under
    // the "Productos en el espejo" list. We use this as the readiness
    // signal because it's a stronger guarantee than the page title:
    // products only show up once the Convex stub's React subscriptions
    // have settled.
    const list = page.getByRole("list", {
      name: "Productos en el espejo",
    });
    await expect(list.getByRole("listitem")).toHaveCount(3, {
      timeout: 10_000,
    });

    // FotoHero rendered — h1 + "en el espejo" caption + create/resync controls.
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /Fotosíntesis/i,
      }),
    ).toBeVisible();
    await expect(page.getByText("en el espejo", { exact: true })).toBeVisible();
    await expect(page.locator("[data-foto-create]")).toBeVisible();
    await expect(page.locator("[data-foto-resync]")).toBeVisible();

    // Workbench split is rendered — Bandeja is visible at desktop widths.
    await expect(
      page.getByRole("complementary", { name: /Bandeja/i }),
    ).toBeVisible();
    // Each row has a chroma bar (data attribute set in ChromaBar).
    const chromaBars = page.locator("[data-chroma-bar]");
    await expect(chromaBars.first()).toBeVisible();
    expect(await chromaBars.count()).toBeGreaterThan(0);
  });

  test("edits a row via the Bandeja Abrir-editor button", async ({ page }) => {
    await page.goto("/admin/products");

    const list = page.getByRole("list", {
      name: "Productos en el espejo",
    });
    await expect(list.getByRole("listitem")).toHaveCount(3, {
      timeout: 10_000,
    });

    // Select the first seeded row ("Esmeralda Venus") — populates the
    // Bandeja inspector. Drawer no longer opens on row click; the
    // "Abrir editor" button inside the Bandeja's StoneHero (Phase D)
    // is the explicit entry point for the edit flow.
    const venusRow = list.getByRole("listitem").filter({
      hasText: "Esmeralda Venus",
    });
    await expect(venusRow).toHaveCount(1);
    await venusRow.getByText("Esmeralda Venus").click();

    const bandeja = page.getByRole("complementary", { name: /Bandeja/i });
    await expect(bandeja).toBeVisible();
    const openEditorButton = bandeja.locator("[data-bandeja-open-editor]");
    await expect(openEditorButton).toBeVisible();
    await openEditorButton.click();

    const drawer = page.locator(".MuiDrawer-paper");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText("Sin cambios")).toBeVisible();

    const nombreInput = drawer.getByRole("textbox", { name: "Nombre" });
    await nombreInput.click();
    await nombreInput.fill("Esmeralda Venus Renombrada");
    await expect(nombreInput).toHaveValue("Esmeralda Venus Renombrada");

    await expect(drawer.getByText("1 cambio sin guardar")).toBeVisible();

    await drawer.getByRole("button", { name: "Guardar" }).click();
    await expect(drawer).toHaveCount(0, { timeout: 5_000 });

    await expect(list.getByText("Esmeralda Venus Renombrada")).toBeVisible();

    await list
      .getByRole("listitem")
      .filter({ hasText: "Esmeralda Venus Renombrada" })
      .getByText("Esmeralda Venus Renombrada")
      .first()
      .click();
    await expect(openEditorButton).toBeVisible();
    await openEditorButton.click();
    const reopenedDrawer = page.locator(".MuiDrawer-paper");
    await expect(reopenedDrawer).toBeVisible();
    await expect(reopenedDrawer.getByText("Historial")).toBeVisible();
    await expect(reopenedDrawer.getByText(ADMIN_USER.name)).toBeVisible();
    await expect(
      reopenedDrawer.getByText("Esmeralda Venus", { exact: true }),
    ).toBeVisible();
    await expect(
      reopenedDrawer.getByText("Esmeralda Venus Renombrada").first(),
    ).toBeVisible();
  });
});
