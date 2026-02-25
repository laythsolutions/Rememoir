"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Flame, CalendarDays, Type, PenLine } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAllEntries } from "@/lib/db";
import { computeStats, type JournalStats, type DailyPoint } from "@/lib/stats";

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex-1 min-w-0 rounded-2xl p-4 flex flex-col gap-2 border shadow-sm ${
      accent
        ? "bg-primary/8 border-primary/20"
        : "bg-card border-border"
    }`}>
      <div className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest ${
        accent ? "text-primary/70" : "text-muted-foreground"
      }`}>
        {icon}
        {label}
      </div>
      <p className="text-[26px] font-bold tracking-tight leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground leading-tight">{sub}</p>}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

interface TooltipEntry {
  active?: boolean;
  payload?: Array<{ payload: DailyPoint }>;
}

function ActivityTooltip({ active, payload }: TooltipEntry) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  if (point.count === 0) return null;

  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3.5 py-2.5 text-sm">
      <p className="font-semibold text-foreground text-[13px]">{point.label}</p>
      <p className="text-muted-foreground text-[12px] mt-0.5">
        {point.count} {point.count === 1 ? "entry" : "entries"}
      </p>
    </div>
  );
}

// ─── 30-day activity chart ────────────────────────────────────────────────────

function ActivityChart({ data }: { data: DailyPoint[] }) {
  const hasAnyData = data.some((d) => d.count > 0);
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const [primaryHex, setPrimaryHex] = useState("#8a6228");
  const colorReadRef = useRef(false);

  useEffect(() => {
    if (colorReadRef.current) return;
    const hex = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-primary-hex")
      .trim();
    if (hex) setPrimaryHex(hex);
    colorReadRef.current = true;
  }, []);

  if (!hasAnyData) {
    return (
      <div className="flex flex-col items-center justify-center h-44 gap-3">
        <CalendarDays className="w-8 h-8 text-muted-foreground/25" />
        <p className="text-sm text-muted-foreground">No entries in the last 30 days yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: -28 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/50" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "currentColor", opacity: 0.45 }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "currentColor", opacity: 0.45 }}
          tickLine={false}
          axisLine={false}
          width={28}
        />
        <Tooltip content={<ActivityTooltip />} cursor={{ fill: "currentColor", opacity: 0.04, radius: 6 }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={18}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.count > 0 ? primaryHex : "transparent"}
              fillOpacity={entry.count > 0 ? 0.5 + (entry.count / maxCount) * 0.5 : 0}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Writing habits breakdown ─────────────────────────────────────────────────

function WritingBreakdown({ stats }: { stats: JournalStats }) {
  const daysWritten = stats.last30Days.filter((d) => d.count > 0).length;
  const daysWithMultiple = stats.last30Days.filter((d) => d.count > 1).length;
  const maxInDay = Math.max(...stats.last30Days.map((d) => d.count), 0);
  const avgWords = stats.totalEntries > 0
    ? Math.round(stats.totalWords / stats.totalEntries)
    : 0;

  const rows: { label: string; value: string }[] = [
    { label: "Days written (last 30)", value: `${daysWritten} / 30` },
    { label: "Days with 2+ entries", value: String(daysWithMultiple) },
    { label: "Most in a single day", value: String(maxInDay) },
    { label: "Avg words per entry", value: avgWords > 0 ? String(avgWords) : "—" },
    { label: "Total words written", value: stats.totalWords > 0 ? stats.totalWords.toLocaleString() : "—" },
  ];

  if (stats.totalEntries === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Type className="w-7 h-7 text-muted-foreground/25" />
        <p className="text-sm text-muted-foreground">Start writing to see your habits here.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between py-3">
          <span className="text-[13px] text-muted-foreground">{label}</span>
          <span className="text-[13px] font-semibold tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-muted ${className ?? ""}`} />;
}

function LoadingState() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-3">
        <Skeleton className="flex-1 h-[90px]" />
        <Skeleton className="flex-1 h-[90px]" />
        <Skeleton className="flex-1 h-[90px]" />
      </div>
      <Skeleton className="h-52" />
      <Skeleton className="h-40" />
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
        {title}
      </h2>
      <div className="bg-card border border-border rounded-2xl shadow-sm px-4 py-3">
        {children}
      </div>
    </section>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function InsightsView() {
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllEntries().then((entries) => {
      setStats(computeStats(entries));
      setIsLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <h1 className="text-base font-semibold tracking-tight">Insights</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="pb-6 animate-page-in">
          {isLoading ? (
            <LoadingState />
          ) : stats ? (
            <div className="flex flex-col gap-6">
              {/* Stats row */}
              <div className="flex gap-3">
                <StatCard
                  icon={<BookOpen className="w-3 h-3" />}
                  label="Entries"
                  value={String(stats.totalEntries)}
                  sub={stats.totalEntries === 0 ? "Start writing!" : `${stats.entriesThisMonth} this month`}
                />
                <StatCard
                  icon={<Flame className="w-3 h-3" />}
                  label="Streak"
                  value={`${stats.currentStreak}d`}
                  sub={stats.longestStreak > 0 ? `Best: ${stats.longestStreak}d` : "Build a streak!"}
                  accent={stats.currentStreak > 0}
                />
                <StatCard
                  icon={<Type className="w-3 h-3" />}
                  label="Words"
                  value={stats.totalWords > 999 ? `${(stats.totalWords / 1000).toFixed(1)}k` : String(stats.totalWords)}
                  sub={stats.totalEntries > 0 ? `~${Math.round(stats.totalWords / stats.totalEntries)} avg` : undefined}
                />
              </div>

              {/* Activity chart */}
              <Section title="30-day activity">
                <ActivityChart data={stats.last30Days} />
              </Section>

              {/* Writing habits */}
              <Section title="Writing habits">
                <WritingBreakdown stats={stats} />
              </Section>

              {/* CTAs */}
              <div className="flex gap-3">
                <Link href="/entry" className="flex-1">
                  <div className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-[14px] shadow-md shadow-primary/20 hover:bg-primary/90 transition-all duration-200 cursor-pointer">
                    <PenLine className="w-4 h-4" />
                    Write today
                  </div>
                </Link>
                <Link href="/timeline" className="flex-1">
                  <div className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-border bg-card font-medium text-[14px] hover:border-primary/30 hover:text-primary transition-all duration-200 cursor-pointer shadow-sm">
                    <BookOpen className="w-4 h-4" />
                    View journal
                  </div>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
