/**
 * @aethereos/client — tipos compartilhados.
 *
 * O SDK funciona em 2 modos:
 *  - Direct: apps nativos do shell consomem via injecao de drivers
 *  - Bridge: apps iframe third-party usam postMessage para o host shell
 *
 * Sprint 22 MX117.
 */

export interface SessionInfo {
  userId: string;
  email: string | null;
  companyId: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl?: string | null;
}

export interface FileEntry {
  id: string;
  name: string;
  parentId: string | null;
  isFolder: boolean;
  mimeType: string | null;
  sizeBytes: number;
  storagePath: string | null;
  createdAt: string;
}

export interface Person {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
}

export interface PersonInput {
  fullName: string;
  email?: string;
  phone?: string;
}

export interface Channel {
  id: string;
  name: string;
  kind: "public" | "private" | "direct";
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  sourceApp: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationOpts {
  type?: "info" | "success" | "warning" | "error";
  sourceId?: string;
}

export interface ScpEmitResult {
  eventId: string;
}

export interface AiChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiChatOpts {
  maxTokens?: number;
  temperature?: number;
}

export interface AiChatResult {
  content: string;
  model: string;
}

export interface AiEmbedResult {
  embedding: number[];
}

export type Theme = "light" | "dark";

export interface SdkErrorPayload {
  code: string;
  message: string;
  data?: unknown;
}

/** Erro tipado emitido por todas as chamadas do SDK. */
export class SdkError extends Error {
  readonly code: string;
  readonly data: unknown;
  constructor(payload: SdkErrorPayload) {
    super(payload.message);
    this.name = "SdkError";
    this.code = payload.code;
    this.data = payload.data;
  }
}

/** Contexto entregue ao iframe via handshake ACK. */
export interface BridgeContext {
  appId: string;
  companyId: string;
  userId: string;
  theme: Theme;
}
