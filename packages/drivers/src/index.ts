// Types
export type { Result } from "./types/result.js";
export { ok, err, isOk, isErr } from "./types/result.js";
export type {
  Actor,
  ActorType,
  TenantContext,
} from "./types/tenant-context.js";
export {
  ActorSchema,
  ActorTypeSchema,
  TenantContextSchema,
} from "./types/tenant-context.js";
export type { EventEnvelope, PlatformEvent } from "./types/platform-event.js";
export { EventEnvelopeSchema } from "./types/platform-event.js";

// Errors
export {
  DriverError,
  DatabaseError,
  NetworkError,
  AuthError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TimeoutError,
  UnavailableError,
} from "./errors.js";

// Interfaces
export type {
  DatabaseDriver,
  TransactionContext,
} from "./interfaces/database.js";
export type {
  EventBusDriver,
  EventHandler,
  Subscription,
  SubscribeOptions,
} from "./interfaces/event-bus.js";
export type {
  VectorDriver,
  VectorRecord,
  VectorSearchResult,
  VectorSearchOptions,
} from "./interfaces/vector.js";
export type {
  StorageDriver,
  StorageObject,
  UploadOptions,
} from "./interfaces/storage.js";
export type {
  AuthDriver,
  Session,
  CapabilityToken,
  AuthVerifyResult,
} from "./interfaces/auth.js";
export type { SecretsDriver } from "./interfaces/secrets.js";
export type { CacheDriver } from "./interfaces/cache.js";
export type {
  FeatureFlagDriver,
  FlagContext,
} from "./interfaces/feature-flags.js";
export type {
  LLMDriver,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMEmbeddingResult,
} from "./interfaces/llm.js";
export type {
  ObservabilityDriver,
  Span,
  SpanOptions,
  MetricOptions,
} from "./interfaces/observability.js";
