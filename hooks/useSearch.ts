"use client";

import { useState, useCallback, useTransition } from "react";
import { getAllEntries } from "@/lib/db";
import { indexEntries, searchEntries } from "@/lib/search";
import type { RememoirEntry } from "@/lib/types";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RememoirEntry[]>([]);
  const [isSearching, startTransition] = useTransition();

  const search = useCallback((q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      // Always reload so newly added/edited/deleted entries are reflected
      const all = await getAllEntries();
      indexEntries(all);
      const ids = searchEntries(q);
      const map = new Map(all.map((e) => [e.id, e]));
      setResults(ids.map((id) => map.get(id)).filter(Boolean) as RememoirEntry[]);
    });
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { query, results, isSearching, search, clear };
}
