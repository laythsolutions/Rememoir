import { describe, it, expect, beforeEach } from "vitest";
import {
  isEncryptedText,
  generateSalt,
  deriveKey,
  encryptText,
  decryptText,
} from "../encryption";

describe("isEncryptedText", () => {
  it("returns true for enc: prefixed strings", () => {
    expect(isEncryptedText("enc:abc:def")).toBe(true);
    expect(isEncryptedText("enc:")).toBe(true);
  });

  it("returns false for plain strings", () => {
    expect(isEncryptedText("hello world")).toBe(false);
    expect(isEncryptedText("")).toBe(false);
    expect(isEncryptedText("ENc:uppercase")).toBe(false);
  });
});

describe("generateSalt", () => {
  it("returns a 16-byte Uint8Array", () => {
    const salt = generateSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("returns different values each call", () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toEqual(b);
  });
});

describe("deriveKey", () => {
  it("returns a CryptoKey", async () => {
    const salt = generateSalt();
    const key = await deriveKey("passphrase", salt);
    expect(key).toBeDefined();
    expect(key.type).toBe("secret");
    expect(key.algorithm.name).toBe("AES-GCM");
  });

  it("same passphrase + salt produces equivalent key", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("test-pass", salt);
    const key2 = await deriveKey("test-pass", salt);
    // Both should encrypt/decrypt the same plaintext
    const enc1 = await encryptText("hello", key1);
    const dec = await decryptText(enc1, key2);
    expect(dec).toBe("hello");
  });

  it("different passphrases produce incompatible keys", async () => {
    const salt = generateSalt();
    const key1 = await deriveKey("correct", salt);
    const key2 = await deriveKey("wrong", salt);
    const encrypted = await encryptText("secret", key1);
    await expect(decryptText(encrypted, key2)).rejects.toThrow();
  });
});

describe("encryptText / decryptText", () => {
  it("round-trips plaintext", async () => {
    const salt = generateSalt();
    const key = await deriveKey("my-passphrase", salt);
    const plaintext = "Hello, journal! 🌟";
    const encrypted = await encryptText(plaintext, key);

    expect(isEncryptedText(encrypted)).toBe(true);
    expect(encrypted).not.toContain(plaintext);

    const decrypted = await decryptText(encrypted, key);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext each call (random IV)", async () => {
    const salt = generateSalt();
    const key = await deriveKey("pass", salt);
    const enc1 = await encryptText("same text", key);
    const enc2 = await encryptText("same text", key);
    expect(enc1).not.toBe(enc2);
  });

  it("decryptText passes through non-encrypted strings", async () => {
    const salt = generateSalt();
    const key = await deriveKey("pass", salt);
    const result = await decryptText("plain text", key);
    expect(result).toBe("plain text");
  });
});
