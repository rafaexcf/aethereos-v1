/**
 * Onboarding Wizard E2E — Sprint 12 + Sprint 14 (MX66)
 *
 * Tests the 3-step onboarding overlay shown when onboarding_completed=false.
 * Usa usuario dedicado (E2E_ONBOARDING_EMAIL) que pertence a uma company com
 * onboarding_completed=false (E2E_ONBOARDING_COMPANY_ID, seed em
 * tooling/seed/src/companies.ts slug "onbtest").
 */
import { test, expect } from "@playwright/test";
import { loginAsOnboardingUser } from "./helpers";

const ONB_EMAIL = process.env["E2E_ONBOARDING_EMAIL"] ?? "";
const ONB_PASSWORD = process.env["E2E_ONBOARDING_PASSWORD"] ?? "";

test.describe("onboarding wizard", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!ONB_EMAIL || !ONB_PASSWORD) {
      testInfo.skip(
        true,
        "E2E_ONBOARDING_EMAIL / E2E_ONBOARDING_PASSWORD not set",
      );
    }
  });

  test("wizard appears when onboarding not completed", async ({ page }) => {
    await loginAsOnboardingUser(page);

    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    await expect(wizard.locator("text=Bem-vindo")).toBeVisible({
      timeout: 5_000,
    });
  });

  test("wizard step indicator renders 3 steps", async ({ page }) => {
    await loginAsOnboardingUser(page);

    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    const steps = wizard.locator('[data-testid^="step-indicator-"]');
    await expect(steps).toHaveCount(3, { timeout: 5_000 });
  });

  test("can advance through step 1 and reach step 2 (dados)", async ({
    page,
  }) => {
    await loginAsOnboardingUser(page);

    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    await expect(wizard).toBeVisible({ timeout: 10_000 });

    const nextBtn = wizard.getByRole("button", { name: /próximo/i });
    await expect(nextBtn).toBeVisible({ timeout: 5_000 });
    await nextBtn.click();

    await expect(
      wizard.locator("text=Dados da empresa").or(wizard.locator("text=Logo")),
    ).toBeVisible({ timeout: 5_000 });
  });
});
