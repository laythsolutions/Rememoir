"use client";

import { useState, useCallback, useTransition, useRef } from "react";
import { getAllEntries } from "@/lib/db";
import { indexEntries, searchEntries } from "@/lib/search";
import type { RememoirEntry } from "@/lib/types";

export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RememoirEntry[]>([]);
  const [isSearching, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const all = await getAllEntries();
        indexEntries(all);
        const ids = searchEntries(q);
        const map = new Map(all.map((e) => [e.id, e]));
        setResults(ids.map((id) => map.get(id)).filter(Boolean) as RememoirEntry[]);
      });
    }, 300);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  return { query, results, isSearching, search, clear };
}
