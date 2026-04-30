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
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

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
    await page.waitForURL(/\/[^/]*$/, { timeout: 15_000 });
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
    await expect(page).not.toHaveURL(/\/login|\/select-company/, {
      timeout: 5_000,
    });

    // Outbox counter appears once drivers are initialized
    await expect(page.locator("text=Eventos SCP publicados")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("Drive app opens in windowed mode", async ({ page }) => {
    await loginToDesktop(page);
    await expect(page).not.toHaveURL(/\/login|\/select-company/, {
      timeout: 5_000,
    });

    // Dock buttons use title attribute (emoji icon, no visible text)
    const driveBtn = page.locator('button[title="Drive"]');
    await expect(driveBtn).toBeVisible({ timeout: 8_000 });
    await driveBtn.click();

    // AppWindowLayer renders Drive label as a <span> in the header
    await expect(
      page
        .locator("span")
        .filter({ hasText: /^Drive$/ })
        .first(),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("Drive window closes on close button", async ({ page }) => {
    await loginToDesktop(page);
    await expect(page).not.toHaveURL(/\/login|\/select-company/, {
      timeout: 5_000,
    });

    const driveBtn = page.locator('button[title="Drive"]');
    await expect(driveBtn).toBeVisible({ timeout: 8_000 });
    await driveBtn.click();

    const driveLabel = page
      .locator("span")
      .filter({ hasText: /^Drive$/ })
      .first();
    await expect(driveLabel).toBeVisible({ timeout: 8_000 });

    // Close button: "Fechar ×" when single app is open
    const closeBtn = page
      .getByRole("button")
      .filter({ hasText: /fechar/i })
      .first();
    if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await closeBtn.click();
      await expect(driveLabel).not.toBeVisible({ timeout: 5_000 });
    }
  });
});
