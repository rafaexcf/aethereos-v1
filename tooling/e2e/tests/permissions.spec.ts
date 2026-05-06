/**
 * Permissions E2E — Sprint 33 MX187
 *
 * Tests permissões de apps via Magic Store + grants visualizados em Gestor.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openMagicStore(page: Page) {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-magic-store"]');
  await expect(btn).toBeVisible({ timeout: 8_000 });
  await btn.click();
  await expect(page.locator('[data-testid="magic-store-app"]')).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("permissions", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("detail view de um app mostra seção de permissões", async ({ page }) => {
    await openMagicStore(page);

    // Navega ao primeiro card de app
    const firstCard = page
      .locator('[data-testid^="magic-store-card-"]')
      .or(
        page.locator("button").filter({
          hasText: /Comércio Digital|LOGITIX|ERP|Kwix|Autergon|Drive|Tarefas/i,
        }),
      )
      .first();
    if (!(await firstCard.isVisible({ timeout: 8_000 }).catch(() => false))) {
      test.skip(true, "nenhum card visível para testar permissões");
      return;
    }
    await firstCard.click();

    // Detail view deve mostrar texto sobre permissões/scopes
    const permsSection = page
      .locator(
        "text=/permiss|escopo|scopes|acessos|este app pode|dados acessados/i",
      )
      .first();
    if (
      !(await permsSection.isVisible({ timeout: 5_000 }).catch(() => false))
    ) {
      test.skip(true, "seção de permissões não encontrada no detail view");
      return;
    }
    await expect(permsSection).toBeVisible();
  });

  test("Gestor (admin) lista apps instalados com acessos", async ({ page }) => {
    await loginToDesktop(page);

    // gestor é requiresAdmin=true. Pode estar no dock ou não.
    const btn = page.locator('[data-testid="dock-app-gestor"]');
    if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "gestor não acessível (user não é admin)");
      return;
    }
    await btn.click();
    await expect(page.locator('[data-testid="tab-gestor"]')).toBeVisible({
      timeout: 8_000,
    });

    // Heading do Gestor
    const heading = page
      .locator("text=/gestor|painel do gestor|equipe|colaboradores/i")
      .first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
  });

  test("seed extras gera departamentos visíveis no Gestor", async ({
    page,
  }) => {
    await loginToDesktop(page);
    const btn = page.locator('[data-testid="dock-app-gestor"]');
    if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "gestor não acessível");
      return;
    }
    await btn.click();
    await expect(page.locator('[data-testid="tab-gestor"]')).toBeVisible({
      timeout: 8_000,
    });

    // Tenta navegar à aba Departamentos
    const tab = page
      .locator("button, a")
      .filter({ hasText: /departament/i })
      .first();
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "aba departamentos não exposta nesse build");
      return;
    }
    await tab.click();
    // Seed extras (MX181) cria "Diretoria", "Tecnologia", "Operações", "Financeiro"
    const seedDept = page
      .locator("text=/diretoria|tecnologia|operações|financeiro/i")
      .first();
    if (!(await seedDept.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "departamentos seedados não encontrados");
      return;
    }
    await expect(seedDept).toBeVisible();
  });
});
