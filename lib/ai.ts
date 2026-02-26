"use client";

import type { AIInsight } from "./types";

const AI_KEY = "rememoir_ai_key";
const AI_ENABLED = "rememoir_ai_enabled";

export function getAIKey(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AI_KEY);
}

export function setAIKey(key: string): void {
  localStorage.setItem(AI_KEY, key);
}

export function isAIEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AI_ENABLED) === "true";
}

export function setAIEnabled(enabled: boolean): void {
  localStorage.setItem(AI_ENABLED, enabled ? "true" : "false");
}

export async function analyzeEntry(
  text: string,
  existingTags: string[]
): Promise<AIInsight | null> {
  const key = getAIKey();
  if (!key || !isAIEnabled()) return null;
  try {
    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ text, existingTags }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return {
      sentiment: data.sentiment,
      intensity: data.intensity ?? 3,
      summary: data.summary,
      suggestedTags: data.suggestedTags ?? [],
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function generateSmartPrompt(
  recentEntries: Array<{ text: string; createdAt: string }>
): Promise<string | null> {
  const key = getAIKey();
  if (!key || !isAIEnabled()) return null;
  try {
    const res = await fetch("/api/ai/prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ recentEntries }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.prompt ?? null;
  } catch {
    return null;
  }
}

export async function draftAutobiography(
  entries: Array<{ text: string; createdAt: string }>
): Promise<string | null> {
  const key = getAIKey();
  if (!key || !isAIEnabled()) return null;
  try {
    const res = await fetch("/api/ai/autobiography", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: JSON.stringify({ entries }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.draft ?? null;
  } catch {
    return null;
  }
}
