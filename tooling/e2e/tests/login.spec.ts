import { test, expect } from "@playwright/test";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

test.describe("login", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("login page renders with email and password fields", async ({
    page,
  }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(
      page.locator('button[type="submit"]').filter({ hasText: "Entrar" }),
    ).toBeVisible();
  });

  test("valid credentials navigate to select-company or desktop", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill(PASSWORD);
    await page
      .locator('button[type="submit"]')
      .filter({ hasText: "Entrar" })
      .click();

    // Should navigate to /select-company (multiple companies) or / (single company)
    await expect(page).toHaveURL(/\/(select-company)?$/, { timeout: 15_000 });
  });

  test("invalid credentials shows error message", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill(EMAIL);
    await page.locator("#password").fill("wrong-password-xyz-invalid");
    await page
      .locator('button[type="submit"]')
      .filter({ hasText: "Entrar" })
      .click();

    // Error paragraph should appear
    await expect(page.locator("p.text-red-400")).toBeVisible({
      timeout: 8_000,
    });
    // Still on login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
  });
});
