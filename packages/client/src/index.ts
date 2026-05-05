// Sprint 22 MX117 — @aethereos/client public API.

export { createAethereosClient } from "./client.js";
export type { AethereosClient, CreateClientOptions } from "./client.js";

export type { Transport, SubscribeUnsub } from "./transport.js";

export { DirectTransport } from "./transports/direct.js";
export type { DirectRouter, DirectEventBus } from "./transports/direct.js";

export { BridgeTransport, BRIDGE_PROTOCOL } from "./transports/bridge.js";
export type { BridgeTransportOptions } from "./transports/bridge.js";

export {
  SdkError,
  type SessionInfo,
  type UserProfile,
  type FileEntry,
  type Person,
  type PersonInput,
  type Channel,
  type ChatMessage,
  type NotificationItem,
  type NotificationOpts,
  type ScpEmitResult,
  type AiChatMessage,
  type AiChatOpts,
  type AiChatResult,
  type AiEmbedResult,
  type Theme,
  type SdkErrorPayload,
  type BridgeContext,
} from "./types.js";

export {
  SCOPE_CATALOG,
  METHOD_SCOPE_MAP,
  SENSITIVE_SCOPES,
  BASE_SCOPE,
  isSensitiveScope,
  getScope,
  type ScopeId,
  type ScopeDefinition,
} from "./scopes.js";

export {
  AethereosManifestSchema,
  parseManifest,
  type AethereosManifest,
} from "./manifest.js";

export { AuthModule } from "./modules/auth.js";
export { DriveModule } from "./modules/drive.js";
export { PeopleModule } from "./modules/people.js";
export { ChatModule } from "./modules/chat.js";
export { NotificationsModule } from "./modules/notifications.js";
export { ScpModule } from "./modules/scp.js";
export { AiModule } from "./modules/ai.js";
export { SettingsModule } from "./modules/settings.js";
export { WindowsModule } from "./modules/windows.js";
export { ThemeModule } from "./modules/theme.js";
