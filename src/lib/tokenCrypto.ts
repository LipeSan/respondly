import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Google OAuth tokens are stored encrypted at rest (AES-256-GCM).
//
// Stored format: "enc:v1:<iv>:<authTag>:<ciphertext>" (each part base64).
// Values without the prefix are legacy plaintext tokens written before encryption
// existed: decryptToken returns them unchanged, so existing connections keep working
// until they are rewritten (token refresh, reconnect, or scripts/encrypt-google-tokens.mjs).
//
// Key: TOKEN_ENCRYPTION_KEY = 32 random bytes, base64. Generate with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
// Losing or changing this key makes every encrypted token unreadable (all customers
// would have to reconnect Google), so keep a copy outside Vercel.

const PREFIX = "enc:v1:";
const IV_BYTES = 12;

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  }
  cachedKey = key;
  return key;
}

export function isEncryptedToken(value: string): boolean {
  return value.startsWith(PREFIX);
}

export function encryptToken(plain: string): string {
  // Empty means "no token" (e.g. missing refresh token); keep it empty so `!token` checks still work.
  if (!plain) return "";
  // Never double-encrypt.
  if (isEncryptedToken(plain)) return plain;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptToken(stored: string): string {
  if (!stored || !isEncryptedToken(stored)) return stored; // legacy plaintext

  const parts = stored.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Malformed encrypted token");
  const [iv, tag, ciphertext] = parts.map((p) => Buffer.from(p, "base64"));

  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
