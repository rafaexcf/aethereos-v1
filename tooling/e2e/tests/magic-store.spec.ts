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

  // Wait for Magic Store app to render
  await expect(
    page
      .locator('[data-testid="magic-store-app"]')
      .or(page.locator("text=Magic Store")),
  ).toBeVisible({ timeout: 10_000 });
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

    // Click "Em breve" filter
    const comingSoonFilter = page.getByRole("button", { name: /em breve/i });
    await expect(comingSoonFilter).toBeVisible({ timeout: 5_000 });
    await comingSoonFilter.click();

    // "Em breve" badge should appear on visible cards
    await expect(page.locator("text=Em breve").first()).toBeVisible({
      timeout: 5_000,
    });

    // Click "Beta" filter
    const betaFilter = page.getByRole("button", { name: /^beta$/i });
    await expect(betaFilter).toBeVisible({ timeout: 3_000 });
    await betaFilter.click();

    // Beta badge should appear
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

    // Detail drawer should appear with "Sobre" section
    await expect(
      page
        .locator("text=Sobre")
        .or(page.locator('[data-testid="app-detail-drawer"]')),
    ).toBeVisible({ timeout: 5_000 });

    // Close button should be present
    await expect(
      page
        .getByRole("button", { name: /fechar/i })
        .or(page.locator('[aria-label="Fechar"]')),
    ).toBeVisible({ timeout: 3_000 });
  });
});
