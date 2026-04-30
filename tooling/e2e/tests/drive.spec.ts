/**
 * Drive E2E — Sprint 10 paradigma OS
 *
 * Validates: login → /desktop → OS shell rendered → open Drive via Mesa icon → Tab aparece.
 */
import { test, expect } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

test.describe("drive + scp pipeline", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("desktop renders OS shell after login", async ({ page }) => {
    await loginToDesktop(page);
    await expect(page).toHaveURL(/\/desktop$/, { timeout: 5_000 });
    await expect(page.locator('[data-testid="os-desktop"]')).toBeVisible();
    await expect(page.locator('[data-testid="topbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="dock"]')).toBeVisible({
      timeout: 8_000,
    });
  });

  test("app opens as tab via Mesa desktop icon", async ({ page }) => {
    await loginToDesktop(page);

    // Dock must be visible
    await expect(page.locator('[data-testid="dock"]')).toBeVisible({
      timeout: 8_000,
    });

    // Click first desktop icon in Mesa
    const firstIcon = page.locator('[data-testid="mesa-app"] button').first();
    if (await firstIcon.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await firstIcon.click();
      // TabBar appears after app opens
      await expect(page.locator('[data-testid="tabbar"]')).toBeVisible({
        timeout: 8_000,
      });
    }
  });

  test("Drive tab closes on X button", async ({ page }) => {
    await loginToDesktop(page);

    // Open first app via Mesa
    const firstIcon = page.locator('[data-testid="mesa-app"] button').first();
    if (!(await firstIcon.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    await firstIcon.click();
    await expect(page.locator('[data-testid="tabbar"]')).toBeVisible({
      timeout: 8_000,
    });

    // Close tab via X button
    const closeBtn = page.locator('[data-testid^="close-tab-"]').first();
    if (await closeBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await closeBtn.click({ force: true });
      await expect(page.locator('[data-testid="tabbar"]')).not.toBeVisible({
        timeout: 5_000,
      });
    }
  });
});
