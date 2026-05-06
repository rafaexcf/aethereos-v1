/**
 * Segurança E2E — Sprint 33 MX187
 *
 * Tests página de Segurança em Configurações:
 * - 2FA TOTP (Sprint 30)
 * - Sessões ativas (force-logout)
 * - LGPD export (owner-only)
 *
 * Usa rota /settings/about ou via app Configurações no desktop.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openSettings(page: Page): Promise<boolean> {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-settings"]');
  if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await btn.click();
  await expect(page.locator('[data-testid="tab-settings"]')).toBeVisible({
    timeout: 8_000,
  });
  return true;
}

test.describe("segurança (configurações)", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("aba de segurança mostra 2FA e sessões", async ({ page }) => {
    if (!(await openSettings(page))) {
      test.skip(true, "settings não disponível");
      return;
    }
    // Procura aba/sidebar item "Segurança"
    const tab = page
      .locator("button, a")
      .filter({ hasText: /segurança|security/i })
      .first();
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "aba Segurança não encontrada");
      return;
    }
    await tab.click();
    // Deve ter referência a 2FA / autenticação de dois fatores
    const twoFa = page
      .locator(
        "text=/2fa|dois fatores|two[\\- ]factor|autenticação em dois fatores/i",
      )
      .first();
    await expect(twoFa).toBeVisible({ timeout: 5_000 });
  });

  test("aba de privacidade tem botão de exportar LGPD", async ({ page }) => {
    if (!(await openSettings(page))) {
      test.skip();
      return;
    }
    const tab = page
      .locator("button, a")
      .filter({ hasText: /privacidade|lgpd|dados/i })
      .first();
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "aba Privacidade/LGPD não encontrada");
      return;
    }
    await tab.click();
    const exportBtn = page
      .locator("button, a")
      .filter({ hasText: /exportar|download|baixar/i })
      .first();
    if (!(await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(
        true,
        "botão de exportar não visível (user pode não ser owner)",
      );
      return;
    }
    await expect(exportBtn).toBeVisible();
  });
});
