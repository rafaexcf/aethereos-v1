import { expect, type Page } from "@playwright/test";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

export async function loginToDesktop(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator("#email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await page.waitForURL(/\/(select-company|desktop)?$/, { timeout: 15_000 });

  if (page.url().includes("select-company")) {
    const firstCompanyBtn = page
      .locator("button")
      .filter({ hasText: /[0-9a-f-]{36}/i })
      .first();
    if (
      await firstCompanyBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      await firstCompanyBtn.click();
    } else {
      const createBtn = page
        .locator("button")
        .filter({ hasText: /criar|nova empresa/i });
      await createBtn.click();
    }
    await page.waitForURL(/\/desktop$/, { timeout: 15_000 });
  }

  await expect(page.locator('[data-testid="os-desktop"]')).toBeVisible({
    timeout: 10_000,
  });
}
