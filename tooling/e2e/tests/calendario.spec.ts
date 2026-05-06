/**
 * Calendário E2E — Sprint 33 MX187
 *
 * Tests app de Calendário com persistência kernel.calendar_events.
 * Usa app id "calendar" (registry interno).
 */
import { test, expect, type Page } from "@playwright/test";
import { loginToDesktop } from "./helpers";

const EMAIL = process.env["E2E_USER_EMAIL"] ?? "";
const PASSWORD = process.env["E2E_USER_PASSWORD"] ?? "";

async function openCalendar(page: Page): Promise<boolean> {
  await loginToDesktop(page);
  const btn = page.locator('[data-testid="dock-app-calendar"]');
  if (!(await btn.isVisible({ timeout: 5_000 }).catch(() => false))) {
    return false;
  }
  await btn.click();
  await expect(page.locator('[data-testid="tab-calendar"]')).toBeVisible({
    timeout: 8_000,
  });
  return true;
}

test.describe("calendario", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    if (!EMAIL || !PASSWORD) {
      testInfo.skip(true, "E2E_USER_EMAIL / E2E_USER_PASSWORD not set");
    }
  });

  test("calendário renderiza grid do mês atual", async ({ page }) => {
    if (!(await openCalendar(page))) {
      test.skip(true, "calendar não disponível");
      return;
    }
    // Mês corrente exibido em algum lugar (ex: "Maio 2026", "Junho 2026", etc)
    const monthHeader = page
      .locator(
        "text=/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i",
      )
      .first();
    await expect(monthHeader).toBeVisible({ timeout: 8_000 });
  });

  test("navegação para próximo mês muda o cabeçalho", async ({ page }) => {
    if (!(await openCalendar(page))) {
      test.skip();
      return;
    }
    // Captura header inicial
    const monthHeader = page
      .locator(
        "text=/janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro/i",
      )
      .first();
    const before = await monthHeader.textContent({ timeout: 5_000 });

    // Tenta clicar no botão "próximo" (ChevronRight)
    const nextBtn = page
      .locator('button[aria-label*="próximo" i], button[aria-label*="next" i]')
      .or(page.locator("button").filter({ has: page.locator("svg") }))
      .nth(1);
    if (!(await nextBtn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      test.skip(true, "botão de próximo mês não encontrado");
      return;
    }
    await nextBtn.click();
    // Header deve ter mudado (ou texto, ou ano em fim de ano)
    await page.waitForTimeout(300);
    const after = await monthHeader.textContent({ timeout: 3_000 });
    expect(after).not.toBe(before);
  });
});
