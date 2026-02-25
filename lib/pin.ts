"use client";

const PIN_KEY = "rememoir_pin_hash";

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setPin(pin: string): Promise<void> {
  const hash = await sha256(pin);
  localStorage.setItem(PIN_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = localStorage.getItem(PIN_KEY);
  if (!stored) return true;
  const hash = await sha256(pin);
  return hash === stored;
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY);
}

export function hasPinSet(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}
