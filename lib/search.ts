"use client";

import MiniSearch from "minisearch";
import type { RememoirEntry, SearchDocument } from "./types";

let searchIndex: MiniSearch<SearchDocument> | null = null;

function getIndex(): MiniSearch<SearchDocument> {
  if (!searchIndex) {
    searchIndex = new MiniSearch<SearchDocument>({
      fields: ["text", "tags"],
      storeFields: ["id", "createdAt"],
      searchOptions: {
        boost: { text: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });
  }
  return searchIndex;
}

export function indexEntries(entries: RememoirEntry[]): void {
  const index = getIndex();
  index.removeAll();
  const docs: SearchDocument[] = entries
    .filter((e) => e.id !== undefined && !e.deleted)
    .map((e) => ({
      id: e.id!,
      text: e.text,
      createdAt: e.createdAt,
      tags: (e.tags ?? []).join(" "),
    }));
  index.addAll(docs);
}

export function addToIndex(entry: RememoirEntry): void {
  if (!entry.id) return;
  const index = getIndex();
  try {
    index.add({
      id: entry.id,
      text: entry.text,
      createdAt: entry.createdAt,
      tags: (entry.tags ?? []).join(" "),
    });
  } catch {
    // Already indexed
  }
}

export function removeFromIndex(id: number): void {
  try {
    getIndex().discard(id);
  } catch {
    // Not in index
  }
}

export function searchEntries(query: string): number[] {
  if (!query.trim()) return [];
  return getIndex()
    .search(query)
    .map((r) => r.id as number);
}

export function resetIndex(): void {
  searchIndex = null;
}
