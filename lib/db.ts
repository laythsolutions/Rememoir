"use client";

import Dexie, { type EntityTable } from "dexie";
import type { RememoirEntry, AIInsight } from "./types";
import { getSessionKey, encryptText, decryptText, isEncryptedText } from "./encryption";

class RememoirDB extends Dexie {
  entries!: EntityTable<RememoirEntry, "id">;

  constructor() {
    super("RememoirDB");
    this.version(1).stores({
      entries: "++id, createdAt, mood, deleted",
    });
    this.version(2).stores({
      entries: "++id, createdAt, mood, deleted, *tags",
    });
    // Version 3 removes the mood index
    this.version(3).stores({
      entries: "++id, createdAt, deleted, *tags",
    });
    // Version 4 adds aiInsight field (no index change needed)
    this.version(4).stores({
      entries: "++id, createdAt, deleted, *tags",
    });
    // Version 5 adds starred field
    this.version(5).stores({
      entries: "++id, createdAt, deleted, *tags, starred",
    });
  }
}

// Singleton — safe to import anywhere client-side
export const db = new RememoirDB();

// ─── Encryption helpers ───────────────────────────────────────────────────────

async function encryptEntry(entry: Omit<RememoirEntry, "id"> | RememoirEntry): Promise<typeof entry> {
  const key = getSessionKey();
  if (!key) return entry;
  const result = { ...entry };
  if (typeof result.text === "string" && !isEncryptedText(result.text)) {
    result.text = await encryptText(result.text, key);
  }
  if (Array.isArray(result.tags)) {
    result.tags = await Promise.all(
      result.tags.map((t) => (isEncryptedText(t) ? t : encryptText(t, key)))
    );
  }
  return result;
}

async function decryptEntry(entry: RememoirEntry): Promise<RememoirEntry> {
  const key = getSessionKey();
  if (!key) return entry;
  const result = { ...entry };
  if (typeof result.text === "string" && isEncryptedText(result.text)) {
    try { result.text = await decryptText(result.text, key); } catch { /* leave encrypted */ }
  }
  if (Array.isArray(result.tags)) {
    result.tags = await Promise.all(
      result.tags.map(async (t) => {
        if (!isEncryptedText(t)) return t;
        try { return await decryptText(t, key); } catch { return t; }
      })
    );
  }
  return result;
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export async function addEntry(
  entry: Omit<RememoirEntry, "id">
): Promise<number> {
  return db.entries.add(entry) as Promise<number>;
}

export async function updateEntry(
  id: number,
  changes: Partial<RememoirEntry>
): Promise<void> {
  await db.entries.update(id, { ...changes, updatedAt: new Date().toISOString() });
}

export async function deleteEntry(id: number): Promise<void> {
  await db.entries.update(id, {
    deleted: true,
    updatedAt: new Date().toISOString(),
  });
}

export async function getEntry(id: number): Promise<RememoirEntry | undefined> {
  return db.entries.get(id);
}

// ─── Timeline ────────────────────────────────────────────────────────────────

export async function getEntries(opts: {
  limit: number;
  before?: string;
  tag?: string;
  from?: string;
  to?: string;
}): Promise<RememoirEntry[]> {
  let results = await db.entries.filter((e) => !e.deleted).toArray();

  if (opts.tag !== undefined) {
    results = results.filter((e) => e.tags?.includes(opts.tag!));
  }

  if (opts.from) {
    results = results.filter((e) => e.createdAt >= opts.from!);
  }

  if (opts.to) {
    const toEnd = opts.to + "T23:59:59.999Z";
    results = results.filter((e) => e.createdAt <= toEnd);
  }

  // Sort newest first
  results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Cursor pagination
  if (opts.before) {
    const idx = results.findIndex((e) => e.createdAt < opts.before!);
    if (idx !== -1) results = results.slice(idx);
  }

  return results.slice(0, opts.limit);
}

export async function getAllEntries(): Promise<RememoirEntry[]> {
  return db.entries
    .filter((e) => !e.deleted)
    .toArray()
    .then((arr) =>
      arr.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    );
}

export async function getEntryCount(): Promise<number> {
  return db.entries.filter((e) => !e.deleted).count();
}

/** Returns all unique tags across non-deleted entries, sorted alphabetically */
export async function getAllTags(): Promise<string[]> {
  const keys = await db.entries.orderBy("tags").uniqueKeys();
  return (keys as string[]).filter((k) => typeof k === "string").sort();
}

/** Remove a tag from every entry that has it */
export async function removeTagFromAllEntries(tag: string): Promise<void> {
  const entries = await db.entries
    .filter((e) => !e.deleted && (e.tags ?? []).includes(tag))
    .toArray();
  const now = new Date().toISOString();
  await Promise.all(
    entries.map((e) =>
      db.entries.update(e.id!, {
        tags: (e.tags ?? []).filter((t) => t !== tag),
        updatedAt: now,
      })
    )
  );
}

/** Toggle the starred state of an entry */
export async function toggleStarEntry(id: number, currentStarred: boolean): Promise<void> {
  await db.entries.update(id, { starred: !currentStarred });
}

/** Returns all starred non-deleted entries, newest first */
export async function getStarredEntries(): Promise<RememoirEntry[]> {
  return db.entries
    .filter((e) => !e.deleted && !!e.starred)
    .toArray()
    .then((arr) =>
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
}

/**
 * Returns non-deleted entries written on the same month+day as today but in a prior year.
 * Sorted oldest-year first so the card reads chronologically.
 */
export async function getOnThisDayEntries(): Promise<RememoirEntry[]> {
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentYear = now.getFullYear();

  return db.entries
    .filter((e) => {
      if (e.deleted) return false;
      const d = new Date(e.createdAt);
      if (d.getFullYear() >= currentYear) return false;
      const em = String(d.getMonth() + 1).padStart(2, "0");
      const ed = String(d.getDate()).padStart(2, "0");
      return `${em}-${ed}` === mmdd;
    })
    .toArray()
    .then((arr) =>
      arr.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    );
}

/** Store AI insight on an entry without touching updatedAt */
export async function updateEntryAI(id: number, insight: AIInsight): Promise<void> {
  await db.entries.update(id, { aiInsight: insight });
}

/** Rename a tag across every entry that has it */
export async function renameTagInAllEntries(
  oldTag: string,
  newTag: string
): Promise<void> {
  const entries = await db.entries
    .filter((e) => !e.deleted && (e.tags ?? []).includes(oldTag))
    .toArray();
  const now = new Date().toISOString();
  await Promise.all(
    entries.map((e) =>
      db.entries.update(e.id!, {
        tags: (e.tags ?? []).map((t) => (t === oldTag ? newTag : t)),
        updatedAt: now,
      })
    )
  );
}
