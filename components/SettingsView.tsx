"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileJson, Loader2, Upload, Github, Check, BookMarked, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StorageIndicator } from "@/components/StorageIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getAllEntries, getEntryCount } from "@/lib/db";
import { exportJSON, exportPDF } from "@/lib/export";
import { importJSON, type ImportResult } from "@/lib/import";
import { getProfile, saveProfile, type UserProfile } from "@/lib/profile";

export function SettingsView() {
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);

  const [profile, setProfile] = useState<UserProfile>({ name: "", bio: "" });
  const [profileSaved, setProfileSaved] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(getProfile());
  }, []);

  const handleSaveProfile = () => {
    saveProfile(profile);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleExportJSON = async () => {
    setExportingJSON(true);
    try {
      const entries = await getAllEntries();
      exportJSON(entries);
    } finally {
      setExportingJSON(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const entries = await getAllEntries();
      await exportPDF(entries);
    } finally {
      setExportingPDF(false);
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
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                Download all your entries. Your data belongs to you, always.
              </p>
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
