import type {
  AuthDriver,
  AuthVerifyResult,
  CapabilityToken,
  Session,
} from "@aethereos/drivers";
import type { Actor, Result } from "@aethereos/drivers";
import { ok, err } from "@aethereos/drivers";
import type { ValidationError, NetworkError } from "@aethereos/drivers";
import { AuthError } from "@aethereos/drivers";

type AuthDriverError = AuthError | NetworkError | ValidationError;

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(
    u.byteOffset,
    u.byteOffset + u.byteLength,
  ) as ArrayBuffer;
}

// ── JWT helpers (Ed25519 via Web Crypto, no external libs) ───────────────────

function toBase64Url(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function fromBase64Url(s: string): Uint8Array {
  const padded = s
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function encodeJson(obj: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(obj)));
}

function decodeJson(s: string): unknown {
  return JSON.parse(new TextDecoder().decode(fromBase64Url(s)));
}

async function signJwt(
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
): Promise<string> {
  const header = encodeJson({ alg: "EdDSA", typ: "JWT" });
  const body = encodeJson(payload);
  const signingInput = `${header}.${body}`;
  const rawSig = await crypto.subtle.sign(
    "Ed25519",
    privateKey,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${toBase64Url(rawSig)}`;
}

async function verifyJwt(
  token: string,
  publicKey: CryptoKey,
): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts as [string, string, string];
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = fromBase64Url(sigB64);
  const valid = await crypto.subtle.verify(
    "Ed25519",
    publicKey,
    toArrayBuffer(sig),
    new TextEncoder().encode(signingInput),
  );
  if (!valid) return null;
  return decodeJson(payloadB64) as Record<string, unknown>;
}

// ── Driver ────────────────────────────────────────────────────────────────────

export interface LocalIdentity {
  keyPair: CryptoKeyPair;
  userId: string;
  companyId: string;
}

export interface LocalAuthDriverOptions {
  identity: LocalIdentity;
  session?: Session;
}

/**
 * LocalAuthDriver — offline auth using Ed25519 JWTs (Web Crypto API only).
 * No passphrase derivation here; caller provides the identity from boot.ts.
 */
export class LocalAuthDriver implements AuthDriver {
  private readonly identity: LocalIdentity;
  private currentSession: Session | null;
  private revokedTokens = new Set<string>();

  constructor(options: LocalAuthDriverOptions) {
    this.identity = options.identity;
    this.currentSession = options.session ?? null;
  }

  async verifyToken(
    token: string,
  ): Promise<Result<AuthVerifyResult, AuthDriverError>> {
    if (this.revokedTokens.has(token)) {
      return err(new AuthError("token revoked"));
    }
    try {
      const payload = await verifyJwt(token, this.identity.keyPair.publicKey);
      if (!payload) return err(new AuthError("invalid signature"));
      const exp = payload["exp"];
      if (typeof exp === "number" && Date.now() / 1000 > exp) {
        return err(new AuthError("token expired"));
      }
      const actorType = (payload["actor_type"] as string) ?? "human";
      const actor: Actor =
        actorType === "agent"
          ? {
              type: "agent" as const,
              agent_id: (payload["agent_id"] as string) ?? "",
              supervising_user_id:
                (payload["supervising_user_id"] as string) ?? "",
            }
          : {
              type: "human" as const,
              user_id: (payload["sub"] as string) ?? this.identity.userId,
            };

      return ok({
        actor,
        company_id:
          (payload["company_id"] as string) ?? this.identity.companyId,
        capabilities: (payload["capabilities"] as string[]) ?? [],
      });
    } catch {
      return err(new AuthError("token verification failed"));
    }
  }

  async getSession(): Promise<Result<Session | null, AuthDriverError>> {
    if (this.currentSession !== null) {
      if (Date.now() / 1000 > this.currentSession.expires_at) {
        this.currentSession = null;
        return ok(null);
      }
    }
    return ok(this.currentSession);
  }

  async issueSessionToken(
    ttlSeconds = 3600,
  ): Promise<Result<string, AuthDriverError>> {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: this.identity.userId,
      company_id: this.identity.companyId,
      actor_type: "human",
      iat: now,
      exp: now + ttlSeconds,
      capabilities: ["*"],
    };
    try {
      const token = await signJwt(payload, this.identity.keyPair.privateKey);
      const session: Session = {
        access_token: token,
        expires_at: now + ttlSeconds,
        user_id: this.identity.userId,
      };
      this.currentSession = session;
      return ok(token);
    } catch {
      return err(new AuthError("failed to issue session token"));
    }
  }

  async issueCapabilityToken(params: {
    agent_id: string;
    supervising_user_id: string;
    requested_capabilities: string[];
    ttl_seconds?: number;
  }): Promise<Result<CapabilityToken, AuthDriverError>> {
    const ttl = params.ttl_seconds ?? 900;
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: params.agent_id,
      supervising_user_id: params.supervising_user_id,
      company_id: this.identity.companyId,
      actor_type: "agent",
      agent_id: params.agent_id,
      capabilities: params.requested_capabilities,
      iat: now,
      exp: now + ttl,
    };
    try {
      const signature = await signJwt(
        payload,
        this.identity.keyPair.privateKey,
      );
      return ok({
        agent_id: params.agent_id,
        supervising_user_id: params.supervising_user_id,
        capabilities: params.requested_capabilities,
        expires_at: now + ttl,
        signature,
      });
    } catch {
      return err(new AuthError("failed to issue capability token"));
    }
  }

  async revoke(token: string): Promise<Result<void, AuthDriverError>> {
    this.revokedTokens.add(token);
    if (this.currentSession?.access_token === token) {
      this.currentSession = null;
    }
    return ok(undefined);
  }

  async ping(): Promise<Result<void, AuthDriverError>> {
    return ok(undefined);
  }
}

/**
 * Generates a new Ed25519 identity for a device (first run).
 */
export async function generateLocalIdentity(params: {
  userId: string;
  companyId: string;
}): Promise<LocalIdentity> {
  const keyPair = await crypto.subtle.generateKey("Ed25519", true, [
    "sign",
    "verify",
  ]);
  return { keyPair, userId: params.userId, companyId: params.companyId };
}

/**
 * Exports the private key encrypted with AES-GCM (PBKDF2 key derivation).
 * For persistent storage in IndexedDB/OPFS.
 */
export async function exportEncryptedPrivateKey(
  privateKey: CryptoKey,
  passphrase: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const saltBuffer = toArrayBuffer(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const wrappingKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey"],
  );
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const wrapped = await crypto.subtle.wrapKey(
    "pkcs8",
    privateKey,
    wrappingKey,
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
  );
  const out = new Uint8Array(12 + wrapped.byteLength);
  out.set(iv, 0);
  out.set(new Uint8Array(wrapped), 12);
  return out;
}

/**
 * Imports an encrypted private key (reverse of exportEncryptedPrivateKey).
 */
export async function importEncryptedPrivateKey(
  data: Uint8Array,
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const saltBuffer = toArrayBuffer(salt);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const wrappingKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBuffer, iterations: 600_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["unwrapKey"],
  );
  const iv = data.slice(0, 12);
  const wrapped = data.slice(12);
  return crypto.subtle.unwrapKey(
    "pkcs8",
    toArrayBuffer(wrapped),
    wrappingKey,
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    "Ed25519",
    true,
    ["sign"],
  );
}
