import { test, expect } from "@playwright/test";

test.describe("register page", () => {
  test("renders register form at /register", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/register/, { timeout: 8_000 });

    await expect(
      page.getByRole("heading", { name: /criar conta/i }),
    ).toBeVisible();
    await expect(page.getByLabel("CNPJ")).toBeVisible();
    await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /criar conta/i }),
    ).toBeVisible();
  });

  test("CNPJ field applies mask on input", async ({ page }) => {
    await page.goto("/register");
    const cnpjInput = page.getByLabel("CNPJ");
    await cnpjInput.fill("12345678000195");
    await expect(cnpjInput).toHaveValue("12.345.678/0001-95");
  });

  test("navigates to login from register page", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /fazer login/i }).click();
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test("shows validation error when passwords do not match", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Nome completo").fill("Test User");
    await page.locator('input[type="email"]').fill("test@example.com");
    await page.getByLabel("CNPJ").fill("12345678000195");
    await page.getByLabel("Senha", { exact: true }).fill("Senha1234");
    await page.getByLabel("Confirmar senha").fill("Diferente99");

    await page.getByRole("button", { name: /criar conta/i }).click();

    await expect(page.locator("text=senhas não coincidem")).toBeVisible({
      timeout: 4_000,
    });
  });
});
