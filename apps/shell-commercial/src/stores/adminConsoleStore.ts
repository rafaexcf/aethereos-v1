import { create } from "zustand";

// Sprint 26: estrutura completa do Gestor (10 categorias do plano de redesign).
// Tabs antigas mantidas: aplicativos, integracoes, ia, planos, cadastros,
// usuarios. Aliases conceituais — usuarios → colaboradores (rename).

export type AdminConsoleTabId =
  // Painel
  | "visao-geral"
  // Pessoas & Equipe
  | "colaboradores"
  | "cargos-hierarquia"
  | "departamentos"
  | "grupos"
  // Permissões & Acessos
  | "perfis-acesso"
  | "regras-cargo"
  | "regras-app"
  | "permissoes-efetivas"
  | "horarios-acesso"
  | "politicas"
  // Aplicativos
  | "aplicativos"
  | "regras-distribuicao"
  | "config-por-app"
  // Inteligência Artificial
  | "ia"
  | "limites-uso-ia"
  | "permissoes-ia"
  | "historico-ia"
  // Integrações
  | "integracoes"
  | "webhooks"
  | "apis-externas"
  // Plano & Assinatura
  | "planos"
  | "consumo-limites"
  | "historico-pagamentos"
  // Segurança
  | "autenticacao-2fa"
  | "sessoes-ativas"
  | "dispositivos"
  | "alertas-risco"
  // Staff (Aethereos internal)
  | "staff-app-review"
  // Auditoria
  | "auditoria-log"
  | "trilha-alteracoes"
  | "exportar-relatorio"
  // Configurações Gerais
  | "cadastros"
  | "logo-branding"
  | "fuso-idioma"
  | "lgpd"
  // Compat — alias antigo
  | "usuarios";

interface AdminConsoleState {
  pendingTab: AdminConsoleTabId | null;
  setPendingTab: (tab: AdminConsoleTabId) => void;
  clearPendingTab: () => void;
}

export const useAdminConsoleStore = create<AdminConsoleState>((set) => ({
  pendingTab: null,
  setPendingTab: (tab) => set({ pendingTab: tab }),
  clearPendingTab: () => set({ pendingTab: null }),
}));
