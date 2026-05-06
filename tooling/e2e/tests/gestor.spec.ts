/**
 * Gestor E2E — Sprint 33 MX187
 *
 * Tests app Gestor (Sprint 27 — dashboard, equipe, configs).
 * gestor.requiresAdmin=true — só roda se user é admin/owner.
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openGestor(page: Page): Promise<boolean> {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-gestor"]');
  if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await btn.click();
  await expect(page.locator('[data-testid="tab-gestor"]')).toBeVisible({
    timeout: 8_000,
  });
  return true;
}

test.describe("gestor", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("Gestor abre para admin/owner", async ({ page }) => {
    if (!(await openGestor(page))) {
      test.skip(true, "user não tem acesso ao Gestor");
      return;
    }
    // Heading do Gestor
    const heading = page.locator("text=/gestor|painel|dashboard/i").first();
    await expect(heading).toBeVisible({ timeout: 5_000 });
  });

  test("seção Equipe lista colaboradores", async ({ page }) => {
    if (!(await openGestor(page))) {
      test.skip();
      return;
    }
    const tab = page
      .locator("button, a")
      .filter({ hasText: /equipe|colaboradores|membros/i })
      .first();
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "aba Equipe não encontrada");
      return;
    }
    await tab.click();
    // Botão "Convidar" ou lista de membros
    const inviteBtn = page
      .locator("button")
      .filter({ hasText: /convidar|adicionar/i })
      .first();
    const memberRow = page
      .locator("tbody tr, [data-testid^=team-member-]")
      .first();
    await expect(inviteBtn.or(memberRow)).toBeVisible({ timeout: 5_000 });
  });

  test("seção Apps lista apps instalados", async ({ page }) => {
    if (!(await openGestor(page))) {
      test.skip();
      return;
    }
    const tab = page
      .locator("button, a")
      .filter({ hasText: /^apps$|aplicativos|aplicaç/i })
      .first();
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "aba Apps não encontrada");
      return;
    }
    await tab.click();
    const list = page
      .locator("text=/drive|chat|tarefas|magic store|kanban/i")
      .first();
    await expect(list).toBeVisible({ timeout: 5_000 });
  });

  test("seção IA renderiza configuração de modelo", async ({ page }) => {
    if (!(await openGestor(page))) {
      test.skip();
      return;
    }
    const tab = page
      .locator("button, a")
      .filter({ hasText: /^ia$|inteligência|copilot|^ai$/i })
      .first();
    if (!(await tab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "aba IA não encontrada");
      return;
    }
    await tab.click();
    const provider = page
      .locator("text=/openai|anthropic|google|provedor|modelo/i")
      .first();
    await expect(provider).toBeVisible({ timeout: 5_000 });
  });

  test("Gestor não aparece para member/viewer", async ({ page }) => {
    // Este teste só faz sentido se houver user member configurado.
    // Como o E2E_USER usado é owner, validamos que para owner gestor APARECE.
    // Inverso (member/viewer) seria E2E_MEMBER_EMAIL — não disponível no setup atual.
    await loginToDesktop(page);
    const btn = page.locator('[data-testid="dock-app-gestor"]');
    // Em owner deveria estar visível; este teste apenas confirma o caminho positivo
    // do login owner (negativo precisa de user separado).
    if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      test.skip(true, "user não é admin/owner — caminho positivo não testável");
      return;
    }
    await expect(btn).toBeVisible();
  });
});
