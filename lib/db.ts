"use client";

import Dexie, { type EntityTable } from "dexie";
import type { RememoirEntry } from "./types";

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
  }
}

// Singleton — safe to import anywhere client-side
export const db = new RememoirDB();

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
}): Promise<RememoirEntry[]> {
  let results = await db.entries.filter((e) => !e.deleted).toArray();

  if (opts.tag !== undefined) {
    results = results.filter((e) => e.tags?.includes(opts.tag!));
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
