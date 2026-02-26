"use client";

import { useState, useEffect } from "react";
import { Download, FileJson, FileText, Loader2, AlertTriangle, ChevronDown, ChevronUp, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllEntries, getAllTags } from "@/lib/db";
import { exportJSON, exportPDF, exportMarkdown, exportTherapyBrief, type ExportOpts } from "@/lib/export";
import { getPreferences, savePreferences } from "@/lib/preferences";
import { SettingsSection } from "./shared";

export function ExportSection() {
  const [exportingJSON, setExportingJSON] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingMD, setExportingMD] = useState(false);
  const [exportingBrief, setExportingBrief] = useState(false);

  const [showOptions, setShowOptions] = useState(false);
  const [exportTag, setExportTag] = useState("");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportCount, setExportCount] = useState<number | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [daysSinceExport, setDaysSinceExport] = useState<number | null>(null);

  useEffect(() => {
    getAllTags().then(setAllTags);
    const prefs = getPreferences();
    if (prefs.lastExportDate) {
      const days = Math.floor(
        (Date.now() - new Date(prefs.lastExportDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysSinceExport(days);
    } else {
      setDaysSinceExport(999);
    }
  }, []);

  // Update preview count when filters change
  useEffect(() => {
    if (!showOptions) return;
    getAllEntries().then((all) => {
      const opts = buildOpts();
      const count = all.filter((e) => {
        if (opts.tag && !e.tags?.includes(opts.tag)) return false;
        if (opts.from && e.createdAt < opts.from) return false;
        if (opts.to && e.createdAt > opts.to + "T23:59:59.999Z") return false;
        return true;
      }).length;
      setExportCount(count);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOptions, exportTag, exportFrom, exportTo]);

  function buildOpts(): ExportOpts {
    return {
      tag: exportTag || undefined,
      from: exportFrom || undefined,
      to: exportTo || undefined,
    };
  }

  const recordExport = () => {
    savePreferences({ lastExportDate: new Date().toISOString() });
    setDaysSinceExport(0);
  };

  const handleExportJSON = async () => {
    setExportingJSON(true);
    try { const entries = await getAllEntries(); await exportJSON(entries, buildOpts()); recordExport(); }
    finally { setExportingJSON(false); }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try { const entries = await getAllEntries(); await exportPDF(entries, buildOpts()); recordExport(); }
    finally { setExportingPDF(false); }
  };

  const handleExportMD = async () => {
    setExportingMD(true);
    try { const entries = await getAllEntries(); exportMarkdown(entries, buildOpts()); recordExport(); }
    finally { setExportingMD(false); }
  };

  const handleExportBrief = async () => {
    setExportingBrief(true);
    try { const entries = await getAllEntries(); await exportTherapyBrief(entries); }
    finally { setExportingBrief(false); }
  };

  return (
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
          JSON exports include photos, audio, and video as embedded data so you can fully restore them later.
        </p>

        {/* Options toggle */}
        <button
          onClick={() => setShowOptions((v) => !v)}
          className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-border bg-background/60 hover:bg-muted/40 transition-all duration-150 cursor-pointer"
        >
          <span className="text-[13px] font-medium text-foreground/80">
            Export options
            {exportCount !== null && showOptions && (
              <span className="ml-2 text-[12px] text-muted-foreground font-normal">
                {exportCount} {exportCount === 1 ? "entry" : "entries"}
              </span>
            )}
          </span>
          {showOptions
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showOptions && (
          <div className="flex flex-col gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
            {allTags.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Tag</label>
                <select
                  value={exportTag}
                  onChange={(e) => setExportTag(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                >
                  <option value="">All tags</option>
                  {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
                </select>
              </div>
            )}
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
            {exportCount !== null && (
              <p className="text-[12px] text-muted-foreground">
                {exportCount} {exportCount === 1 ? "entry" : "entries"} will be exported
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <Button variant="outline" onClick={handleExportJSON} disabled={exportingJSON} className="gap-2 rounded-xl cursor-pointer">
            {exportingJSON ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileJson className="w-4 h-4" />}
            Export JSON
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={exportingPDF} className="gap-2 rounded-xl cursor-pointer">
            {exportingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </Button>
          <Button variant="outline" onClick={handleExportMD} disabled={exportingMD} className="gap-2 rounded-xl cursor-pointer">
            {exportingMD ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            Export Markdown
          </Button>
        </div>

        <div className="pt-1 border-t border-border/60 flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">For your therapist</p>
          <Button variant="outline" onClick={handleExportBrief} disabled={exportingBrief} className="gap-2 rounded-xl cursor-pointer self-start">
            {exportingBrief ? <Loader2 className="w-4 h-4 animate-spin" /> : <HeartPulse className="w-4 h-4" />}
            Export therapy brief
          </Button>
          <p className="text-[11px] text-muted-foreground/70">
            Sentiment overview, recurring themes & notable entries — last 30 days.
          </p>
        </div>
      </div>
    </SettingsSection>
  );
}
