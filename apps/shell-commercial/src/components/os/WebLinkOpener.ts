/**
 * Sprint 21 MX113: helper para apps com entry_mode='weblink'.
 *
 * Apps weblink nao criam aba no shell — apenas abrem o URL em nova aba do
 * browser. Util para servicos de terceiros que bloqueiam iframe (claude.ai,
 * chatgpt, gemini etc.) ou para apps puter/jogos que vivem em outro dominio.
 */
export function openWebLink(url: string): void {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
