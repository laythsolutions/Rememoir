"use client";

import { useState, useCallback, useTransition } from "react";
import { getAllEntries } from "@/lib/db";
import { indexEntries, searchEntries } from "@/lib/search";
import type { RememoirEntry } from "@/lib/types";

export function useSearch(allEntries: RememoirEntry[]) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RememoirEntry[]>([]);
  const [isSearching, startTransition] = useTransition();

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        // Build index from current entries on first search
        if (allEntries.length === 0) {
          const all = await getAllEntries();
          indexEntries(all);
          const ids = searchEntries(q);
          const map = new Map(all.map((e) => [e.id, e]));
          setResults(ids.map((id) => map.get(id)).filter(Boolean) as RememoirEntry[]);
        } else {
          indexEntries(allEntries);
          const ids = searchEntries(q);
          const map = new Map(allEntries.map((e) => [e.id, e]));
          setResults(ids.map((id) => map.get(id)).filter(Boolean) as RememoirEntry[]);
        }
      });
    },
    [allEntries]
  );

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { query, results, isSearching, search, clear };
}
