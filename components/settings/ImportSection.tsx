"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importFile, type ImportResult } from "@/lib/import";
import { SettingsSection } from "./shared";

export function ImportSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);
    setError(null);
    try {
      const res = await importFile(file);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import file.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <SettingsSection title="Import data">
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          Import from Rememoir JSON, <span className="font-medium text-foreground/70">Day One JSON</span>, or a Markdown / plain-text file. Duplicates are skipped automatically.
        </p>

        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground/60">
          {[".json — Rememoir or Day One export", ".md — Markdown journal", ".txt — plain text"].map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full border border-border bg-muted/40">{s}</span>
          ))}
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json,.md,.txt,text/markdown,text/plain"
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
            {importing ? "Importing…" : "Choose file to import"}
          </Button>
        </div>

        {result && (
          <p className="text-[13px] text-green-600 dark:text-green-400 font-medium">
            {result.source && <span className="text-muted-foreground font-normal">{result.source} · </span>}
            Imported {result.imported} {result.imported === 1 ? "entry" : "entries"}
            {result.skipped > 0 ? `, skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}` : ""}
            {result.errors > 0 ? `, ${result.errors} error${result.errors === 1 ? "" : "s"}` : ""}.
          </p>
        )}
        {error && <p className="text-[13px] text-destructive">{error}</p>}
      </div>
    </SettingsSection>
  );
}
