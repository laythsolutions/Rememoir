import type { RememoirEntry } from "./types";

const DISMISS_KEY = "rememoir_crisis_dismissed";

/** Returns true if 3 or more of the last 5 AI-analysed entries are "challenging" */
export function detectCrisisPattern(entries: RememoirEntry[]): boolean {
  const analysed = entries
    .filter((e) => !e.deleted && e.aiInsight)
    .slice(0, 5);

  if (analysed.length < 3) return false;

  const challengingCount = analysed.filter(
    (e) => e.aiInsight!.sentiment === "challenging"
  ).length;

  return challengingCount >= 3;
}

/** Returns true if the user has dismissed the banner this week */
export function isCrisisBannerDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = new Date(raw);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  return dismissedAt > weekAgo;
}

/** Dismiss the banner for 7 days */
export function dismissCrisisBanner(): void {
  localStorage.setItem(DISMISS_KEY, new Date().toISOString());
}
