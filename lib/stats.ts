import type { RememoirEntry } from "./types";

// ─── Sentiment stats ──────────────────────────────────────────────────────────

export interface SentimentCounts {
  positive: number;
  reflective: number;
  challenging: number;
  neutral: number;
  total: number;
}

export interface WeeklyScore {
  /** "Week of Mar 3" */
  label: string;
  /** -1 (all challenging) … +1 (all positive) */
  score: number;
  /** Number of AI-analysed entries that week */
  analysed: number;
}

export interface SentimentStats {
  last30: SentimentCounts;
  weeklyScores: WeeklyScore[]; // last 4 weeks, oldest first
}

const SENTIMENT_SCORE: Record<string, number> = {
  positive: 1,
  reflective: 0.33,
  neutral: 0,
  challenging: -1,
};

export function computeSentimentStats(entries: RememoirEntry[]): SentimentStats {
  const active = entries.filter((e) => !e.deleted && e.aiInsight);
  const now = new Date();

  // ── Last-30-day counts ────────────────────────────────────────────────────────
  const cutoff30 = new Date(now);
  cutoff30.setDate(cutoff30.getDate() - 30);

  const last30: SentimentCounts = { positive: 0, reflective: 0, challenging: 0, neutral: 0, total: 0 };
  for (const e of active) {
    if (new Date(e.createdAt) < cutoff30) continue;
    const s = e.aiInsight!.sentiment;
    last30[s] = (last30[s] ?? 0) + 1;
    last30.total++;
  }

  // ── Weekly scores (last 4 weeks) ──────────────────────────────────────────────
  const weeklyScores: WeeklyScore[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekEntries = active.filter((e) => {
      const d = new Date(e.createdAt);
      return d >= weekStart && d < weekEnd;
    });

    const analysed = weekEntries.length;
    const score = analysed === 0
      ? 0
      : weekEntries.reduce((sum, e) => sum + (SENTIMENT_SCORE[e.aiInsight!.sentiment] ?? 0), 0) / analysed;

    weeklyScores.push({
      label: `Wk ${weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      score: Math.round(score * 100) / 100,
      analysed,
    });
  }

  return { last30, weeklyScores };
}

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
  /** Word count of the longest single entry */
  longestEntryWords: number;
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

// ─── Pattern / correlation stats ──────────────────────────────────────────────

export interface TimeSlotPattern {
  slot: "morning" | "afternoon" | "evening" | "night";
  label: string;
  emoji: string;
  avgScore: number; // -1 … +1
  count: number;
}

export interface TagPattern {
  tag: string;
  avgScore: number; // -1 … +1
  count: number;
  dominantSentiment: string;
}

export interface JournalPatterns {
  timeSlots: TimeSlotPattern[];
  topTags: TagPattern[]; // max 6, sorted by count desc
}

const TIME_SLOTS: TimeSlotPattern[] = [
  { slot: "morning",   label: "Morning",   emoji: "🌅", avgScore: 0, count: 0 },
  { slot: "afternoon", label: "Afternoon", emoji: "☀️",  avgScore: 0, count: 0 },
  { slot: "evening",   label: "Evening",   emoji: "🌆", avgScore: 0, count: 0 },
  { slot: "night",     label: "Night",     emoji: "🌙", avgScore: 0, count: 0 },
];

function hourToSlot(hour: number): TimeSlotPattern["slot"] {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}

// ─── Weekly digest ────────────────────────────────────────────────────────────

export interface WeeklyDigest {
  entryCount: number;
  daysWritten: number;
  totalWords: number;
  avgWords: number;
  dominantSentiment: string | null;
  topTag: string | null;
}

export function computeWeeklyDigest(entries: RememoirEntry[]): WeeklyDigest | null {
  const active = entries.filter((e) => !e.deleted);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const week = active.filter((e) => new Date(e.createdAt) >= cutoff);

  if (week.length < 3) return null; // not enough data to show

  const daysWritten = new Set(week.map((e) => e.createdAt.slice(0, 10))).size;
  const totalWords = week.reduce((s, e) => s + (e.text?.trim().split(/\s+/).filter(Boolean).length ?? 0), 0);
  const avgWords = week.length > 0 ? Math.round(totalWords / week.length) : 0;

  // Dominant sentiment
  const sCount: Record<string, number> = {};
  for (const e of week) {
    const s = e.aiInsight?.sentiment;
    if (s) sCount[s] = (sCount[s] ?? 0) + 1;
  }
  const dominantSentiment = Object.entries(sCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Top tag
  const tagCount = new Map<string, number>();
  for (const e of week) for (const t of e.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const topTag = [...tagCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { entryCount: week.length, daysWritten, totalWords, avgWords, dominantSentiment, topTag };
}

export function computePatterns(entries: RememoirEntry[]): JournalPatterns {
  const analysed = entries.filter((e) => !e.deleted && e.aiInsight);

  // ── Time-of-day vs sentiment ──────────────────────────────────────────────────
  const slotScores: Record<string, { sum: number; count: number }> = {
    morning: { sum: 0, count: 0 },
    afternoon: { sum: 0, count: 0 },
    evening: { sum: 0, count: 0 },
    night: { sum: 0, count: 0 },
  };

  for (const e of analysed) {
    const hour = new Date(e.createdAt).getHours();
    const slot = hourToSlot(hour);
    slotScores[slot].sum += SENTIMENT_SCORE[e.aiInsight!.sentiment] ?? 0;
    slotScores[slot].count += 1;
  }

  const timeSlots: TimeSlotPattern[] = TIME_SLOTS.map((t) => ({
    ...t,
    count: slotScores[t.slot].count,
    avgScore:
      slotScores[t.slot].count === 0
        ? 0
        : Math.round((slotScores[t.slot].sum / slotScores[t.slot].count) * 100) / 100,
  }));

  // ── Tag vs avg sentiment score ────────────────────────────────────────────────
  const tagData = new Map<string, { sum: number; count: number; counts: Record<string, number> }>();

  for (const e of analysed) {
    if (!e.tags?.length) continue;
    const score = SENTIMENT_SCORE[e.aiInsight!.sentiment] ?? 0;
    const sentiment = e.aiInsight!.sentiment;
    for (const tag of e.tags) {
      if (!tagData.has(tag)) tagData.set(tag, { sum: 0, count: 0, counts: {} });
      const td = tagData.get(tag)!;
      td.sum += score;
      td.count += 1;
      td.counts[sentiment] = (td.counts[sentiment] ?? 0) + 1;
    }
  }

  const topTags: TagPattern[] = [...tagData.entries()]
    .map(([tag, td]) => {
      const dominantSentiment = Object.entries(td.counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "neutral";
      return {
        tag,
        avgScore: Math.round((td.sum / td.count) * 100) / 100,
        count: td.count,
        dominantSentiment,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { timeSlots, topTags };
}

export function computeStats(entries: RememoirEntry[]): JournalStats {
  const active = entries.filter((e) => !e.deleted);
  const total = active.length;

  // ── Total words + longest entry ───────────────────────────────────────────────
  let totalWords = 0;
  let longestEntryWords = 0;
  for (const e of active) {
    const wc = e.text?.trim().split(/\s+/).filter(Boolean).length ?? 0;
    totalWords += wc;
    if (wc > longestEntryWords) longestEntryWords = wc;
  }

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
    longestEntryWords,
    entriesThisMonth,
    last30Days,
  };
}
