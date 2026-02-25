"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, X, Loader2, List, CalendarDays, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RememoirTimelineEntry } from "@/components/RememoirTimelineEntry";
import { CalendarView } from "@/components/CalendarView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useEntries } from "@/hooks/useEntries";
import { useSearch } from "@/hooks/useSearch";
import { getAllTags } from "@/lib/db";

export function TimelineView() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [from, setFrom] = useState<string | undefined>(undefined);
  const [to, setTo] = useState<string | undefined>(undefined);

  const { entries, hasMore, isLoading, loadMore } = useEntries(tagFilter, from, to);
  const { query, results, isSearching, search, clear } = useSearch();

  const loaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getAllTags().then(setAllTags);
  }, []);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && !isLoading && hasMore && !query) {
        loadMore();
      }
    },
    [isLoading, hasMore, loadMore, query]
  );

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  const handleTagFilter = (tag: string | undefined) => {
    clear();
    setTagFilter(tag);
  };

  const handleClearFilters = () => {
    setFrom(undefined);
    setTo(undefined);
    setShowFilters(false);
  };

  // When both search and date filters are active, apply date filter to search results too
  const filteredResults = query
    ? results.filter((e) => {
        if (from && e.createdAt < from) return false;
        if (to && e.createdAt > to + "T23:59:59.999Z") return false;
        return true;
      })
    : results;

  const displayEntries = query ? filteredResults : entries;
  const isFiltered = tagFilter !== undefined || from !== undefined || to !== undefined;
  const hasDateFilter = from !== undefined || to !== undefined;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60 mb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <h1 className="text-base font-semibold tracking-tight">My Journal</h1>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={() => setViewMode((v) => v === "list" ? "calendar" : "list")}
              aria-label={viewMode === "list" ? "Switch to calendar view" : "Switch to list view"}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
            >
              {viewMode === "list" ? (
                <CalendarDays className="w-4 h-4" />
              ) : (
                <List className="w-4 h-4" />
              )}
            </button>
            <Link href="/entry">
              <Button size="sm" className="gap-1.5 rounded-xl h-8 text-xs font-semibold cursor-pointer ml-1 shadow-sm shadow-primary/15">
                <Plus className="w-3.5 h-3.5" />
                New
              </Button>
            </Link>
          </div>
        </div>

        <div className="pb-6 animate-page-in">
          {/* Calendar view */}
          {viewMode === "calendar" && <CalendarView />}

          {/* List view */}
          {viewMode === "list" && (
            <div className="flex flex-col gap-4">
              {/* Search + filter toggle */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <input
                    type="search"
                    placeholder="Search entries and tags…"
                    value={query}
                    onChange={(e) => search(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card shadow-sm text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200"
                  />
                  {query && (
                    <button
                      onClick={clear}
                      aria-label="Clear search"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilters((v) => !v)}
                  aria-label="Toggle date filters"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[13px] font-medium transition-all duration-150 cursor-pointer shrink-0 ${
                    showFilters || hasDateFilter
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
              </div>

              {/* Date range inputs */}
              {showFilters && (
                <div className="flex flex-wrap items-end gap-3 p-3.5 rounded-xl border border-border bg-card shadow-sm">
                  <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">From</label>
                    <input
                      type="date"
                      value={from ?? ""}
                      onChange={(e) => setFrom(e.target.value || undefined)}
                      className="px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">To</label>
                    <input
                      type="date"
                      value={to ?? ""}
                      onChange={(e) => setTo(e.target.value || undefined)}
                      className="px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                    />
                  </div>
                  {hasDateFilter && (
                    <button
                      onClick={handleClearFilters}
                      className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer pb-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Tag filters */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  <button
                    onClick={() => handleTagFilter(undefined)}
                    className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
                      !tagFilter
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    All
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleTagFilter(tagFilter === tag ? undefined : tag)}
                      className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-semibold transition-all duration-150 cursor-pointer ${
                        tagFilter === tag
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-primary/8 text-primary hover:bg-primary/15"
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              )}

              {/* Search results count */}
              {query && !isSearching && (
                <p className="text-[13px] text-muted-foreground">
                  {filteredResults.length === 0
                    ? "No entries found"
                    : `${filteredResults.length} entr${filteredResults.length === 1 ? "y" : "ies"} found`}
                </p>
              )}

              {/* Initial load skeleton */}
              {isLoading && entries.length === 0 && (
                <div className="flex flex-col gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-3 animate-pulse">
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-1.5">
                          <div className="h-3.5 w-24 bg-muted rounded-full" />
                          <div className="h-2.5 w-14 bg-muted/60 rounded-full" />
                        </div>
                        <div className="flex gap-1">
                          <div className="h-6 w-6 bg-muted rounded-lg" />
                          <div className="h-6 w-6 bg-muted rounded-lg" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="h-3 w-full bg-muted rounded-full" />
                        <div className="h-3 w-4/5 bg-muted rounded-full" />
                        <div className="h-3 w-2/3 bg-muted rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!isLoading && displayEntries.length === 0 && !query && (
                <div className="flex flex-col items-center gap-4 py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <List className="w-7 h-7 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">
                      {isFiltered ? "No entries match these filters" : "Your journal is empty"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isFiltered
                        ? "Try different filters, or clear them."
                        : "Start capturing your thoughts."}
                    </p>
                  </div>
                  {isFiltered ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { handleTagFilter(undefined); handleClearFilters(); }}
                      className="rounded-xl cursor-pointer"
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Link href="/entry">
                      <Button className="rounded-xl cursor-pointer shadow-sm shadow-primary/20">Write your first entry</Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Entries */}
              <div className="flex flex-col gap-3">
                {displayEntries.map((entry) => (
                  <RememoirTimelineEntry
                    key={entry.id}
                    entry={entry}
                    highlightQuery={query || undefined}
                  />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={loaderRef} className="py-4 flex justify-center">
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {!isLoading && !hasMore && entries.length > 0 && !query && (
                  <p className="text-xs text-muted-foreground/60">All entries loaded</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
