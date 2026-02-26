"use client";

import { addEntry, db } from "./db";

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

async function insertEntries(
  rows: Array<{ text: string; createdAt: string; updatedAt?: string; tags?: string[]; starred?: boolean }>,
  existingTimestamps: Set<string>
): Promise<ImportResult> {
  let imported = 0, skipped = 0, errors = 0;
  for (const row of rows) {
    try {
      if (!row.createdAt) { skipped++; continue; }
      if (existingTimestamps.has(row.createdAt)) { skipped++; continue; }
      await addEntry({
        text: row.text ?? "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt ?? row.createdAt,
        tags: row.tags,
        starred: row.starred,
      });
      existingTimestamps.add(row.createdAt); // prevent same-run duplicates
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
  const rows = data.entries
    .filter((e: { deleted?: boolean }) => !e.deleted)
    .map((e: { text?: string; createdAt?: string; updatedAt?: string; tags?: string[]; promptId?: number }) => ({
      text: e.text ?? "",
      createdAt: e.createdAt ?? "",
      updatedAt: e.updatedAt,
      tags: Array.isArray(e.tags) ? e.tags : undefined,
    }));

  return { ...(await insertEntries(rows, timestamps)), source: "Rememoir JSON" };
}

// ─── Day One JSON ─────────────────────────────────────────────────────────────
// Day One exports a JSON file with top-level `entries` array.
// Each entry has `text`, `creationDate` (ISO), `modifiedDate`, `tags`, `starred`.

export async function importDayOne(file: File): Promise<ImportResult> {
  const raw = await file.text();
  const data = JSON.parse(raw);

  // Day One format: { "metadata": {...}, "entries": [...] }
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

      // Day One text often starts with a markdown H1 title — keep it as-is
      const text = (entry.text ?? "").trim();
      const createdAt = new Date(entry.creationDate).toISOString();
      const updatedAt = entry.modifiedDate
        ? new Date(entry.modifiedDate).toISOString()
        : createdAt;

      const tags = Array.isArray(entry.tags)
        ? entry.tags.map((t: string) => t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
            .filter(Boolean)
        : undefined;

      return { text, createdAt, updatedAt, tags, starred: !!entry.starred };
    })
    .filter(Boolean) as Array<{ text: string; createdAt: string; updatedAt: string; tags?: string[]; starred?: boolean }>;

  return { ...(await insertEntries(rows, timestamps)), source: "Day One" };
}

// ─── Markdown ─────────────────────────────────────────────────────────────────
// Handles two common patterns:
//   1. Single .md file split by `## <date-heading>` dividers (Day One / Bear export)
//   2. Single .md or .txt file treated as one entry (dated now)

const DATE_HEADING_RE = /^##\s+(.+)$/m;

// Attempt to parse a heading string as a date.
// Handles: "2023-01-15", "January 15, 2023", "Tuesday, January 15, 2023 at 10:30 AM", etc.
function parseHeadingDate(heading: string): Date | null {
  // ISO date YYYY-MM-DD
  const iso = heading.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) {
    const d = new Date(iso[1] + "T12:00:00");
    if (!isNaN(d.getTime())) return d;
  }
  // Try native Date parse (handles "January 15, 2023", "Tue, 15 Jan 2023", etc.)
  const d = new Date(heading.replace(/\bat\b/i, ""));
  if (!isNaN(d.getTime())) return d;
  return null;
}

export async function importMarkdown(file: File): Promise<ImportResult> {
  const raw = await file.text();
  const timestamps = await getExistingTimestamps();

  // Split on `## heading` lines
  const parts = raw.split(/^(?=##\s)/m).filter((s) => s.trim());

  // If the file has multiple sections starting with `## <date>`, parse each as an entry
  const rows: Array<{ text: string; createdAt: string; updatedAt: string }> = [];

  for (const part of parts) {
    const headingMatch = part.match(/^##\s+(.+)\n/);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      const date = parseHeadingDate(heading);
      const body = part.replace(/^##\s+.+\n/, "").replace(/^---\s*$/m, "").trim();
      const createdAt = date ? date.toISOString() : new Date().toISOString();
      if (body) rows.push({ text: body, createdAt, updatedAt: createdAt });
    } else {
      // No date heading — treat whole file as single entry dated now
      const body = part.trim();
      if (body) rows.push({ text: body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
  }

  // Fallback: no ## headings at all — whole file is one entry
  if (rows.length === 0 && raw.trim()) {
    rows.push({ text: raw.trim(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  return { ...(await insertEntries(rows, timestamps)), source: "Markdown" };
}

// ─── Auto-detect dispatcher ───────────────────────────────────────────────────

export async function importFile(file: File): Promise<ImportResult> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "md" || ext === "txt") {
    return importMarkdown(file);
  }

  if (ext === "json") {
    const text = await file.text();
    const data = JSON.parse(text);
    // Day One exports have `metadata.version` and `entries` with `creationDate`
    const firstEntry = Array.isArray(data.entries) ? data.entries[0] : null;
    const isDayOne = firstEntry && "creationDate" in firstEntry;
    return isDayOne ? importDayOne(file) : importJSON(file);
  }

  throw new Error(`Unsupported file type ".${ext}". Use .json, .md, or .txt.`);
}
