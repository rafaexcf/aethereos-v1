// Sprint 27 MX148: tradução de erros HTTP/network/auth pra mensagens
// amigáveis em português. Use em catch blocks de fetch / Supabase calls.
//
// Uso:
//   import { friendlyError } from "../lib/error-messages";
//   try { ... } catch (err) { toast(friendlyError(err)); }

interface HttpError {
  status?: number;
  message?: string;
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Dados inválidos. Verifique e tente novamente.",
  401: "Sessão expirada. Faça login novamente.",
  403: "Você não tem permissão para esta ação.",
  404: "Recurso não encontrado.",
  409: "Já existe um item com esses dados.",
  422: "Dados inválidos. Verifique os campos obrigatórios.",
  429: "Muitas tentativas. Aguarde alguns minutos.",
  500: "Erro interno. Tente novamente em alguns instantes.",
  502: "Servidor indisponível. Tente novamente.",
  503: "Servidor sobrecarregado. Tente novamente em instantes.",
  504: "Tempo esgotado. Verifique sua conexão.",
};

export function friendlyError(err: unknown): string {
  if (err === null || err === undefined) {
    return "Erro desconhecido. Tente novamente.";
  }
  if (typeof err === "string") return err;
  if (err instanceof Error) {
    const lower = err.message.toLowerCase();
    if (
      lower.includes("network") ||
      lower.includes("failed to fetch") ||
      lower.includes("load failed")
    ) {
      return "Sem conexão. Verifique sua internet.";
    }
    if (lower.includes("aborted") || lower.includes("timeout")) {
      return "Tempo esgotado. Tente novamente.";
    }
    return err.message;
  }
  if (typeof err === "object") {
    const e = err as HttpError;
    if (typeof e.status === "number") {
      const msg = STATUS_MESSAGES[e.status];
      if (msg !== undefined) return msg;
    }
    if (typeof e.message === "string" && e.message.length > 0) {
      return e.message;
    }
  }
  return "Erro inesperado. Tente novamente.";
}

export function statusMessage(status: number): string {
  return STATUS_MESSAGES[status] ?? `Erro ${status}.`;
}
