"use client";

import { create } from "zustand";
import type { RememoirEntry } from "@/lib/types";

interface EntryStore {
  // Timeline entries (paginated)
  entries: RememoirEntry[];
  hasMore: boolean;
  isLoading: boolean;
  cursor: string | undefined;

  // Active entry being composed
  draft: Partial<RememoirEntry> | null;

  // Actions
  setEntries: (entries: RememoirEntry[]) => void;
  appendEntries: (entries: RememoirEntry[]) => void;
  addEntryToFeed: (entry: RememoirEntry) => void;
  removeEntry: (id: number) => void;
  updateEntryInStore: (id: number, changes: Partial<RememoirEntry>) => void;
  setHasMore: (hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  setCursor: (cursor: string | undefined) => void;
  setDraft: (draft: Partial<RememoirEntry> | null) => void;
  reset: () => void;
}

const PAGE_SIZE = 20;

export { PAGE_SIZE };

export const useEntryStore = create<EntryStore>((set) => ({
  entries: [],
  hasMore: true,
  isLoading: false,
  cursor: undefined,
  draft: null,

  setEntries: (entries) => set({ entries }),
  appendEntries: (newEntries) =>
    set((state) => ({ entries: [...state.entries, ...newEntries] })),
  addEntryToFeed: (entry) =>
    set((state) => ({ entries: [entry, ...state.entries] })),
  removeEntry: (id) =>
    set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  updateEntryInStore: (id, changes) =>
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    })),
  setHasMore: (hasMore) => set({ hasMore }),
  setLoading: (isLoading) => set({ isLoading }),
  setCursor: (cursor) => set({ cursor }),
  setDraft: (draft) => set({ draft }),
  reset: () =>
    set({ entries: [], hasMore: true, cursor: undefined, isLoading: false }),
}));
