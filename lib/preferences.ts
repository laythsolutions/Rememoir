const PREFS_KEY = "rememoir_prefs";

export type PromptFrequency = "daily" | "every3days" | "weekly" | "off";

export interface Preferences {
  promptFrequency: PromptFrequency;
  lastPromptDate: string | null; // YYYY-MM-DD
}

const DEFAULTS: Preferences = {
  promptFrequency: "daily",
  lastPromptDate: null,
};

export function getPreferences(): Preferences {
  if (typeof localStorage === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function savePreferences(p: Partial<Preferences>): void {
  const current = getPreferences();
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...p }));
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isPromptDue(): boolean {
  const { promptFrequency, lastPromptDate } = getPreferences();
  if (promptFrequency === "off") return false;
  if (!lastPromptDate) return true;

  const today = todayKey();
  if (lastPromptDate === today) return false;

  const last = new Date(lastPromptDate);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (promptFrequency === "daily") return daysDiff >= 1;
  if (promptFrequency === "every3days") return daysDiff >= 3;
  if (promptFrequency === "weekly") return daysDiff >= 7;
  return false;
}

export function markPromptShown(): void {
  savePreferences({ lastPromptDate: todayKey() });
}
