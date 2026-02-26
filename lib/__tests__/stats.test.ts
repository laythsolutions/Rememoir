import { describe, it, expect } from "vitest";
import { computeWeeklyDigest, computePatterns, computeStats } from "../stats";
import type { RememoirEntry, AIInsight } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeEntry(overrides: Partial<RememoirEntry> = {}): RememoirEntry {
  return {
    createdAt: daysAgo(0),
    updatedAt: daysAgo(0),
    text: "hello world",
    ...overrides,
  };
}

function makeInsight(sentiment: AIInsight["sentiment"]): AIInsight {
  return { sentiment, summary: "ok", suggestedTags: [], analyzedAt: new Date().toISOString() };
}

// ─── computeWeeklyDigest ──────────────────────────────────────────────────────

describe("computeWeeklyDigest", () => {
  it("returns null when fewer than 3 entries in the last 7 days", () => {
    expect(computeWeeklyDigest([])).toBeNull();
    expect(computeWeeklyDigest([makeEntry(), makeEntry()])).toBeNull();
  });

  it("returns null when entries exist but are older than 7 days", () => {
    const old = [
      makeEntry({ createdAt: daysAgo(10) }),
      makeEntry({ createdAt: daysAgo(11) }),
      makeEntry({ createdAt: daysAgo(12) }),
    ];
    expect(computeWeeklyDigest(old)).toBeNull();
  });

  it("returns a digest with 3+ recent entries", () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const d = computeWeeklyDigest(entries);
    expect(d).not.toBeNull();
    expect(d!.entryCount).toBe(3);
  });

  it("excludes deleted entries", () => {
    const entries = [
      makeEntry(),
      makeEntry(),
      makeEntry({ deleted: true }),
      makeEntry({ deleted: true }),
    ];
    expect(computeWeeklyDigest(entries)).toBeNull(); // only 2 non-deleted
  });

  it("counts unique days written correctly", () => {
    const today = new Date().toISOString();
    const yesterday = daysAgo(1);
    const entries = [
      makeEntry({ createdAt: today }),
      makeEntry({ createdAt: today }),   // same day as above
      makeEntry({ createdAt: yesterday }),
    ];
    const d = computeWeeklyDigest(entries);
    expect(d!.daysWritten).toBe(2);
  });

  it("computes word count and average correctly", () => {
    const entries = [
      makeEntry({ text: "one two three" }),        // 3 words
      makeEntry({ text: "four five six seven" }), // 4 words
      makeEntry({ text: "eight nine ten" }),       // 3 words
    ];
    const d = computeWeeklyDigest(entries);
    expect(d!.totalWords).toBe(10);
    expect(d!.avgWords).toBe(Math.round(10 / 3));
  });

  it("identifies dominant sentiment correctly", () => {
    const entries = [
      makeEntry({ aiInsight: makeInsight("positive") }),
      makeEntry({ aiInsight: makeInsight("positive") }),
      makeEntry({ aiInsight: makeInsight("challenging") }),
    ];
    const d = computeWeeklyDigest(entries);
    expect(d!.dominantSentiment).toBe("positive");
  });

  it("returns null dominantSentiment when no AI insights exist", () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const d = computeWeeklyDigest(entries);
    expect(d!.dominantSentiment).toBeNull();
  });

  it("identifies top tag correctly", () => {
    const entries = [
      makeEntry({ tags: ["work", "stress"] }),
      makeEntry({ tags: ["work"] }),
      makeEntry({ tags: ["family"] }),
    ];
    const d = computeWeeklyDigest(entries);
    expect(d!.topTag).toBe("work"); // appears twice
  });

  it("returns null topTag when no entries have tags", () => {
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const d = computeWeeklyDigest(entries);
    expect(d!.topTag).toBeNull();
  });
});

// ─── computePatterns ─────────────────────────────────────────────────────────

describe("computePatterns", () => {
  it("returns 4 time slots always", () => {
    const p = computePatterns([]);
    expect(p.timeSlots).toHaveLength(4);
    expect(p.timeSlots.map((s) => s.slot)).toEqual(["morning", "afternoon", "evening", "night"]);
  });

  it("slots with no data have count 0 and avgScore 0", () => {
    const p = computePatterns([]);
    for (const slot of p.timeSlots) {
      expect(slot.count).toBe(0);
      expect(slot.avgScore).toBe(0);
    }
  });

  it("ignores entries without aiInsight", () => {
    const entries = [makeEntry(), makeEntry()];
    const p = computePatterns(entries);
    expect(p.topTags).toHaveLength(0);
    const total = p.timeSlots.reduce((s, t) => s + t.count, 0);
    expect(total).toBe(0);
  });

  it("classifies morning entries (5–11h) correctly", () => {
    const morning = new Date();
    morning.setHours(9, 0, 0, 0);
    const entries = [makeEntry({ createdAt: morning.toISOString(), aiInsight: makeInsight("positive") })];
    const p = computePatterns(entries);
    const slot = p.timeSlots.find((s) => s.slot === "morning")!;
    expect(slot.count).toBe(1);
    expect(slot.avgScore).toBe(1); // positive = score 1
  });

  it("computes positive avgScore correctly for a tag", () => {
    const entries = [
      makeEntry({ tags: ["work"], aiInsight: makeInsight("positive") }),
      makeEntry({ tags: ["work"], aiInsight: makeInsight("positive") }),
    ];
    const p = computePatterns(entries);
    const tag = p.topTags.find((t) => t.tag === "work")!;
    expect(tag.avgScore).toBe(1);
    expect(tag.count).toBe(2);
    expect(tag.dominantSentiment).toBe("positive");
  });

  it("returns at most 6 top tags", () => {
    const tags = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const entries = tags.map((tag) =>
      makeEntry({ tags: [tag], aiInsight: makeInsight("neutral") })
    );
    const p = computePatterns(entries);
    expect(p.topTags.length).toBeLessThanOrEqual(6);
  });
});

// ─── computeStats ────────────────────────────────────────────────────────────

describe("computeStats", () => {
  it("returns zeros for empty entries", () => {
    const s = computeStats([]);
    expect(s.totalEntries).toBe(0);
    expect(s.currentStreak).toBe(0);
    expect(s.longestStreak).toBe(0);
    expect(s.totalWords).toBe(0);
  });

  it("excludes deleted entries from counts", () => {
    const entries = [makeEntry(), makeEntry({ deleted: true })];
    const s = computeStats(entries);
    expect(s.totalEntries).toBe(1);
  });

  it("counts total words correctly", () => {
    const entries = [
      makeEntry({ text: "one two three" }),
      makeEntry({ text: "four five" }),
    ];
    const s = computeStats(entries);
    expect(s.totalWords).toBe(5);
  });

  it("identifies the longest entry by word count", () => {
    const entries = [
      makeEntry({ text: "a b c d e" }),   // 5 words
      makeEntry({ text: "a b c" }),        // 3 words
    ];
    const s = computeStats(entries);
    expect(s.longestEntryWords).toBe(5);
  });

  it("returns 30 daily points regardless of entries", () => {
    const s = computeStats([]);
    expect(s.last30Days).toHaveLength(30);
  });

  it("counts today's entries in last30Days", () => {
    const entries = [makeEntry(), makeEntry()];
    const s = computeStats(entries);
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayPoint = s.last30Days.find((p) => p.dateKey === todayKey);
    expect(todayPoint?.count).toBe(2);
  });

  it("consecutive-day streak is counted correctly", () => {
    const entries = [
      makeEntry({ createdAt: daysAgo(0) }),
      makeEntry({ createdAt: daysAgo(1) }),
      makeEntry({ createdAt: daysAgo(2) }),
    ];
    const s = computeStats(entries);
    expect(s.currentStreak).toBe(3);
    expect(s.longestStreak).toBeGreaterThanOrEqual(3);
  });

  it("streak resets on a gap", () => {
    const entries = [
      makeEntry({ createdAt: daysAgo(0) }),
      // gap on day 1
      makeEntry({ createdAt: daysAgo(2) }),
      makeEntry({ createdAt: daysAgo(3) }),
    ];
    const s = computeStats(entries);
    expect(s.currentStreak).toBe(1);
    expect(s.longestStreak).toBe(2);
  });
});
