"use client";

import type { RememoirEntry } from "./types";
import { formatDate, formatTime } from "./utils";

/** Export all entries as a JSON file download */
export function exportJSON(entries: RememoirEntry[]): void {
  const data = {
    exported_at: new Date().toISOString(),
    version: 1,
    entries: entries.map((e) => ({
      ...e,
      // Omit OPFS paths — media files are not portable in JSON export
      audio: e.audio ? { mimeType: e.audio.mimeType, duration: e.audio.duration } : undefined,
      video: e.video ? { mimeType: e.video.mimeType, duration: e.video.duration } : undefined,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, `rememoir-export-${formatFilename()}.json`);
}

/** Export all entries as a PDF (lazy-loads jspdf) */
export async function exportPDF(entries: RememoirEntry[]): Promise<void> {
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
  doc.text(`Total entries: ${entries.length}`, margin, 68);

  if (entries.length === 0) {
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

  entries.forEach((entry, i) => {
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

    if (entry.audio) addText("🎙 Audio recording attached", 9, false, [120, 120, 120]);
    if (entry.video) addText("📹 Video recording attached", 9, false, [120, 120, 120]);

    // Separator
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    y += 6;
  });

  doc.save(`rememoir-export-${formatFilename()}.pdf`);
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
