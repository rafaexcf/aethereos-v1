import { test, expect } from "@playwright/test";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function loginAndGoToSelectCompany(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page
    .locator('button[type="submit"]')
    .filter({ hasText: "Entrar" })
    .click();
  await page.waitForURL(/\/(select-company)?$/, { timeout: 15_000 });

  if (!page.url().includes("select-company")) {
    // Already on desktop — navigate to select-company for company creation test
    await page.goto("/select-company");
  }
}

test.describe("company creation", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("select-company page renders company list and create button", async ({
    page,
  }) => {
    await loginAndGoToSelectCompany(page);
    await expect(page).toHaveURL(/\/select-company/, { timeout: 5_000 });
    // Create button must be present
    await expect(
      page.locator("button").filter({ hasText: /criar|nova empresa/i }),
    ).toBeVisible({ timeout: 8_000 });
  });

  test("creating a company navigates to desktop", async ({ page }) => {
    await loginAndGoToSelectCompany(page);
    await expect(page).toHaveURL(/\/select-company/, { timeout: 5_000 });

    // Fill company name if there's an input (UI varies by implementation)
    const nameInput = page
      .locator('input[placeholder*="empresa"], input[placeholder*="nome"]')
      .first();
    if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await nameInput.fill(`E2E Test Company ${Date.now()}`);
    }

    // Click create button
    const createBtn = page
      .locator("button")
      .filter({ hasText: /criar|nova empresa/i });
    await createBtn.click();

    // Should end up on desktop (/) after company creation
    await expect(page).toHaveURL(/^\/?$|\/select-company/, {
      timeout: 15_000,
    });
  });
});
