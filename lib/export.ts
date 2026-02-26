"use client";

import type { RememoirEntry } from "./types";
import { formatDate, formatTime } from "./utils";
import { readMediaAsBase64 } from "./opfs";

export interface ExportOpts {
  tag?: string;
  from?: string;
  to?: string;
}

function matchesOpts(entry: RememoirEntry, opts?: ExportOpts): boolean {
  if (!opts) return true;
  if (opts.tag && !entry.tags?.includes(opts.tag)) return false;
  if (opts.from && entry.createdAt < opts.from) return false;
  if (opts.to && entry.createdAt > opts.to + "T23:59:59.999Z") return false;
  return true;
}

/** Export entries as a JSON file download (includes media as base64 when OPFS is accessible) */
export async function exportJSON(entries: RememoirEntry[], opts?: ExportOpts): Promise<void> {
  const filtered = entries.filter((e) => matchesOpts(e, opts));

  const serialised = await Promise.all(
    filtered.map(async (e) => {
      // Attempt to read each media file as base64; fall back to metadata-only on failure
      let imageData: Array<{ mimeType: string; size: number; base64: string }> | undefined;
      if (e.images?.length) {
        imageData = (
          await Promise.all(
            e.images.map(async (img) => {
              try {
                const base64 = await readMediaAsBase64(img.path);
                return { mimeType: img.mimeType, size: img.size, base64 };
              } catch {
                return null;
              }
            })
          )
        ).filter(Boolean) as Array<{ mimeType: string; size: number; base64: string }>;
      }

      let audioData: { mimeType: string; duration: number; size: number; base64: string } | undefined;
      if (e.audio) {
        try {
          const base64 = await readMediaAsBase64(e.audio.path);
          audioData = { mimeType: e.audio.mimeType, duration: e.audio.duration, size: e.audio.size, base64 };
        } catch { /* omit */ }
      }

      let videoData: { mimeType: string; duration: number; size: number; base64: string } | undefined;
      if (e.video) {
        try {
          const base64 = await readMediaAsBase64(e.video.path);
          videoData = { mimeType: e.video.mimeType, duration: e.video.duration, size: e.video.size, base64 };
        } catch { /* omit */ }
      }

      return {
        ...e,
        // Replace OPFS path refs with self-contained base64 payloads
        audio: audioData,
        video: videoData,
        images: imageData,
      };
    })
  );

  const data = {
    exported_at: new Date().toISOString(),
    version: 2,
    entries: serialised,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, `rememoir-export-${formatFilename()}.json`);
}

/** Export entries as a PDF (lazy-loads jspdf) */
export async function exportPDF(entries: RememoirEntry[], opts?: ExportOpts): Promise<void> {
  const filtered = entries.filter((e) => matchesOpts(e, opts));

  // Dynamic import keeps jspdf out of the initial bundle
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Cover page
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(99, 102, 241); // indigo-500
  doc.text("Rememoir", margin, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text("My memories, my thoughts, my reflections, Me.", margin, 52);
  doc.text(`Exported: ${new Date().toLocaleDateString()}`, margin, 60);
  doc.text(`Total entries: ${filtered.length}`, margin, 68);

  if (filtered.length === 0) {
    doc.save(`rememoir-export-${formatFilename()}.pdf`);
    return;
  }

  doc.addPage();

  let y = margin;

  const addText = (text: string, size: number, bold = false, color: [number, number, number] = [30, 30, 30]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);

    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    const lineHeight = size * 0.45;

    if (y + lines.length * lineHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }

    doc.text(lines, margin, y);
    y += lines.length * lineHeight + 2;
  };

  filtered.forEach((entry, i) => {
    if (i > 0) {
      y += 6;
      if (y > doc.internal.pageSize.getHeight() - margin - 30) {
        doc.addPage();
        y = margin;
      }
    }

    addText(
      `${formatDate(entry.createdAt)} at ${formatTime(entry.createdAt)}`,
      10,
      true,
      [99, 102, 241]
    );

    if (entry.text) {
      addText(entry.text, 11, false, [30, 30, 30]);
    }

    if (entry.tags && entry.tags.length > 0) {
      addText(`Tags: ${entry.tags.map((t) => `#${t}`).join(", ")}`, 9, false, [120, 120, 120]);
    }

    if (entry.audio) addText("Audio recording attached", 9, false, [120, 120, 120]);
    if (entry.video) addText("Video recording attached", 9, false, [120, 120, 120]);
    if (entry.images?.length) addText(`${entry.images.length} photo${entry.images.length === 1 ? "" : "s"} attached`, 9, false, [120, 120, 120]);

    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 6;
  });

  doc.save(`rememoir-export-${formatFilename()}.pdf`);
}

/** Export entries as a Markdown file download */
export function exportMarkdown(entries: RememoirEntry[], opts?: ExportOpts): void {
  const filtered = entries.filter((e) => matchesOpts(e, opts));
  const lines: string[] = [];

  filtered.forEach((entry) => {
    lines.push(`## ${formatDate(entry.createdAt)} at ${formatTime(entry.createdAt)}`);
    lines.push("");
    if (entry.text) {
      lines.push(entry.text);
    }
    if (entry.tags && entry.tags.length > 0) {
      lines.push("");
      lines.push(`Tags: ${entry.tags.map((t) => `#${t}`).join(" ")}`);
    }
    if (entry.audio) { lines.push(""); lines.push("_Audio recording attached_"); }
    if (entry.video) { lines.push(""); lines.push("_Video recording attached_"); }
    if (entry.images?.length) { lines.push(""); lines.push(`_${entry.images.length} photo${entry.images.length === 1 ? "" : "s"} attached_`); }
    lines.push("");
    lines.push("---");
    lines.push("");
  });

  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  triggerDownload(blob, `rememoir-export-${formatFilename()}.md`);
}

/** Export a therapy-session brief as PDF — sentiment overview, themes, notable entries */
export async function exportTherapyBrief(entries: RememoirEntry[]): Promise<void> {
  const active = entries.filter((e) => !e.deleted);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 20, mr = 20, mt = 20;
  const cw = pw - ml - mr;
  let y = mt;

  const INDIGO: [number, number, number] = [99, 102, 241];
  const ROSE:   [number, number, number] = [239, 68, 68];
  const GREEN:  [number, number, number] = [34, 197, 94];
  const GRAY:   [number, number, number] = [107, 114, 128];
  const DARK:   [number, number, number] = [30, 30, 30];

  const addLine = (text: string, size: number, bold = false, color: [number, number, number] = DARK, extraY = 0) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, cw) as string[];
    const lh = size * 0.45;
    if (y + lines.length * lh + 4 > ph - mt) { doc.addPage(); y = mt; }
    doc.text(lines, ml, y);
    y += lines.length * lh + 2 + extraY;
  };

  const rule = (color: [number, number, number] = [220, 220, 220]) => {
    doc.setDrawColor(...color);
    doc.line(ml, y, pw - mr, y);
    y += 4;
  };

  // ── Cover ──────────────────────────────────────────────────────────────────
  doc.setFillColor(248, 247, 244);
  doc.rect(0, 0, pw, 60, "F");
  addLine("Rememoir", 22, true, INDIGO);
  addLine("Therapy Session Brief", 13, false, GRAY, 2);

  const dateRange = active.length > 0
    ? `${formatDate(active[active.length - 1].createdAt)} – ${formatDate(active[0].createdAt)}`
    : "No date range";
  addLine(dateRange, 10, false, GRAY, 6);

  // ── 30-day snapshot ────────────────────────────────────────────────────────
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = active.filter((e) => new Date(e.createdAt) >= cutoff);
  const analysed = recent.filter((e) => e.aiInsight);

  const counts = { positive: 0, reflective: 0, challenging: 0, neutral: 0 };
  let totalIntensity = 0;
  for (const e of analysed) {
    counts[e.aiInsight!.sentiment]++;
    totalIntensity += e.aiInsight!.intensity ?? 3;
  }
  const avgIntensity = analysed.length ? (totalIntensity / analysed.length).toFixed(1) : "—";

  addLine("30-Day Snapshot", 12, true, DARK, 2);
  rule();

  const snap = [
    ["Total entries", String(recent.length)],
    ["AI-analysed", String(analysed.length)],
    ["Avg intensity (1–5)", String(avgIntensity)],
  ];
  for (const [label, val] of snap) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...GRAY);
    doc.text(label, ml, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK);
    doc.text(val, pw - mr, y, { align: "right" });
    y += 5.5;
  }
  y += 3;

  // Sentiment bar chart (horizontal)
  addLine("Emotional Tone Breakdown", 12, true, DARK, 2);
  rule();

  const sentimentColors: Record<string, [number, number, number]> = {
    positive: GREEN, reflective: INDIGO, neutral: GRAY, challenging: ROSE,
  };
  const total = analysed.length || 1;
  for (const [key, count] of Object.entries(counts)) {
    const pct = Math.round((count / total) * 100);
    const barW = Math.round((count / total) * (cw - 40));
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRAY);
    doc.text(`${key} (${pct}%)`, ml, y);
    y += 4;
    doc.setFillColor(...(sentimentColors[key] ?? GRAY));
    doc.roundedRect(ml, y - 2, Math.max(barW, 2), 4, 1, 1, "F");
    y += 5;
  }
  y += 4;

  // ── Recurring themes ───────────────────────────────────────────────────────
  const tagFreq = new Map<string, number>();
  for (const e of recent) for (const t of e.tags ?? []) tagFreq.set(t, (tagFreq.get(t) ?? 0) + 1);
  const topTags = [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

  if (topTags.length > 0) {
    addLine("Recurring Themes", 12, true, DARK, 2);
    rule();
    addLine(topTags.map(([t, n]) => `#${t} (${n}×)`).join("   "), 10, false, INDIGO, 4);
  }

  // ── Notable entries ────────────────────────────────────────────────────────
  const mostPositive = analysed.filter((e) => e.aiInsight!.sentiment === "positive")
    .sort((a, b) => (b.aiInsight!.intensity ?? 3) - (a.aiInsight!.intensity ?? 3))[0];
  const mostChallenging = analysed.filter((e) => e.aiInsight!.sentiment === "challenging")
    .sort((a, b) => (b.aiInsight!.intensity ?? 3) - (a.aiInsight!.intensity ?? 3))[0];

  if (mostPositive || mostChallenging) {
    addLine("Notable Entries", 12, true, DARK, 2);
    rule();
    if (mostPositive) {
      addLine(`Most uplifting — ${formatDate(mostPositive.createdAt)}`, 10, true, GREEN);
      addLine(mostPositive.aiInsight!.summary, 10, false, DARK, 3);
    }
    if (mostChallenging) {
      addLine(`Most challenging — ${formatDate(mostChallenging.createdAt)}`, 10, true, ROSE);
      addLine(mostChallenging.aiInsight!.summary, 10, false, DARK, 3);
    }
  }

  // ── Writing consistency ────────────────────────────────────────────────────
  const daySet = new Set(recent.map((e) => e.createdAt.slice(0, 10)));
  const wordCounts = recent.map((e) => e.text?.trim().split(/\s+/).filter(Boolean).length ?? 0);
  const avgWords = wordCounts.length ? Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length) : 0;

  addLine("Writing Consistency", 12, true, DARK, 2);
  rule();
  const cons = [
    ["Days written (last 30)", `${daySet.size} / 30`],
    ["Avg words per entry", String(avgWords)],
    ["Total entries (all time)", String(active.length)],
  ];
  for (const [label, val] of cons) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...GRAY);
    doc.text(label, ml, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...DARK);
    doc.text(val, pw - mr, y, { align: "right" });
    y += 5.5;
  }
  y += 6;

  // ── Footer disclaimer ──────────────────────────────────────────────────────
  if (y > ph - 30) { doc.addPage(); y = mt; }
  rule([200, 200, 200]);
  addLine(
    "Generated by Rememoir — this is not a clinical document. AI sentiment analysis is indicative only and should not be used as a diagnostic tool.",
    8, false, GRAY
  );

  doc.save(`rememoir-therapy-brief-${formatFilename()}.pdf`);
}

function formatFilename(): string {
  return new Date().toISOString().slice(0, 10);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
