/**
 * Onboarding Wizard E2E — Sprint 12
 *
 * Tests the 3-step onboarding overlay shown when onboarding_completed=false.
 * These tests only run against a tenant that has NOT yet completed onboarding.
 * Set E2E_ONBOARDING_COMPANY_ID to a company with onboarding_completed=false.
 */
import { test, expect } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

test.describe("onboarding wizard", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("wizard appears when onboarding not completed", async ({ page }) => {
    if (!process.env["E2E_ONBOARDING_COMPANY_ID"]) {
      test.skip();
      return;
    }

    await loginToDesktop(page);

    // The wizard overlay should be visible on the desktop
    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    // First step title should appear
    await expect(wizard.locator("text=Bem-vindo")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("wizard step indicator renders 3 steps", async ({ page }) => {
    if (!process.env["E2E_ONBOARDING_COMPANY_ID"]) {
      test.skip();
      return;
    }

    await loginToDesktop(page);

    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    // 3 step indicator bars
    const steps = wizard.locator('[data-testid^="step-indicator-"]');
    await expect(steps).toHaveCount(3, { timeout: 5_000 });
  });

  test("can advance through step 1 and reach step 2 (dados)", async ({
    page,
  }) => {
    if (!process.env["E2E_ONBOARDING_COMPANY_ID"]) {
      test.skip();
      return;
    }

    await loginToDesktop(page);

    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    // Click "Próximo" to advance from step 1 (tour) to step 2 (dados)
    const nextBtn = wizard.getByRole("button", { name: /próximo/i });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();

    // Step 2 should now be visible
    await expect(
      wizard.locator("text=Dados da empresa").or(wizard.locator("text=Logo")),
    ).toBeVisible({ timeout: 5_000 });
  });
});
