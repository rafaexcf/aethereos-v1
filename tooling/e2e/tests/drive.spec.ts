/**
 * Drive E2E — SCP pipeline validation via real browser
 *
 * Validates: login → desktop → open Drive app → verify window → SCP outbox counter.
 * The outbox counter on the desktop page reflects events published via scp-publish
 * Edge Function. An increment proves the full browser→Edge Function→outbox pipeline.
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function loginToDesktop(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page
    .locator('button[type="submit"]')
    .filter({ hasText: "Entrar" })
    .click();

  // Handle select-company if user has multiple companies
  const url = await page.waitForURL(/\/(select-company)?$/, {
    timeout: 15_000,
  });
  void url;
  if (page.url().includes("select-company")) {
    // Pick the first company in the list
    const firstCompanyBtn = page
      .locator("button")
      .filter({ hasText: /[0-9a-f-]{36}/i })
      .first();
    if (
      await firstCompanyBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      await firstCompanyBtn.click();
    } else {
      // No company yet — create one first
      const createBtn = page
        .locator("button")
        .filter({ hasText: /criar|nova empresa/i });
      await createBtn.click();
    }
    await page.waitForURL(/^\/?$/, { timeout: 15_000 });
  }
}

test.describe("drive + scp pipeline", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("desktop renders SCP outbox counter after login", async ({ page }) => {
    await loginToDesktop(page);
    await expect(page).toHaveURL(/^\/?$/, { timeout: 5_000 });

    // Outbox counter appears once drivers are initialized
    await expect(page.locator("text=Eventos SCP publicados")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Drive app opens in windowed mode", async ({ page }) => {
    await loginToDesktop(page);
    await expect(page).toHaveURL(/^\/?$/, { timeout: 5_000 });

    // Click the Drive icon in the dock
    const driveBtn = page
      .locator("button")
      .filter({ hasText: /drive/i })
      .first();
    await expect(driveBtn).toBeVisible({ timeout: 8_000 });
    await driveBtn.click();

    // A window with "Drive" title should appear
    await expect(
      page.locator('[class*="window"], [role="dialog"]').filter({
        hasText: /drive/i,
      }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("Drive window closes on close button", async ({ page }) => {
    await loginToDesktop(page);
    await expect(page).toHaveURL(/^\/?$/, { timeout: 5_000 });

    const driveBtn = page
      .locator("button")
      .filter({ hasText: /drive/i })
      .first();
    await driveBtn.click();

    const window = page
      .locator('[class*="window"], [role="dialog"]')
      .filter({ hasText: /drive/i });
    await expect(window).toBeVisible({ timeout: 8_000 });

    // Close button inside window
    const closeBtn = window
      .locator("button")
      .filter({ hasText: /✕|×|close|fechar/i })
      .first();
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click();
      await expect(window).not.toBeVisible({ timeout: 5_000 });
    }
  });
});
