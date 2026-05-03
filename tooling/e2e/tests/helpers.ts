import { expect, type Page } from "@playwright/test";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function loginWith(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login?skipSplash");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();

  await page.waitForURL(/\/(select-company|desktop)?$/, { timeout: 20_000 });

  if (page.url().includes("select-company")) {
    const firstCompanyBtn = page.locator("button:has(span.font-mono)").first();
    if (
      await firstCompanyBtn.isVisible({ timeout: 5_000 }).catch(() => false)
    ) {
      await firstCompanyBtn.click();
    } else {
      const createBtn = page
        .locator("button")
        .filter({ hasText: /criar|nova empresa/i });
      await createBtn.click();
    }
    await page.waitForURL(/\/desktop$/, { timeout: 20_000 });
  }

  await expect(page.locator('[data-testid="os-desktop"]')).toBeVisible({
    timeout: 20_000,
  });
}

export async function loginToDesktop(page: Page): Promise<void> {
  await loginWith(page, EMAIL, PASSWORD);
}

export async function loginAsOnboardingUser(page: Page): Promise<void> {
  const email = process.env["E2E_ONBOARDING_EMAIL"] ?? "";
  const password = process.env["E2E_ONBOARDING_PASSWORD"] ?? "";
  if (!email || !password) {
    throw new Error("E2E_ONBOARDING_EMAIL/PASSWORD not set");
  }
  await loginWith(page, email, password);
}

/**
 * Espera o desktop estar 100% pronto para interacao:
 * - os-desktop renderizado (root container)
 * - dock visivel com pelo menos 1 app interativo (dock-app-* button)
 *
 * NAO depende de mesa icons (Mesa pode estar vazia conforme mesa_layouts
 * do usuario). Para testes que precisam de mesa especifica, fazer assert
 * extra de [data-testid="mesa-app"] e seus filhos.
 *
 * Resolve flakiness de testes que dependiam de mesa icons (KL-4 Sprint 13).
 * Falha hard se desktop+dock nao aparecem em 15s — sem skip silencioso.
 */
export async function waitForDesktopReady(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="os-desktop"]')).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('[data-testid="dock"]')).toBeVisible({
    timeout: 8_000,
  });
  // Pelo menos um app no dock (registry sempre tem mesa+drive+pessoas+etc fixos)
  await expect(page.locator('[data-testid^="dock-app-"]').first()).toBeVisible({
    timeout: 8_000,
  });
}
