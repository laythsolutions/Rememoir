"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { getAllEntries } from "@/lib/db";
import { indexEntries, searchEntries } from "@/lib/search";
import type { RememoirEntry } from "@/lib/types";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RememoirEntry[]>([]);
  const [isSearching, startTransition] = useTransition();
  const allEntriesRef = useRef<RememoirEntry[]>([]);
  const indexedRef = useRef(false);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      if (!indexedRef.current) {
        const all = await getAllEntries();
        allEntriesRef.current = all;
        indexEntries(all);
        indexedRef.current = true;
      }
      const ids = searchEntries(q);
      const map = new Map(allEntriesRef.current.map((e) => [e.id, e]));
      setResults(ids.map((id) => map.get(id)).filter(Boolean) as RememoirEntry[]);
    });
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
  }, []);

  return { query, results, isSearching, search, clear };
}
