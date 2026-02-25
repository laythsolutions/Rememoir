"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAllEntries } from "@/lib/db";
import { RememoirTimelineEntry } from "@/components/RememoirTimelineEntry";
import type { RememoirEntry } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayData {
  entries: RememoirEntry[];
}

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ─── CalendarView ─────────────────────────────────────────────────────────────

export function CalendarView() {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [entryMap, setEntryMap] = useState<Map<string, DayData>>(new Map());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllEntries().then((entries) => {
      const map = new Map<string, DayData>();
      for (const entry of entries) {
        const key = localDateKey(new Date(entry.createdAt));
        if (!map.has(key)) map.set(key, { entries: [] });
        map.get(key)!.entries.push(entry);
      }
      setEntryMap(map);
      setLoading(false);
    });
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay(); // 0 = Sunday

  // Build grid cells: null for empty leading cells, Date for actual days
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const today = localDateKey(new Date());
  const monthLabel = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => {
    const next = new Date(year, month + 1, 1);
    if (next <= new Date()) setViewDate(next);
  };
  const isNextDisabled = new Date(year, month + 1, 1) > new Date();

  const selectedEntries = selectedDay
    ? (entryMap.get(selectedDay)?.entries ?? [])
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-1">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-semibold text-sm">{monthLabel}</span>
        <button
          onClick={nextMonth}
          disabled={isNextDisabled}
          aria-label="Next month"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-default"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 text-center">
        {DAY_LABELS.map((d) => (
          <span key={d} className="text-[11px] font-medium text-muted-foreground py-1">
            {d}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;
            const key = localDateKey(date);
            const data = entryMap.get(key);
            const isToday = key === today;
            const isSelected = key === selectedDay;
            const isFuture = date > new Date();

            return (
              <button
                key={key}
                onClick={() => {
                  if (!data || isFuture) return;
                  setSelectedDay(isSelected ? null : key);
                }}
                disabled={!data || isFuture}
                aria-label={`${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${data ? ` — ${data.entries.length} entr${data.entries.length === 1 ? "y" : "ies"}` : ""}`}
                aria-pressed={isSelected}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium
                  transition-colors
                  ${isFuture ? "opacity-30 cursor-default" : ""}
                  ${data && !isFuture ? "hover:bg-accent cursor-pointer" : ""}
                  ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                  ${isSelected ? "bg-primary/10" : ""}
                `}
              >
                <span className={isToday ? "text-primary font-bold" : ""}>
                  {date.getDate()}
                </span>
                {data && (
                  <span className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected day entries */}
      {selectedDay && (
        <div className="flex flex-col gap-3 border-t border-border pt-4 mt-1">
          <p className="text-sm font-medium">
            {new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            <span className="text-muted-foreground font-normal ml-1.5">
              · {selectedEntries.length} entr{selectedEntries.length === 1 ? "y" : "ies"}
            </span>
          </p>
          {selectedEntries.map((entry) => (
            <RememoirTimelineEntry key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}
