/**
 * Hierarquia de erros do Driver Model.
 * Toda implementação concreta de driver retorna subclasses desta hierarquia.
 * Ref: Fundamentação 4.7 [INV]
 */
export class DriverError extends Error {
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DriverError";
    this.code = code;
    if (context !== undefined) this.context = context;
  }
}

export class DatabaseError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATABASE_ERROR", context);
    this.name = "DatabaseError";
  }
}

export class NetworkError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", context);
    this.name = "NetworkError";
  }
}

export class AuthError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "AUTH_ERROR", context);
    this.name = "AuthError";
  }
}

export class ValidationError extends DriverError {
  readonly issues: unknown[];

  constructor(
    message: string,
    issues: unknown[],
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", context);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class NotFoundError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NOT_FOUND", context);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "CONFLICT", context);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends DriverError {
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    retryAfterMs?: number,
    context?: Record<string, unknown>,
  ) {
    super(message, "RATE_LIMIT", context);
    this.name = "RateLimitError";
    if (retryAfterMs !== undefined) this.retryAfterMs = retryAfterMs;
  }
}

export class TimeoutError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "TIMEOUT", context);
    this.name = "TimeoutError";
  }
}

export class UnavailableError extends DriverError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "UNAVAILABLE", context);
    this.name = "UnavailableError";
  }
}
