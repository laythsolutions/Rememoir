"use client";

import { useCallback, useEffect } from "react";
import { getEntries } from "@/lib/db";
import { useEntryStore, PAGE_SIZE } from "@/store/entryStore";

export function useEntries(tagFilter?: string, from?: string, to?: string) {
  const {
    entries,
    hasMore,
    isLoading,
    cursor,
    setEntries,
    appendEntries,
    setHasMore,
    setLoading,
    setCursor,
    reset,
  } = useEntryStore();

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const results = await getEntries({
        limit: PAGE_SIZE,
        tag: tagFilter,
        from,
        to,
      });
      setEntries(results);
      setHasMore(results.length === PAGE_SIZE);
      setCursor(results[results.length - 1]?.createdAt);
    } finally {
      setLoading(false);
    }
  }, [tagFilter, from, to, setEntries, setHasMore, setLoading, setCursor]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setLoading(true);
    try {
      const results = await getEntries({
        limit: PAGE_SIZE,
        before: cursor,
        tag: tagFilter,
        from,
        to,
      });
      appendEntries(results);
      setHasMore(results.length === PAGE_SIZE);
      setCursor(results[results.length - 1]?.createdAt);
    } finally {
      setLoading(false);
    }
  }, [hasMore, isLoading, cursor, tagFilter, from, to, appendEntries, setHasMore, setLoading, setCursor]);

  useEffect(() => {
    reset();
    loadInitial();
    return () => reset();
  }, [loadInitial, reset]);

  return { entries, hasMore, isLoading, loadMore, reload: loadInitial };
}
