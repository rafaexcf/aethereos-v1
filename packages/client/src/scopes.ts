/**
 * Sprint 23 MX123 — Catalogo central de scopes do SDK.
 *
 * Cada metodo do bridge handler resolve para um scope. Apps declaram
 * seus scopes em app_registry.permissions[]. Usuario aceita scopes ao
 * instalar (modal de consentimento). Grants ficam em
 * kernel.app_permission_grants per-company.
 *
 * R14: auth.read e scope base — todo app recebe automaticamente.
 */

export type ScopeId =
  | "auth.read"
  | "drive.read"
  | "drive.write"
  | "drive.delete"
  | "people.read"
  | "people.write"
  | "chat.read"
  | "chat.write"
  | "notifications.send"
  | "scp.emit"
  | "scp.subscribe"
  | "ai.chat"
  | "ai.embed"
  | "settings.read"
  | "settings.write"
  | "theme.read"
  | "windows.manage";

export interface ScopeDefinition {
  id: ScopeId;
  label: string;
  description: string;
  /** Scopes sensiveis exigem consentimento explicito no install. */
  sensitive: boolean;
  /** Icone Lucide sugerido para UI de consentimento. */
  icon: string;
}

export const SCOPE_CATALOG: Readonly<Record<ScopeId, ScopeDefinition>> = {
  "auth.read": {
    id: "auth.read",
    label: "Identidade",
    description: "Ler sua sessao ativa e perfil basico (nome, email).",
    sensitive: false,
    icon: "User",
  },
  "drive.read": {
    id: "drive.read",
    label: "Drive — leitura",
    description: "Listar e ler arquivos do seu Drive.",
    sensitive: false,
    icon: "Eye",
  },
  "drive.write": {
    id: "drive.write",
    label: "Drive — escrita",
    description: "Criar e editar arquivos no seu Drive.",
    sensitive: false,
    icon: "Edit",
  },
  "drive.delete": {
    id: "drive.delete",
    label: "Drive — exclusao",
    description: "Deletar arquivos do seu Drive.",
    sensitive: true,
    icon: "Trash2",
  },
  "people.read": {
    id: "people.read",
    label: "Pessoas — leitura",
    description: "Listar e ler contatos da empresa.",
    sensitive: false,
    icon: "Users",
  },
  "people.write": {
    id: "people.write",
    label: "Pessoas — escrita",
    description: "Criar e editar contatos da empresa.",
    sensitive: true,
    icon: "UserPlus",
  },
  "chat.read": {
    id: "chat.read",
    label: "Chat — leitura",
    description: "Ler canais e mensagens do chat interno.",
    sensitive: false,
    icon: "MessageSquare",
  },
  "chat.write": {
    id: "chat.write",
    label: "Chat — escrita",
    description: "Enviar mensagens em canais do chat interno.",
    sensitive: false,
    icon: "Send",
  },
  "notifications.send": {
    id: "notifications.send",
    label: "Notificacoes",
    description: "Enviar notificacoes para voce no sino do Dock.",
    sensitive: false,
    icon: "Bell",
  },
  "scp.emit": {
    id: "scp.emit",
    label: "Eventos SCP — emitir",
    description: "Emitir eventos do barramento SCP em nome do app.",
    sensitive: true,
    icon: "Radio",
  },
  "scp.subscribe": {
    id: "scp.subscribe",
    label: "Eventos SCP — escutar",
    description: "Escutar eventos do barramento SCP.",
    sensitive: false,
    icon: "Antenna",
  },
  "ai.chat": {
    id: "ai.chat",
    label: "AI — chat",
    description: "Usar o Copilot AI para chat (consome quota da empresa).",
    sensitive: true,
    icon: "Bot",
  },
  "ai.embed": {
    id: "ai.embed",
    label: "AI — embeddings",
    description: "Gerar embeddings vetoriais via LLM.",
    sensitive: false,
    icon: "Sparkles",
  },
  "settings.read": {
    id: "settings.read",
    label: "Configuracoes — leitura",
    description: "Ler suas preferencias de usuario.",
    sensitive: false,
    icon: "Settings",
  },
  "settings.write": {
    id: "settings.write",
    label: "Configuracoes — escrita",
    description: "Alterar suas preferencias de usuario.",
    sensitive: true,
    icon: "SlidersHorizontal",
  },
  "theme.read": {
    id: "theme.read",
    label: "Tema",
    description: "Ler o tema (light/dark) atual.",
    sensitive: false,
    icon: "Palette",
  },
  "windows.manage": {
    id: "windows.manage",
    label: "Janelas",
    description:
      "Gerenciar janelas do app: fechar, alterar titulo, enviar mensagens entre apps.",
    sensitive: false,
    icon: "AppWindow",
  },
};

/**
 * Mapping method (do AppBridgeHandler) -> scope necessario.
 * Usado tanto pelo handler para validar quanto por testes/UI.
 */
export const METHOD_SCOPE_MAP: Readonly<Record<string, ScopeId>> = {
  "auth.getSession": "auth.read",
  "auth.getUser": "auth.read",
  "drive.list": "drive.read",
  "drive.read": "drive.read",
  "drive.write": "drive.write",
  "drive.delete": "drive.delete",
  "people.list": "people.read",
  "people.create": "people.write",
  "people.update": "people.write",
  "chat.listChannels": "chat.read",
  "chat.sendMessage": "chat.write",
  "notifications.send": "notifications.send",
  "notifications.list": "notifications.send",
  "scp.emit": "scp.emit",
  "scp.subscribe": "scp.subscribe",
  "ai.chat": "ai.chat",
  "ai.embed": "ai.embed",
  "settings.get": "settings.read",
  "settings.set": "settings.write",
  "theme.getTheme": "theme.read",
  "windows.close": "windows.manage",
  "windows.setTitle": "windows.manage",
  "windows.sendMessage": "windows.manage",
};

/** Subset apenas com scopes sensitive=true. */
export const SENSITIVE_SCOPES: readonly ScopeId[] = (
  Object.values(SCOPE_CATALOG) as ScopeDefinition[]
)
  .filter((s) => s.sensitive)
  .map((s) => s.id);

/**
 * Scope base concedido automaticamente a qualquer app instalado (R14).
 */
export const BASE_SCOPE: ScopeId = "auth.read";

export function isSensitiveScope(scope: string): boolean {
  return (
    (SCOPE_CATALOG as Record<string, ScopeDefinition | undefined>)[scope]
      ?.sensitive === true
  );
}

export function getScope(scope: string): ScopeDefinition | undefined {
  return (SCOPE_CATALOG as Record<string, ScopeDefinition | undefined>)[scope];
}
