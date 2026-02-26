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
import { computeStats, computeSentimentStats, computePatterns, type JournalStats, type DailyPoint, type SentimentStats, type JournalPatterns } from "@/lib/stats";

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
    { label: "Longest entry", value: stats.longestEntryWords > 0 ? `${stats.longestEntryWords} words` : "—" },
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

// ─── Sentiment section ────────────────────────────────────────────────────────

const SENTIMENT_META = {
  positive:    { label: "Positive",    color: "bg-green-500",  textColor: "text-green-700 dark:text-green-400" },
  reflective:  { label: "Reflective",  color: "bg-primary",    textColor: "text-primary" },
  challenging: { label: "Challenging", color: "bg-rose-500",   textColor: "text-rose-700 dark:text-rose-400" },
  neutral:     { label: "Neutral",     color: "bg-muted-foreground/50", textColor: "text-muted-foreground" },
} as const;

function SentimentSection({ sentiment }: { sentiment: SentimentStats }) {
  const { last30, weeklyScores } = sentiment;

  if (last30.total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground text-center">
          Enable AI features and write a few entries to see your emotional tone here.
        </p>
      </div>
    );
  }

  const order = ["positive", "reflective", "neutral", "challenging"] as const;

  return (
    <div className="flex flex-col gap-5">
      {/* Breakdown bars */}
      <div className="flex flex-col gap-2.5">
        {order.map((key) => {
          const count = last30[key];
          const pct = last30.total > 0 ? Math.round((count / last30.total) * 100) : 0;
          const meta = SENTIMENT_META[key];
          return (
            <div key={key} className="flex items-center gap-3">
              <span className={`text-[12px] font-medium w-[80px] shrink-0 ${meta.textColor}`}>{meta.label}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${meta.color} transition-all duration-500`}
                  style={{ width: `${pct}%`, opacity: 0.75 }}
                />
              </div>
              <span className="text-[12px] text-muted-foreground tabular-nums w-8 text-right">{pct}%</span>
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          {last30.total} AI-analysed {last30.total === 1 ? "entry" : "entries"} in the last 30 days
        </p>
      </div>

      {/* Weekly trend */}
      {weeklyScores.some((w) => w.analysed > 0) && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">4-week tone</p>
          <div className="flex gap-2 items-end h-16">
            {weeklyScores.map((week) => {
              // score: -1 → challenging, 0 → neutral, +1 → positive
              const normalised = (week.score + 1) / 2; // 0…1
              const heightPct = week.analysed === 0 ? 0 : Math.max(10, Math.round(normalised * 100));
              const barColor =
                week.score > 0.2 ? "bg-green-500/70"
                : week.score < -0.2 ? "bg-rose-500/70"
                : "bg-primary/50";
              return (
                <div key={week.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="w-full flex items-end justify-center h-12">
                    <div
                      className={`w-full rounded-t-lg ${barColor} transition-all duration-500`}
                      style={{ height: `${heightPct}%` }}
                      title={`${week.label}: score ${week.score > 0 ? "+" : ""}${week.score}`}
                    />
                  </div>
                  <span className="text-[9px] text-muted-foreground/60 text-center leading-tight">{week.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Patterns section ─────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score > 0.2) return "bg-green-500/70";
  if (score < -0.2) return "bg-rose-500/70";
  return "bg-primary/60";
}

function scoreTextColor(score: number): string {
  if (score > 0.2) return "text-green-700 dark:text-green-400";
  if (score < -0.2) return "text-rose-600 dark:text-rose-400";
  return "text-primary";
}

function scoreLabel(score: number): string {
  if (score >= 0.6) return "uplifting";
  if (score >= 0.2) return "positive";
  if (score > -0.2) return "neutral";
  if (score > -0.6) return "heavy";
  return "tough";
}

function PatternsSection({ patterns }: { patterns: JournalPatterns }) {
  const { timeSlots, topTags } = patterns;
  const hasTimeData = timeSlots.some((s) => s.count > 0);
  const hasTagData = topTags.length > 0;

  if (!hasTimeData && !hasTagData) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground text-center">
          Enable AI features and write more entries to discover your patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Time of day */}
      {hasTimeData && (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">When you journal</p>
          <div className="grid grid-cols-2 gap-2">
            {timeSlots.filter((s) => s.count > 0).map((slot) => {
              const normalised = (slot.avgScore + 1) / 2; // 0…1
              const widthPct = Math.max(8, Math.round(normalised * 100));
              return (
                <div key={slot.slot} className="rounded-xl border border-border bg-card px-3.5 py-2.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px]">{slot.emoji} {slot.label}</span>
                    <span className={`text-[11px] font-medium ${scoreTextColor(slot.avgScore)}`}>
                      {scoreLabel(slot.avgScore)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${scoreColor(slot.avgScore)}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60">{slot.count} {slot.count === 1 ? "entry" : "entries"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tag tone */}
      {hasTagData && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Tags & emotional tone</p>
          <div className="flex flex-col divide-y divide-border/50">
            {topTags.map((tp) => {
              const normalised = (tp.avgScore + 1) / 2;
              const widthPct = Math.max(4, Math.round(normalised * 100));
              return (
                <div key={tp.tag} className="flex items-center gap-3 py-2.5">
                  <span className="text-[12px] font-medium text-foreground/80 w-24 shrink-0 truncate">#{tp.tag}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${scoreColor(tp.avgScore)}`}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-medium w-14 text-right shrink-0 ${scoreTextColor(tp.avgScore)}`}>
                    {scoreLabel(tp.avgScore)}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 w-6 text-right shrink-0">{tp.count}×</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
  const [sentiment, setSentiment] = useState<SentimentStats | null>(null);
  const [patterns, setPatterns] = useState<JournalPatterns | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getAllEntries().then((entries) => {
      setStats(computeStats(entries));
      setSentiment(computeSentimentStats(entries));
      setPatterns(computePatterns(entries));
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

              {/* Emotional tone */}
              <Section title="Emotional tone (last 30 days)">
                <SentimentSection sentiment={sentiment ?? { last30: { positive: 0, reflective: 0, challenging: 0, neutral: 0, total: 0 }, weeklyScores: [] }} />
              </Section>

              {/* Patterns */}
              <Section title="Patterns">
                <PatternsSection patterns={patterns ?? { timeSlots: [], topTags: [] }} />
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
