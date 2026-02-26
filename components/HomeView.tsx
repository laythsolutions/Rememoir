"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Shield, Wifi, Download,
  PenLine, ScrollText, BarChart2, BookMarked, ChevronRight,
  Flame, CalendarCheck, X, HardDriveDownload, History, Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OnboardingModal } from "@/components/OnboardingModal";
import { getEntryCount, getAllEntries, getOnThisDayEntries } from "@/lib/db";
import { exportJSON } from "@/lib/export";
import { computeStats, computeWeeklyDigest, type JournalStats, type WeeklyDigest } from "@/lib/stats";
import { getProfile } from "@/lib/profile";
import { getMemories } from "@/lib/autobiography";
import { getDailyPrompt } from "@/lib/prompts";
import { isPromptDue, markPromptShown, getPreferences, savePreferences } from "@/lib/preferences";
import { maybeShowReminder } from "@/lib/reminders";
import { detectCrisisPattern, isCrisisBannerDismissed } from "@/lib/crisis";
import { CrisisBanner } from "@/components/CrisisBanner";
import type { RememoirEntry } from "@/lib/types";
import type { Prompt } from "@/lib/prompts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ─── Root component ───────────────────────────────────────────────────────────

type HomeState = "loading" | "new-user" | "returning";

export function HomeView() {
  const [homeState, setHomeState] = useState<HomeState>("loading");
  const [latestEntry, setLatestEntry] = useState<RememoirEntry | null>(null);
  const [stats, setStats] = useState<JournalStats | null>(null);
  const [writtenToday, setWrittenToday] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [memoryCount, setMemoryCount] = useState(0);
  const [showCrisis, setShowCrisis] = useState(false);
  const [onThisDay, setOnThisDay] = useState<RememoirEntry[]>([]);
  const [weeklyDigest, setWeeklyDigest] = useState<WeeklyDigest | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [daysThisWeek, setDaysThisWeek] = useState(0);

  useEffect(() => {
    async function load() {
      const { name } = getProfile();
      setProfileName(name.trim());
      setMemoryCount(getMemories().length);

      const count = await getEntryCount();
      if (count === 0) {
        setHomeState("new-user");
        return;
      }
      const all = await getAllEntries();
      setLatestEntry(all[0] ?? null);
      setStats(computeStats(all));
      setWeeklyDigest(computeWeeklyDigest(all));
      const { weeklyGoal: goal } = getPreferences();
      setWeeklyGoal(goal ?? 0);
      if (goal > 0) {
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const uniqueDays = new Set(
          all.filter((e) => new Date(e.createdAt) >= cutoff).map((e) => e.createdAt.substring(0, 10))
        );
        setDaysThisWeek(uniqueDays.size);
      }
      const today = localDateKey(new Date());
      const written = all.some((e) => e.createdAt.startsWith(today));
      setWrittenToday(written);
      setHomeState("returning");
      maybeShowReminder(written);
      getOnThisDayEntries().then(setOnThisDay);
      if (detectCrisisPattern(all) && !isCrisisBannerDismissed()) {
        setShowCrisis(true);
      }
    }
    load();
  }, []);

  if (homeState === "loading") return <HomeSkeleton />;
  if (homeState === "new-user") return <LandingPage />;
  return (
    <ReturningUserHome
      stats={stats}
      latestEntry={latestEntry}
      writtenToday={writtenToday}
      profileName={profileName}
      memoryCount={memoryCount}
      showCrisis={showCrisis}
      onThisDay={onThisDay}
      weeklyDigest={weeklyDigest}
      weeklyGoal={weeklyGoal}
      daysThisWeek={daysThisWeek}
    />
  );
}

// ─── Returning user dashboard ─────────────────────────────────────────────────

function ReturningUserHome({
  stats,
  latestEntry,
  writtenToday,
  profileName,
  memoryCount,
  showCrisis,
  onThisDay,
  weeklyDigest,
  weeklyGoal,
  daysThisWeek,
}: {
  stats: JournalStats | null;
  latestEntry: RememoirEntry | null;
  writtenToday: boolean;
  profileName: string;
  memoryCount: number;
  showCrisis: boolean;
  onThisDay: RememoirEntry[];
  weeklyDigest: WeeklyDigest | null;
  weeklyGoal: number;
  daysThisWeek: number;
}) {
  const [showPromptCard, setShowPromptCard] = useState(false);
  const [dailyPrompt, setDailyPrompt] = useState<Prompt | null>(null);
  const [showOnThisDay, setShowOnThisDay] = useState(true);
  const [showWeeklyDigest, setShowWeeklyDigest] = useState(true);
  const [showBackupNudge, setShowBackupNudge] = useState(false);
  const [daysSinceExport, setDaysSinceExport] = useState<number | null>(null);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [installEvent, setInstallEvent] = useState<Event & { prompt(): Promise<void> } | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isPromptDue()) {
      const { customPrompts } = getPreferences();
      setDailyPrompt(getDailyPrompt(new Date(), customPrompts ?? []));
      setShowPromptCard(true);
    }
    const { lastExportDate } = getPreferences();
    if (!lastExportDate) {
      setShowBackupNudge(true);
      setDaysSinceExport(999);
    } else {
      const days = Math.floor((Date.now() - new Date(lastExportDate).getTime()) / 86_400_000);
      setDaysSinceExport(days);
      if (days >= 7) setShowBackupNudge(true);
    }

    const dismissed = localStorage.getItem("rememoir_pwa_dismissed");
    if (dismissed) return;

    // iOS Safari: no beforeinstallprompt — show manual instructions
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(ua.includes("CriOS") || ua.includes("FxiOS"));
    const isStandalone = ("standalone" in navigator) && (navigator as { standalone?: boolean }).standalone;
    if (isIOS && !isStandalone) {
      setShowIOSBanner(true);
      return;
    }

    // Android / Chrome: native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as Event & { prompt(): Promise<void> });
      setShowInstallBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    setShowInstallBanner(false);
  };

  const dismissInstall = () => {
    localStorage.setItem("rememoir_pwa_dismissed", "1");
    setShowInstallBanner(false);
    setShowIOSBanner(false);
  };

  const handlePromptWrite = () => {
    markPromptShown();
    setShowPromptCard(false);
    router.push(`/entry?prompt=${encodeURIComponent(dailyPrompt!.text)}`);
  };

  const handlePromptDismiss = () => {
    markPromptShown();
    setShowPromptCard(false);
  };

  const handleQuickBackup = async () => {
    setExportingBackup(true);
    try {
      const entries = await getAllEntries();
      await exportJSON(entries);
      savePreferences({ lastExportDate: new Date().toISOString() });
      setShowBackupNudge(false);
    } finally {
      setExportingBackup(false);
    }
  };

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const streakAtRisk = stats && stats.currentStreak > 0 && !writtenToday;
  const greeting = profileName
    ? `${timeGreeting()}, ${profileName}`
    : timeGreeting();

  return (
    <main className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <span className="text-primary text-[18px] leading-none font-serif select-none" aria-hidden>✦</span>
          <span className="font-serif font-semibold text-base tracking-tight">Rememoir</span>
        </div>
        <ThemeToggle />
      </nav>

      <div className="max-w-lg mx-auto px-4 pt-7 pb-8 flex flex-col gap-6 animate-page-in">
        {/* Greeting */}
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground font-medium">{todayLabel}</p>
          <h1 className="font-serif text-[28px] font-semibold tracking-tight leading-tight">{greeting}</h1>
        </div>

        {/* Streak-at-risk nudge */}
        {streakAtRisk && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/20">
            <Flame className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
              Keep your {stats!.currentStreak}-day streak alive — write today!
            </p>
          </div>
        )}

        {/* Crisis support banner */}
        {showCrisis && <CrisisBanner />}

        {/* Backup nudge */}
        {showBackupNudge && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/8 border border-amber-500/20">
            <span className="text-amber-600 dark:text-amber-400 text-sm shrink-0">💾</span>
            <p className="text-[13px] text-amber-700 dark:text-amber-400 font-medium flex-1 leading-snug">
              {daysSinceExport === 999
                ? "No backup yet — export now to keep your memories safe."
                : `Last backup ${daysSinceExport}d ago — export a fresh copy.`}
            </p>
            <button
              onClick={handleQuickBackup}
              disabled={exportingBackup}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors cursor-pointer disabled:opacity-60 shrink-0"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              {exportingBackup ? "…" : "Export"}
            </button>
            <button
              onClick={() => setShowBackupNudge(false)}
              className="text-amber-500/60 hover:text-amber-600 transition-colors cursor-pointer shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* PWA install banner — Android/Chrome */}
        {showInstallBanner && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm">
            <Download className="w-4 h-4 text-primary shrink-0" />
            <p className="text-[13px] text-foreground/80 flex-1 leading-snug">
              Add Rememoir to your home screen for the best experience.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
              >
                Install
              </button>
              <button onClick={dismissInstall} aria-label="Dismiss" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* PWA install banner — iOS Safari */}
        {showIOSBanner && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-card border border-border shadow-sm">
            <Download className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground/80 leading-snug font-medium">Add to Home Screen</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                Tap the <span className="font-semibold">Share</span> button{" "}
                <span aria-hidden className="text-[15px] align-middle">⬆</span>{" "}
                then <span className="font-semibold">&ldquo;Add to Home Screen&rdquo;</span>
              </p>
            </div>
            <button onClick={dismissInstall} aria-label="Dismiss" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer shrink-0 mt-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Stat pills */}
        {stats && (
          <div className="flex gap-2 flex-wrap">
            <StatPill
              icon={<Flame className="w-3.5 h-3.5" />}
              label={stats.currentStreak > 0 ? `${stats.currentStreak}-day streak` : "Start a streak"}
              highlighted={stats.currentStreak > 0}
            />
            <StatPill
              icon={<CalendarCheck className="w-3.5 h-3.5" />}
              label={writtenToday ? "Written today" : "Not yet today"}
              highlighted={writtenToday}
            />
            {weeklyGoal > 0 && (
              <StatPill
                icon={<Target className="w-3.5 h-3.5" />}
                label={`Goal: ${Math.min(daysThisWeek, weeklyGoal)}/${weeklyGoal} days`}
                highlighted={daysThisWeek >= weeklyGoal}
              />
            )}
            {stats.totalEntries > 0 && (
              <StatPill
                icon={<BookOpen className="w-3.5 h-3.5" />}
                label={`${stats.totalEntries} ${stats.totalEntries === 1 ? "entry" : "entries"}`}
                highlighted={false}
              />
            )}
          </div>
        )}

        {/* Weekly digest */}
        {weeklyDigest && showWeeklyDigest && (
          <WeeklyDigestCard digest={weeklyDigest} onDismiss={() => setShowWeeklyDigest(false)} />
        )}

        {/* Daily prompt card */}
        {showPromptCard && dailyPrompt && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <span aria-hidden>✦</span> Today&rsquo;s prompt
              </span>
              <button
                onClick={handlePromptDismiss}
                aria-label="Dismiss prompt"
                className="text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[15px] font-medium text-foreground/90 leading-relaxed">
              &ldquo;{dailyPrompt.text}&rdquo;
            </p>
            <button
              onClick={handlePromptWrite}
              className="self-start text-[13px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
            >
              Write about it →
            </button>
          </div>
        )}

        {/* On this day */}
        {onThisDay.length > 0 && showOnThisDay && (
          <OnThisDayCard entries={onThisDay} onDismiss={() => setShowOnThisDay(false)} />
        )}

        {/* Latest entry preview */}
        {latestEntry && (
          <Link href="/timeline" className="group block">
            <div className="rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-2.5 group-hover:shadow-md group-hover:border-border/80 transition-all duration-200 cursor-pointer">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Latest entry
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {new Date(latestEntry.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric",
                  })}
                </span>
              </div>
              {latestEntry.text ? (
                <p className="text-[14px] leading-relaxed line-clamp-3 text-foreground/85">
                  {latestEntry.text}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No text — recording only</p>
              )}
              {latestEntry.tags && latestEntry.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {latestEntry.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        )}

        {/* Primary CTA */}
        <Link href="/entry" className="group block">
          <div className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] shadow-md shadow-primary/20 group-hover:shadow-lg group-hover:shadow-primary/25 group-hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 cursor-pointer">
            <PenLine className="w-5 h-5" />
            {writtenToday ? "Write another entry" : "Write today's entry"}
          </div>
        </Link>

        {/* Secondary CTAs */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/timeline" className="group block">
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card shadow-sm font-medium text-sm text-foreground/80 group-hover:border-primary/30 group-hover:text-primary group-hover:shadow-md transition-all duration-200 cursor-pointer">
              <ScrollText className="w-4 h-4" />
              Journal
            </div>
          </Link>
          <Link href="/autobiography" className="group block">
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card shadow-sm font-medium text-sm text-foreground/80 group-hover:border-primary/30 group-hover:text-primary group-hover:shadow-md transition-all duration-200 cursor-pointer">
              <BookMarked className="w-4 h-4" />
              My Story
            </div>
          </Link>
        </div>

        {/* My Story card */}
        <Link href="/autobiography" className="group block">
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-card shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all duration-200 cursor-pointer">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookMarked className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">My Story</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {memoryCount > 0
                  ? `${memoryCount} life ${memoryCount === 1 ? "memory" : "memories"} · About Me`
                  : "Capture life memories & your autobiography"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </div>
    </main>
  );
}

// ─── Weekly digest card ───────────────────────────────────────────────────────

const SENTIMENT_EMOJI: Record<string, string> = {
  positive: "🌱", reflective: "💭", challenging: "🌊", neutral: "📝",
};

function WeeklyDigestCard({ digest, onDismiss }: { digest: WeeklyDigest; onDismiss: () => void }) {
  const stats: { label: string; value: string }[] = [
    { label: "Entries", value: String(digest.entryCount) },
    { label: "Days written", value: `${digest.daysWritten}/7` },
    { label: "Avg words", value: String(digest.avgWords) },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          Last 7 days
        </span>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="flex-1 flex flex-col gap-0.5 rounded-xl bg-muted/50 px-3 py-2.5">
            <span className="text-[18px] font-bold tabular-nums">{value}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 text-[12px] text-muted-foreground flex-wrap">
        {digest.dominantSentiment && (
          <span>
            {SENTIMENT_EMOJI[digest.dominantSentiment] ?? "💭"}{" "}
            Mostly <span className="font-medium text-foreground/80">{digest.dominantSentiment}</span>
          </span>
        )}
        {digest.topTag && (
          <span>
            Top tag{" "}
            <span className="font-medium text-primary">#{digest.topTag}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── On This Day card ─────────────────────────────────────────────────────────

function OnThisDayCard({ entries, onDismiss }: { entries: RememoirEntry[]; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);

  // Get unique years represented
  const years = [...new Set(entries.map((e) => new Date(e.createdAt).getFullYear()))].sort();
  const yearLabel = years.length === 1
    ? `${years[0]}`
    : `${years[0]}–${years[years.length - 1]}`;

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });

  const shown = expanded ? entries : entries.slice(0, 2);

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-semibold text-primary uppercase tracking-widest">
            On this day · {yearLabel}
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[12px] text-muted-foreground -mt-1">
        {entries.length} {entries.length === 1 ? "entry" : "entries"} from {dateLabel} in past years
      </p>

      <div className="flex flex-col gap-3">
        {shown.map((entry) => {
          const year = new Date(entry.createdAt).getFullYear();
          const yearsAgo = today.getFullYear() - year;
          return (
            <div key={entry.id} className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-primary/70">
                {year} · {yearsAgo} {yearsAgo === 1 ? "year" : "years"} ago
              </span>
              {entry.text ? (
                <p className="text-[13px] leading-relaxed text-foreground/80 line-clamp-2">
                  {entry.text}
                </p>
              ) : (
                <p className="text-[13px] italic text-muted-foreground">Recording only</p>
              )}
            </div>
          );
        })}
      </div>

      {entries.length > 2 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          {expanded ? "Show less" : `Show ${entries.length - 2} more →`}
        </button>
      )}
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  highlighted,
}: {
  icon: React.ReactNode;
  label: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border ${
        highlighted
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-muted/80 text-muted-foreground border-transparent"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HomeSkeleton() {
  return (
    <main className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 py-3.5 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-muted rounded animate-pulse" />
          <div className="w-24 h-5 bg-muted rounded animate-pulse" />
        </div>
        <div className="w-8 h-8 bg-muted rounded-lg animate-pulse" />
      </nav>
      <div className="max-w-lg mx-auto px-4 pt-7 pb-8 flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="h-4 w-36 bg-muted rounded animate-pulse" />
          <div className="h-8 w-52 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-28 bg-muted rounded-full animate-pulse" />
          <div className="h-7 w-28 bg-muted rounded-full animate-pulse" />
          <div className="h-7 w-20 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="h-[100px] w-full bg-muted rounded-2xl animate-pulse" />
        <div className="h-14 w-full bg-muted rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-muted rounded-xl animate-pulse" />
          <div className="h-12 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
    </main>
  );
}

// ─── Landing page (new users) ─────────────────────────────────────────────────

function LandingPage() {
  return (
    <>
      <OnboardingModal />
      <main className="min-h-screen bg-background flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-4 py-3.5 border-b border-border/60 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span className="text-primary text-[18px] leading-none font-serif select-none" aria-hidden>✦</span>
            <span className="font-serif font-semibold text-base tracking-tight">Rememoir</span>
          </div>
          <ThemeToggle />
        </nav>

        {/* Hero */}
        <section className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center">
          <div className="max-w-md animate-page-in">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-8 border border-primary/20">
              <Shield className="w-3.5 h-3.5" />
              100% private · offline-first · open source
            </div>
            <h1 className="text-4xl sm:text-5xl tracking-tight leading-[1.15] mb-5">
              <span className="font-serif italic font-normal text-foreground/65">
                My memories,
                <br />
                my thoughts,
                <br />
                my reflections,
              </span>
              <br />
              <span className="font-serif font-bold not-italic text-foreground">Me.</span>
            </h1>
            <p className="text-muted-foreground text-[17px] leading-relaxed mb-10">
              A private journal that lives on your device.
              <br />
              No accounts, no tracking, no cloud — just you.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/entry">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-[15px] px-7 h-12 shadow-md shadow-primary/20">
                  <PenLine className="w-4.5 h-4.5" />
                  Start writing
                </Button>
              </Link>
              <Link href="/timeline">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-[15px] px-7 h-12">
                  View journal
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-12 border-t border-border/60">
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Shield className="w-5 h-5 text-primary" />}
              title="Completely private"
              description="Everything stored locally on your device. Nothing leaves your browser."
            />
            <FeatureCard
              icon={<Wifi className="w-5 h-5 text-primary" />}
              title="Works offline"
              description="Installed as a PWA, Rememoir works anywhere — even in airplane mode."
            />
            <FeatureCard
              icon={<Download className="w-5 h-5 text-primary" />}
              title="Export anytime"
              description="Download all your entries as JSON or PDF. Your data, your terms."
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="px-4 py-5 border-t border-border/60 text-center">
          <p className="text-xs text-muted-foreground">
            Rememoir · MIT License · Zero telemetry
          </p>
        </footer>
      </main>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-2xl bg-card border border-border shadow-sm">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
