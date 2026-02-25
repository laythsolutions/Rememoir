"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft, Download, FileJson, FileText, Loader2, Upload,
  Github, Check, BookMarked, ChevronRight, ChevronDown, ChevronUp,
  AlertTriangle, Tag, Pencil, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StorageIndicator } from "@/components/StorageIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAllEntries, getEntryCount, getAllTags, removeTagFromAllEntries, renameTagInAllEntries } from "@/lib/db";
import { exportJSON, exportPDF, exportMarkdown, type ExportOpts } from "@/lib/export";
import { importJSON, type ImportResult } from "@/lib/import";
import { getProfile, saveProfile, type UserProfile } from "@/lib/profile";
import { getPreferences, savePreferences, type PromptFrequency } from "@/lib/preferences";

export function SettingsView() {
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingMD, setExportingMD] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);

  const [profile, setProfile] = useState<UserProfile>({ name: "", bio: "" });
  const [profileSaved, setProfileSaved] = useState(false);

  // Export options
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportTag, setExportTag] = useState<string>("");
  const [exportFrom, setExportFrom] = useState<string>("");
  const [exportTo, setExportTo] = useState<string>("");
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Prompt frequency
  const [promptFrequency, setPromptFrequency] = useState<PromptFrequency>("daily");

  // Backup nudge
  const [daysSinceExport, setDaysSinceExport] = useState<number | null>(null);

  // Tag management
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(getProfile());
    const prefs = getPreferences();
    setPromptFrequency(prefs.promptFrequency);
    getAllTags().then(setAllTags);
    if (prefs.lastExportDate) {
      const days = Math.floor(
        (Date.now() - new Date(prefs.lastExportDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysSinceExport(days);
    } else {
      setDaysSinceExport(999); // never exported
    }
  }, []);

  // Update export preview count when filters change
  useEffect(() => {
    if (!showExportOptions) return;
    getAllEntries().then((all) => {
      const opts = buildExportOpts();
      const count = all.filter((e) => {
        if (opts.tag && !e.tags?.includes(opts.tag)) return false;
        if (opts.from && e.createdAt < opts.from) return false;
        if (opts.to && e.createdAt > opts.to + "T23:59:59.999Z") return false;
        return true;
      }).length;
      setExportCount(count);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showExportOptions, exportTag, exportFrom, exportTo]);

  function buildExportOpts(): ExportOpts {
    return {
      tag: exportTag || undefined,
      from: exportFrom || undefined,
      to: exportTo || undefined,
    };
  }

  const handleSaveProfile = () => {
    saveProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const recordExport = () => {
    savePreferences({ lastExportDate: new Date().toISOString() });
    setDaysSinceExport(0);
  };

  const handleExportJSON = async () => {
    setExportingJSON(true);
    try {
      const entries = await getAllEntries();
      exportJSON(entries, buildExportOpts());
      recordExport();
    } finally {
      setExportingJSON(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const entries = await getAllEntries();
      await exportPDF(entries, buildExportOpts());
      recordExport();
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportMD = async () => {
    setExportingMD(true);
    try {
      const entries = await getAllEntries();
      exportMarkdown(entries, buildExportOpts());
      recordExport();
    } finally {
      setExportingMD(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    setImportError(null);
    try {
      const result = await importJSON(file);
      setImportResult(result);
      if (entryCount !== null) {
        const count = await getEntryCount();
        setEntryCount(count);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import file.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const loadCount = async () => {
    const count = await getEntryCount();
    setEntryCount(count);
  };

  const handlePromptFrequency = (freq: PromptFrequency) => {
    setPromptFrequency(freq);
    savePreferences({ promptFrequency: freq });
  };

  const handleStartRename = (tag: string) => {
    setRenamingTag(tag);
    setRenameValue(tag);
    setDeleteConfirmTag(null);
  };

  const handleConfirmRename = async () => {
    if (!renamingTag) return;
    const trimmed = renameValue.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || trimmed === renamingTag) { setRenamingTag(null); return; }
    await renameTagInAllEntries(renamingTag, trimmed);
    setAllTags((prev) => prev.map((t) => (t === renamingTag ? trimmed : t)).sort());
    setRenamingTag(null);
  };

  const handleDeleteTag = async (tag: string) => {
    await removeTagFromAllEntries(tag);
    setAllTags((prev) => prev.filter((t) => t !== tag));
    setDeleteConfirmTag(null);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <h1 className="text-base font-semibold tracking-tight">Settings</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="pb-8 flex flex-col gap-8 animate-page-in">
          {/* Profile */}
          <SettingsSection title="Profile">
            <div className="flex flex-col gap-4">
              <Field label="Your name" htmlFor="profile-name">
                <input
                  id="profile-name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                  placeholder="What should we call you?"
                  maxLength={60}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200"
                />
              </Field>
              <Field label="Journaling intention" htmlFor="profile-bio">
                <textarea
                  id="profile-bio"
                  value={profile.bio}
                  onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Why do you journal? What do you hope to discover?"
                  maxLength={500}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 resize-none transition-all duration-200"
                />
                <p className="text-[11px] text-muted-foreground/60 text-right">{profile.bio.length}/500</p>
              </Field>
              <Button
                onClick={handleSaveProfile}
                variant={profileSaved ? "outline" : "default"}
                size="sm"
                className="self-start gap-2 rounded-xl cursor-pointer"
              >
                {profileSaved ? (
                  <><Check className="w-3.5 h-3.5" /> Saved</>
                ) : (
                  "Save profile"
                )}
              </Button>
            </div>
          </SettingsSection>

          {/* Prompts */}
          <SettingsSection title="Prompts">
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                How often should a writing prompt appear on your home screen?
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "daily", label: "Daily" },
                    { value: "every3days", label: "Every 3 days" },
                    { value: "weekly", label: "Weekly" },
                    { value: "off", label: "Off" },
                  ] as { value: PromptFrequency; label: string }[]
                ).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handlePromptFrequency(value)}
                    className={`px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                      promptFrequency === value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </SettingsSection>

          {/* Tags */}
          {allTags.length > 0 && (
            <SettingsSection title="Tags">
              <div className="flex flex-col divide-y divide-border/60">
                {allTags.map((tag) => (
                  <div key={tag} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    {renamingTag === tag ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConfirmRename();
                            if (e.key === "Escape") setRenamingTag(null);
                          }}
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-primary/40 bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40"
                        />
                        <button
                          onClick={handleConfirmRename}
                          className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setRenamingTag(null)}
                          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          aria-label="Cancel rename"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : deleteConfirmTag === tag ? (
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-[13px] text-destructive">Remove #{tag} from all entries?</span>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDeleteTag(tag)}
                            className="text-[12px] font-semibold text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTag(null)}
                            className="text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="text-[13px] font-medium text-foreground/80">#{tag}</span>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => handleStartRename(tag)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
                            aria-label={`Rename tag ${tag}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeleteConfirmTag(tag); setRenamingTag(null); }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150 cursor-pointer"
                            aria-label={`Delete tag ${tag}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </SettingsSection>
          )}

          {/* My Story */}
          <SettingsSection title="My Story">
            <Link
              href="/autobiography"
              className="flex items-center justify-between p-3.5 bg-background rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookMarked className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">My Autobiography</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Life memories & long-form self-reflection
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            </Link>
          </SettingsSection>

          {/* Storage */}
          <SettingsSection title="Storage">
            <div className="flex flex-col gap-4">
              <StorageIndicator />
              <Separator />
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">Total entries</span>
                {entryCount === null ? (
                  <button
                    onClick={loadCount}
                    className="text-primary hover:text-primary/80 text-xs font-medium cursor-pointer"
                  >
                    Load count
                  </button>
                ) : (
                  <span className="font-semibold tabular-nums">{entryCount}</span>
                )}
              </div>
            </div>
          </SettingsSection>

          {/* Export */}
          <SettingsSection title="Export your data">
            <div className="flex flex-col gap-3">
              {daysSinceExport !== null && daysSinceExport > 30 && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[13px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    {daysSinceExport >= 999
                      ? "You've never exported a backup. Export one now to protect your memories."
                      : `Last backup was ${daysSinceExport} days ago. Consider exporting a fresh copy.`}
                  </p>
                </div>
              )}
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Download all your entries. Your data belongs to you, always.
              </p>
              <p className="text-[12px] text-muted-foreground/70 leading-relaxed">
                Note: audio, video, and photo files are stored locally and are not included in exports.
              </p>

              {/* Export options toggle */}
              <button
                onClick={() => setShowExportOptions((v) => !v)}
                className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/60 hover:bg-muted/40 transition-all duration-150 cursor-pointer"
              >
                <span className="text-[13px] font-medium text-foreground/80">
                  Export options
                  {exportCount !== null && showExportOptions && (
                    <span className="ml-2 text-[12px] text-muted-foreground font-normal">
                      {exportCount} {exportCount === 1 ? "entry" : "entries"}
                    </span>
                  )}
                </span>
                {showExportOptions ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {showExportOptions && (
                <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
                  {/* Tag filter */}
                  {allTags.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                        Tag
                      </label>
                      <select
                        value={exportTag}
                        onChange={(e) => setExportTag(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                      >
                        <option value="">All tags</option>
                        {allTags.map((t) => (
                          <option key={t} value={t}>#{t}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {/* Date range */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">From</label>
                      <input
                        type="date"
                        value={exportFrom}
                        onChange={(e) => setExportFrom(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">To</label>
                      <input
                        type="date"
                        value={exportTo}
                        onChange={(e) => setExportTo(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                      />
                    </div>
                  </div>
                  {/* Live count */}
                  {exportCount !== null && (
                    <p className="text-[12px] text-muted-foreground">
                      {exportCount} {exportCount === 1 ? "entry" : "entries"} will be exported
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="outline"
                  onClick={handleExportJSON}
                  disabled={exportingJSON}
                  className="gap-2 rounded-xl cursor-pointer"
                >
                  {exportingJSON ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportPDF}
                  disabled={exportingPDF}
                  className="gap-2 rounded-xl cursor-pointer"
                >
                  {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportMD}
                  disabled={exportingMD}
                  className="gap-2 rounded-xl cursor-pointer"
                >
                  {exportingMD ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Export Markdown
                </Button>
              </div>
            </div>
          </SettingsSection>

          {/* Import */}
          <SettingsSection title="Import data">
            <div className="flex flex-col gap-3">
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Import from a Rememoir JSON export. Duplicates are skipped automatically.
              </p>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImport}
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="gap-2 rounded-xl cursor-pointer"
                >
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {importing ? "Importing…" : "Import JSON"}
                </Button>
              </div>
              {importResult && (
                <p className="text-[13px] text-green-600 dark:text-green-400 font-medium">
                  Imported {importResult.imported} {importResult.imported === 1 ? "entry" : "entries"}
                  {importResult.skipped > 0 ? `, skipped ${importResult.skipped} duplicate${importResult.skipped === 1 ? "" : "s"}` : ""}.
                </p>
              )}
              {importError && (
                <p className="text-[13px] text-destructive">{importError}</p>
              )}
            </div>
          </SettingsSection>

          {/* About */}
          <SettingsSection title="About">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookMarked className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold">Rememoir</p>
                  <p className="text-[11px] text-muted-foreground">Version 0.1.0 · MIT License</p>
                </div>
              </div>
              <Separator />
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                100% open source, self-hostable, zero telemetry. Your journal stays on your device.
              </p>
              <a
                href="https://github.com/your-org/rememoir"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13px] text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer w-fit"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
        {title}
      </h2>
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
