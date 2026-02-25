import type { RememoirEntry } from "./types";

export interface DailyPoint {
  /** "2024-02-14" — used for sorting */
  dateKey: string;
  /** "Feb 14" — used for chart label */
  label: string;
  /** Number of entries that day */
  count: number;
}

export interface JournalStats {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  /** Total word count across all entries */
  totalWords: number;
  /** Entries written in the current calendar month */
  entriesThisMonth: number;
  /** One point per day for the last 30 days */
  last30Days: DailyPoint[];
}

/** Returns "YYYY-MM-DD" in local time */
function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Returns "YYYY-MM-DD" from an ISO string, in local time */
function entryDateKey(iso: string): string {
  return localDateKey(new Date(iso));
}

export function computeStats(entries: RememoirEntry[]): JournalStats {
  const active = entries.filter((e) => !e.deleted);
  const total = active.length;

  // ── Total words ──────────────────────────────────────────────────────────────
  const totalWords = active.reduce((sum, e) => {
    return sum + (e.text?.trim().split(/\s+/).filter(Boolean).length ?? 0);
  }, 0);

  // ── This month ───────────────────────────────────────────────────────────────
  const now = new Date();
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const entriesThisMonth = active.filter((e) =>
    e.createdAt.startsWith(thisMonthPrefix)
  ).length;

  // ── Entry dates set (local) ──────────────────────────────────────────────────
  const entryDateSet = new Set(active.map((e) => entryDateKey(e.createdAt)));

  // ── Current streak ───────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentStreak = 0;
  const cursor = new Date(today);

  if (!entryDateSet.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (entryDateSet.has(localDateKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // ── Longest streak ───────────────────────────────────────────────────────────
  const sortedKeys = [...entryDateSet].sort();
  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < sortedKeys.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(sortedKeys[i - 1]);
      const curr = new Date(sortedKeys[i]);
      const diffDays = Math.round(
        (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      );
      run = diffDays === 1 ? run + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, run);
  }

  // ── Last 30 days ─────────────────────────────────────────────────────────────
  // Build a count map first (O(n)) rather than filtering per day (O(n×30))
  const countByDate = new Map<string, number>();
  for (const e of active) {
    const k = entryDateKey(e.createdAt);
    countByDate.set(k, (countByDate.get(k) ?? 0) + 1);
  }

  const last30Days: DailyPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateKey = localDateKey(date);
    last30Days.push({
      dateKey,
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      count: countByDate.get(dateKey) ?? 0,
    });
  }

  return {
    totalEntries: total,
    currentStreak,
    longestStreak,
    totalWords,
    entriesThisMonth,
    last30Days,
  };
}
