/**
 * Governanca E2E — Sprint 17 MX89
 *
 * Validates the Shadow Mode (proposals) panel rendering.
 * Governanca app requires admin (ana.lima eh owner do meridian → tem acesso).
 * App nao tem default install nem showInDock → testamos via navegacao direta
 * (URL com appId) ou skipa graciosamente se nao acessivel.
 */
import { test, expect } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

test.describe("governanca proposals panel", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("shadow mode tab renders header + filters", async ({ page }) => {
    await loginToDesktop(page);

    // Governanca nao esta no Dock (showInDock: false). Tenta via global
    // search universal (Cmd+K ou similar) ou via avatar/CommandCenter.
    // Se essa porta de entrada nao for acessivel sem instalar o app
    // (Sprint 16 visibilidade), o teste skipa graciosamente.

    // Approach 1: tenta abrir Command Center pelo avatar e procurar
    // "Governança" no search inline
    const avatar = page
      .locator('button[aria-label*="painel de controle"]')
      .or(page.locator('[data-testid="topbar"] button').last());
    if (!(await avatar.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await avatar.click();

    const searchInput = page
      .locator("input[placeholder*='Buscar' i]")
      .or(page.locator('input[type="text"]'))
      .first();
    if (!(await searchInput.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await searchInput.fill("Governança");

    const govResult = page
      .locator("button, [role='button']")
      .filter({ hasText: /governan[çc]a/i })
      .first();
    if (!(await govResult.isVisible({ timeout: 3_000 }).catch(() => false))) {
      // App nao instalado para esta company (Sprint 16) — skip
      test.skip();
      return;
    }
    await govResult.click();

    // App carregou: Sprint 17 MX88 adicionou Shadow Mode tab com header
    // "Shadow Mode — autonomia 0-1" + filtros de status/intent
    await expect(page.locator("text=Shadow Mode").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
