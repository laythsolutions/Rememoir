"use client";

// ─── Storage keys ─────────────────────────────────────────────────────────────

const SALT_KEY = "rememoir_enc_salt";
const SENTINEL_KEY = "rememoir_enc_sentinel";
const ENABLED_KEY = "rememoir_enc_enabled";
const HINT_KEY = "rememoir_enc_hint";
const SENTINEL_VALUE = "rememoir-ok";

// ─── Session key (module singleton) ──────────────────────────────────────────

let sessionKey: CryptoKey | null = null;

export function setSessionKey(key: CryptoKey): void {
  sessionKey = key;
}

export function getSessionKey(): CryptoKey | null {
  return sessionKey;
}

export function clearSessionKey(): void {
  sessionKey = null;
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

export function isEncryptionEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(ENABLED_KEY) === "true";
}

// ─── Crypto primitives ────────────────────────────────────────────────────────

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: new Uint8Array(salt), iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/** Encrypt plaintext → "enc:<base64-iv>:<base64-ciphertext>" */
export async function encryptText(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  const ivB64 = btoa(String.fromCharCode(...iv));
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
  return `enc:${ivB64}:${ctB64}`;
}

/** Decrypt "enc:<base64-iv>:<base64-ciphertext>" → plaintext */
export async function decryptText(
  encoded: string,
  key: CryptoKey
): Promise<string> {
  if (!isEncryptedText(encoded)) return encoded;
  const parts = encoded.split(":");
  const ivB64 = parts[1];
  const ctB64 = parts.slice(2).join(":");
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ct = Uint8Array.from(atob(ctB64), (c) => c.charCodeAt(0));
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(plainBuf);
}

export function isEncryptedText(s: string): boolean {
  return typeof s === "string" && s.startsWith("enc:");
}

// ─── Sentinel helpers ─────────────────────────────────────────────────────────

async function getSalt(): Promise<Uint8Array | null> {
  const stored = localStorage.getItem(SALT_KEY);
  if (!stored) return null;
  return Uint8Array.from(atob(stored), (c) => c.charCodeAt(0));
}

// ─── High-level API ───────────────────────────────────────────────────────────

/** Enable encryption: generate salt, derive key, store sentinel, mark enabled. Optionally store a passphrase hint. */
export async function enableEncryption(passphrase: string, hint?: string): Promise<void> {
  const salt = generateSalt();
  const saltB64 = btoa(String.fromCharCode(...salt));
  const key = await deriveKey(passphrase, salt);
  const sentinel = await encryptText(SENTINEL_VALUE, key);
  localStorage.setItem(SALT_KEY, saltB64);
  localStorage.setItem(SENTINEL_KEY, sentinel);
  localStorage.setItem(ENABLED_KEY, "true");
  if (hint?.trim()) {
    localStorage.setItem(HINT_KEY, hint.trim());
  } else {
    localStorage.removeItem(HINT_KEY);
  }
  setSessionKey(key);
}

/** Disable encryption: clear all localStorage keys, clear session key */
export function disableEncryption(): void {
  localStorage.removeItem(SALT_KEY);
  localStorage.removeItem(SENTINEL_KEY);
  localStorage.removeItem(ENABLED_KEY);
  localStorage.removeItem(HINT_KEY);
  clearSessionKey();
}

/** Returns the stored passphrase hint, or null if none set. */
export function getEncryptionHint(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(HINT_KEY);
}

/** Derive key from passphrase, verify against sentinel. Returns derived key if ok, null if wrong. */
export async function verifyPassphrase(
  passphrase: string
): Promise<CryptoKey | null> {
  const salt = await getSalt();
  if (!salt) return null;
  const sentinel = localStorage.getItem(SENTINEL_KEY);
  if (!sentinel) return null;
  try {
    const key = await deriveKey(passphrase, salt);
    const decrypted = await decryptText(sentinel, key);
    if (decrypted === SENTINEL_VALUE) return key;
    return null;
  } catch {
    return null;
  }
}
