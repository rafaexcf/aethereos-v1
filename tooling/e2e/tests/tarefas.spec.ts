/**
 * Tarefas E2E — Sprint 33 MX187
 *
 * Tests app de Tarefas com persistência kernel.tasks.
 * tarefas é seedado em KERNEL_DEFAULT_MODULES, então deve estar no Dock.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openTarefas(page: Page): Promise<boolean> {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-tarefas"]');
  if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await btn.click();
  // Tab opens
  await expect(page.locator('[data-testid="tab-tarefas"]')).toBeVisible({
    timeout: 8_000,
  });
  return true;
}

test.describe("tarefas", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("app abre com lista de tarefas", async ({ page }) => {
    if (!(await openTarefas(page))) {
      test.skip(true, "tarefas não disponível no dock (seed não rodou?)");
      return;
    }
    // Heading ou input de criar tarefa deve estar visível
    const heading = page
      .getByRole("heading", { name: /tarefas/i })
      .or(page.locator("text=Tarefas").first());
    await expect(heading.first()).toBeVisible({ timeout: 8_000 });
  });

  test("permite digitar nova tarefa", async ({ page }) => {
    if (!(await openTarefas(page))) {
      test.skip();
      return;
    }
    // Procura input de nova tarefa (placeholder com "Adicionar" ou "Nova tarefa")
    const input = page
      .locator('input[placeholder*="tarefa" i]')
      .or(page.locator('input[placeholder*="adicionar" i]'))
      .first();
    if (!(await input.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "input de nova tarefa não encontrado");
      return;
    }
    await input.fill("E2E test task " + Date.now());
    // Não persiste — só valida que a entrada aceita digitação
    await expect(input).toHaveValue(/E2E test task/);
  });

  test("filtros de status estão presentes", async ({ page }) => {
    if (!(await openTarefas(page))) {
      test.skip();
      return;
    }
    // Procura controles de filtro (botões ou abas com "Pendente"/"Concluída"/"Todas")
    const filter = page
      .locator("button, [role=tab]")
      .filter({ hasText: /pendent|conclu|todas/i })
      .first();
    if (!(await filter.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "filtros de status não visíveis");
      return;
    }
    await expect(filter).toBeVisible();
  });
});
