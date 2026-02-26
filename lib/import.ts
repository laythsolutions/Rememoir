"use client";

import { addEntry, db } from "./db";
import { saveMediaFile } from "./opfs";
import type { MediaRef, ImageRef, AIInsight } from "./types";

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
  source?: string;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function getExistingTimestamps(): Promise<Set<string>> {
  const existing = await db.entries.filter((e) => !e.deleted).toArray();
  return new Set(existing.map((e) => e.createdAt));
}

/** Decode a base64 string to a Blob */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

type InsertRow = {
  text: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
  starred?: boolean;
  aiInsight?: AIInsight;
  // base64 media payloads from v2 exports
  images?: Array<{ mimeType: string; size: number; base64?: string }>;
  audio?: { mimeType: string; duration: number; size: number; base64?: string };
  video?: { mimeType: string; duration: number; size: number; base64?: string };
};

async function insertEntries(
  rows: InsertRow[],
  existingTimestamps: Set<string>
): Promise<ImportResult> {
  let imported = 0, skipped = 0, errors = 0;
  for (const row of rows) {
    try {
      if (!row.createdAt) { skipped++; continue; }
      if (existingTimestamps.has(row.createdAt)) { skipped++; continue; }

      // Restore images from base64 if present
      let images: ImageRef[] | undefined;
      if (row.images?.length) {
        const restored = await Promise.all(
          row.images.map(async (img) => {
            if (!img.base64) return null;
            try {
              const ext = img.mimeType.split("/")[1] ?? "jpg";
              const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
              const blob = base64ToBlob(img.base64, img.mimeType);
              const path = await saveMediaFile(blob, filename);
              return { path, mimeType: img.mimeType, size: img.size } satisfies ImageRef;
            } catch { return null; }
          })
        );
        const valid = restored.filter(Boolean) as ImageRef[];
        if (valid.length) images = valid;
      }

      // Restore audio from base64
      let audio: MediaRef | undefined;
      if (row.audio?.base64) {
        try {
          const ext = row.audio.mimeType.split("/")[1] ?? "webm";
          const filename = `audio_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const blob = base64ToBlob(row.audio.base64, row.audio.mimeType);
          const path = await saveMediaFile(blob, filename);
          audio = { path, mimeType: row.audio.mimeType, duration: row.audio.duration, size: blob.size };
        } catch { /* skip on error */ }
      }

      // Restore video from base64
      let video: MediaRef | undefined;
      if (row.video?.base64) {
        try {
          const ext = row.video.mimeType.split("/")[1] ?? "webm";
          const filename = `video_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const blob = base64ToBlob(row.video.base64, row.video.mimeType);
          const path = await saveMediaFile(blob, filename);
          video = { path, mimeType: row.video.mimeType, duration: row.video.duration, size: blob.size };
        } catch { /* skip on error */ }
      }

      await addEntry({
        text: row.text ?? "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? row.createdAt,
        tags: row.tags,
        starred: row.starred,
        aiInsight: row.aiInsight,
        images,
        audio,
        video,
      });
      existingTimestamps.add(row.createdAt);
      imported++;
    } catch {
      errors++;
    }
  }
  return { imported, skipped, errors };
}

// ─── Rememoir JSON ───────────────────────────────────────────────────────────

export async function importJSON(file: File): Promise<ImportResult> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || !Array.isArray(data.entries)) {
    throw new Error("Invalid export file: missing entries array.");
  }

  const timestamps = await getExistingTimestamps();
  const rows: InsertRow[] = data.entries
    .filter((e: { deleted?: boolean }) => !e.deleted)
    .map((e: Record<string, unknown>) => ({
      text: (e.text as string) ?? "",
      createdAt: (e.createdAt as string) ?? "",
      updatedAt: e.updatedAt as string | undefined,
      tags: Array.isArray(e.tags) ? (e.tags as string[]) : undefined,
      starred: typeof e.starred === "boolean" ? e.starred : undefined,
      aiInsight: e.aiInsight as AIInsight | undefined,
      images: Array.isArray(e.images) ? (e.images as InsertRow["images"]) : undefined,
      audio: e.audio as InsertRow["audio"],
      video: e.video as InsertRow["video"],
    }));

  return { ...(await insertEntries(rows, timestamps)), source: "Rememoir JSON" };
}

// ─── Day One JSON ─────────────────────────────────────────────────────────────

export async function importDayOne(file: File): Promise<ImportResult> {
  const raw = await file.text();
  const data = JSON.parse(raw);

  const entries: unknown[] = Array.isArray(data.entries) ? data.entries : [];
  if (entries.length === 0) {
    throw new Error("No entries found. Make sure this is a Day One JSON export.");
  }

  const timestamps = await getExistingTimestamps();
  const rows = entries
    .map((e) => {
      const entry = e as {
        text?: string;
        creationDate?: string;
        modifiedDate?: string;
        tags?: string[];
        starred?: boolean;
      };
      if (!entry.creationDate) return null;

      const text = (entry.text ?? "").trim();
      const createdAt = new Date(entry.creationDate).toISOString();
      const updatedAt = entry.modifiedDate ? new Date(entry.modifiedDate).toISOString() : createdAt;
      const tags = Array.isArray(entry.tags)
        ? entry.tags.map((t: string) => t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")).filter(Boolean)
        : undefined;

      return { text, createdAt, updatedAt, tags, starred: !!entry.starred };
    })
    .filter(Boolean) as InsertRow[];

  return { ...(await insertEntries(rows, timestamps)), source: "Day One" };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────

function parseHeadingDate(heading: string): Date | null {
  const iso = heading.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    const d = new Date(iso[1] + "T12:00:00");
    if (!isNaN(d.getTime())) return d;
  }
  const d = new Date(heading.replace(/\bat\b/i, ""));
  if (!isNaN(d.getTime())) return d;
  return null;
}

export async function importMarkdown(file: File): Promise<ImportResult> {
  const raw = await file.text();
  const timestamps = await getExistingTimestamps();
  const parts = raw.split(/^(?=##\s)/m).filter((s) => s.trim());
  const rows: InsertRow[] = [];

  for (const part of parts) {
    const headingMatch = part.match(/^##\s+(.+)\n/);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      const date = parseHeadingDate(heading);
      const body = part.replace(/^##\s+.+\n/, "").replace(/^---\s*$/m, "").trim();
      const createdAt = date ? date.toISOString() : new Date().toISOString();
      if (body) rows.push({ text: body, createdAt, updatedAt: createdAt });
    } else {
      const body = part.trim();
      if (body) rows.push({ text: body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }

  if (rows.length === 0 && raw.trim()) {
    rows.push({ text: raw.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  return { ...(await insertEntries(rows, timestamps)), source: "Markdown" };
}

// ─── Auto-detect dispatcher ───────────────────────────────────────────────────

export async function importFile(file: File): Promise<ImportResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "md" || ext === "txt") return importMarkdown(file);

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    const firstEntry = Array.isArray(data.entries) ? data.entries[0] : null;
    const isDayOne = firstEntry && "creationDate" in firstEntry;
    return isDayOne ? importDayOne(file) : importJSON(file);
  }

  throw new Error(`Unsupported file type ".${ext}". Use .json, .md, or .txt.`);
}
