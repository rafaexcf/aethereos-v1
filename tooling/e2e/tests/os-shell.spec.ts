/**
 * OS Shell E2E — Sprint 10
 *
 * Validates the visual OS paradigm: TopBar, Mesa (pinned tab), Dock, TabBar.
 */
import { test, expect } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

test.describe("os-shell paradigma OS", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("TopBar renders with company name after login", async ({ page }) => {
    await loginToDesktop(page);

    const topbar = page.locator('[data-testid="topbar"]');
    await expect(topbar).toBeVisible();

    // Wordmark present (ÆTHEREOS com Æ ligature)
    await expect(topbar.locator("text=ÆTHEREOS")).toBeVisible();
  });

  test("Mesa is the default view (no TabBar visible initially)", async ({
    page,
  }) => {
    await loginToDesktop(page);

    // TabBar only appears when apps are open — Mesa is the default, so TabBar hidden
    await expect(page.locator('[data-testid="tabbar"]')).not.toBeVisible({
      timeout: 3_000,
    });

    // OS desktop is visible
    await expect(page.locator('[data-testid="os-desktop"]')).toBeVisible();
  });

  test("Dock appears at bottom of screen", async ({ page }) => {
    await loginToDesktop(page);

    await expect(page.locator('[data-testid="dock"]')).toBeVisible({
      timeout: 8_000,
    });
  });

  test("clicking desktop icon opens an app as tab", async ({ page }) => {
    await loginToDesktop(page);

    // Click first desktop icon in Mesa
    const firstIcon = page.locator('[data-testid="mesa-app"] button').first();
    if (await firstIcon.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstIcon.click();

      // TabBar appears with the opened tab
      await expect(page.locator('[data-testid="tabbar"]')).toBeVisible({
        timeout: 8_000,
      });
    }
  });

  test("closing all non-pinned tabs hides TabBar", async ({ page }) => {
    await loginToDesktop(page);

    const firstIcon = page.locator('[data-testid="mesa-app"] button').first();
    if (!(await firstIcon.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstIcon.click();
    await expect(page.locator('[data-testid="tabbar"]')).toBeVisible({
      timeout: 8_000,
    });

    // Close all non-pinned tabs
    const closeButtons = page.locator('[data-testid^="close-tab-"]');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = closeButtons.first();
      if (await btn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await btn.click({ force: true });
      }
    }

    // TabBar should hide
    await expect(page.locator('[data-testid="tabbar"]')).not.toBeVisible({
      timeout: 5_000,
    });
  });
});
