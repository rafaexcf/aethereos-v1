import type { SecretsDriver } from "@aethereos/drivers";
import type { Result } from "@aethereos/drivers";
import { ok, err } from "@aethereos/drivers";
import type { NetworkError } from "@aethereos/drivers";
import { AuthError, NotFoundError } from "@aethereos/drivers";

type SecretsDriverError = AuthError | NotFoundError | NetworkError;

function toArrayBuffer(u: Uint8Array): ArrayBuffer {
  return u.buffer.slice(
    u.byteOffset,
    u.byteOffset + u.byteLength,
  ) as ArrayBuffer;
}

/**
 * Derives an AES-GCM key from a passphrase using PBKDF2 (600k iterations, SHA-256).
 * Pure Web Crypto API — no external libraries.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: 600_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptValue(
  key: CryptoKey,
  plaintext: string,
): Promise<Uint8Array> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    new TextEncoder().encode(plaintext),
  );
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);
  return result;
}

async function decryptValue(key: CryptoKey, data: Uint8Array): Promise<string> {
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

interface StoredSecret {
  data: Uint8Array;
  expiresAt: number | null;
}

/**
 * WebCryptoSecretsDriver — AES-GCM encrypted secrets via Web Crypto API.
 * Key is provided externally (derived from user passphrase by the boot sequence).
 */
export class WebCryptoSecretsDriver implements SecretsDriver {
  private store = new Map<string, StoredSecret>();

  constructor(private readonly key: CryptoKey) {}

  async get(key: string): Promise<Result<string, SecretsDriverError>> {
    const entry = this.store.get(key);
    if (!entry) return err(new NotFoundError(`secret not found: ${key}`));
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return err(new NotFoundError(`secret expired: ${key}`));
    }
    try {
      const value = await decryptValue(this.key, entry.data);
      return ok(value);
    } catch {
      return err(new AuthError("decryption failed"));
    }
  }

  async getMany(
    keys: string[],
  ): Promise<Result<Record<string, string>, SecretsDriverError>> {
    const result: Record<string, string> = {};
    for (const key of keys) {
      const r = await this.get(key);
      if (!r.ok) return r as Result<Record<string, string>, SecretsDriverError>;
      if (r.value !== null) {
        result[key] = r.value;
      }
    }
    return ok(result);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<Result<void, SecretsDriverError>> {
    try {
      const data = await encryptValue(this.key, value);
      const expiresAt =
        ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : null;
      this.store.set(key, { data, expiresAt });
      return ok(undefined);
    } catch {
      return err(new AuthError("encryption failed"));
    }
  }

  async delete(
    key: string,
  ): Promise<Result<void, SecretsDriverError | NotFoundError>> {
    if (!this.store.has(key)) {
      return err(new NotFoundError(`secret not found: ${key}`));
    }
    this.store.delete(key);
    return ok(undefined);
  }

  async ping(): Promise<Result<void, SecretsDriverError>> {
    return ok(undefined);
  }
}
