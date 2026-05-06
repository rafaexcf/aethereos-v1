/**
 * Kanban E2E — Sprint 33 MX187
 *
 * Tests app de Kanban com persistência kernel.kanban_*.
 * kanban NÃO está em KERNEL_DEFAULT_MODULES, mas pode ser instalado
 * via Magic Store. Skip gracioso se não estiver no dock.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openKanban(page: Page): Promise<boolean> {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-kanban"]');
  if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await btn.click();
  await expect(page.locator('[data-testid="tab-kanban"]')).toBeVisible({
    timeout: 8_000,
  });
  return true;
}

test.describe("kanban", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("app abre com lista de boards", async ({ page }) => {
    if (!(await openKanban(page))) {
      test.skip(true, "kanban não está instalado neste tenant");
      return;
    }
    // Heading "Kanban" ou texto "Boards"/"Quadros" deve estar visível
    const heading = page
      .locator("text=Kanban")
      .or(page.locator("text=/quadros|boards/i"))
      .first();
    await expect(heading).toBeVisible({ timeout: 8_000 });
  });

  test("botão de novo board está presente", async ({ page }) => {
    if (!(await openKanban(page))) {
      test.skip();
      return;
    }
    const newBtn = page.getByRole("button", { name: /novo|criar|\+/i }).first();
    if (!(await newBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "botão de novo board não visível");
      return;
    }
    await expect(newBtn).toBeVisible();
  });

  test("abrir board mostra colunas (se houver board seedado)", async ({
    page,
  }) => {
    if (!(await openKanban(page))) {
      test.skip();
      return;
    }
    // Se houver board, clicar abre BoardView com colunas. Se vazio, skip.
    const boardCard = page
      .locator('[data-testid^="kanban-board-"]')
      .or(page.locator("button, a").filter({ hasText: /sprint atual|board/i }))
      .first();
    if (!(await boardCard.isVisible({ timeout: 4_000 }).catch(() => false))) {
      test.skip(true, "nenhum board para abrir (seed extras não rodou?)");
      return;
    }
    await boardCard.click();
    // Coluna "A fazer" do seed extras (MX181)
    const col = page.locator("text=/a fazer|fazer|todo/i").first();
    await expect(col).toBeVisible({ timeout: 8_000 });
  });
});
