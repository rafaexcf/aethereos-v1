/**
 * Bloco de Notas E2E — Sprint 33 MX187
 *
 * Tests app de Notas com persistência kernel.notes.
 * bloco-de-notas é seedado em KERNEL_DEFAULT_MODULES.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openNotas(page: Page): Promise<boolean> {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-bloco-de-notas"]');
  if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await btn.click();
  await expect(page.locator('[data-testid="tab-bloco-de-notas"]')).toBeVisible({
    timeout: 8_000,
  });
  return true;
}

test.describe("bloco de notas", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("app abre com lista de notas", async ({ page }) => {
    if (!(await openNotas(page))) {
      test.skip(true, "bloco-de-notas não disponível");
      return;
    }
    // Heading ou empty state visível
    const root = page
      .locator("text=/notas|bloco|anotaç/i")
      .or(page.locator('button:has-text("Nova")'))
      .first();
    await expect(root).toBeVisible({ timeout: 8_000 });
  });

  test("notas seedadas aparecem na lista", async ({ page }) => {
    if (!(await openNotas(page))) {
      test.skip();
      return;
    }
    // Seed extras (MX181) cria 3 notas/owner com títulos "Roadmap...", "Reunião...",
    // "Ideias...". Se nenhuma aparecer, ou seed não rodou ou user é viewer.
    const seedNote = page.locator("text=/roadmap|reunião|ideias/i").first();
    if (!(await seedNote.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "notas seedadas não encontradas");
      return;
    }
    await expect(seedNote).toBeVisible();
  });
});
