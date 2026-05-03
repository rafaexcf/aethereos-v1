/**
 * Magic Store E2E — Sprint 12
 *
 * Tests the catalog listing, category filtering, and app detail drawer.
 * Magic Store is a Camada 2 launcher — it does NOT host apps, only opens external URLs.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openMagicStore(page: Page) {
  await loginToDesktop(page);

  // Click Magic Store icon in the dock using data-testid
  const storeBtn = page.locator('[data-testid="dock-app-magic-store"]');
  await expect(storeBtn).toBeVisible({ timeout: 8_000 });
  await storeBtn.click();

  // Wait for Magic Store app to render (testid only — text=Magic Store aparece em tab+mesa+loading)
  await expect(page.locator('[data-testid="magic-store-app"]')).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("magic store", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("app cards list renders with at least one app", async ({ page }) => {
    await openMagicStore(page);

    // At least one app card should be visible
    const cards = page
      .locator('[data-testid^="magic-store-card-"]')
      .or(
        page
          .locator("button")
          .filter({ hasText: /Comércio Digital|LOGITIX|ERP|Kwix|Autergon/i }),
      );

    await expect(cards.first()).toBeVisible({ timeout: 8_000 });
  });

  test("category filter changes visible cards", async ({ page }) => {
    await openMagicStore(page);

    // Sidebar tem categorias: Aplicativos | Plugins | Widgets | Integracoes | Distros
    // Click Plugins (categoria "Em breve") e verifica que badge "Em breve" aparece
    const pluginsFilter = page.getByRole("button", {
      name: "Plugins",
      exact: true,
    });
    await expect(pluginsFilter).toBeVisible({ timeout: 5_000 });
    await pluginsFilter.click();

    await expect(page.locator("text=Em breve").first()).toBeVisible({
      timeout: 5_000,
    });

    // Volta para Aplicativos — categoria com apps reais (verticais B2B com badge Beta)
    const appsFilter = page.getByRole("button", {
      name: "Aplicativos",
      exact: true,
    });
    await expect(appsFilter).toBeVisible({ timeout: 3_000 });
    await appsFilter.click();

    await expect(page.locator("text=Beta").first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("clicking app card opens detail drawer", async ({ page }) => {
    await openMagicStore(page);

    // Click "Todos" to show all apps
    const allFilter = page.getByRole("button", { name: /^todos$/i });
    if (await allFilter.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await allFilter.click();
    }

    // Click the first app card
    const firstCard = page
      .locator('[data-testid^="magic-store-card-"]')
      .or(
        page
          .locator("button")
          .filter({ hasText: /Comércio Digital|LOGITIX|ERP|Kwix|Autergon/i }),
      )
      .first();

    await expect(firstCard).toBeVisible({ timeout: 8_000 });
    await firstCard.click();

    // Detail view (full-page replacement, nao modal) deve mostrar "Sobre este app"
    await expect(page.locator("text=Sobre este app").first()).toBeVisible({
      timeout: 5_000,
    });
  });
});
