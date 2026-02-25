"use client";

import { addEntry, db } from "./db";

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

export async function importJSON(file: File): Promise<ImportResult> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || !Array.isArray(data.entries)) {
    throw new Error("Invalid export file: missing entries array.");
  }

  const existing = await db.entries.filter((e) => !e.deleted).toArray();
  const existingTimestamps = new Set(existing.map((e) => e.createdAt));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const entry of data.entries) {
    try {
      if (!entry.createdAt || entry.deleted) {
        skipped++;
        continue;
      }
      if (existingTimestamps.has(entry.createdAt)) {
        skipped++;
        continue;
      }
      await addEntry({
        text: entry.text ?? "",
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt ?? entry.createdAt,
        tags: Array.isArray(entry.tags) ? entry.tags : undefined,
        promptId: entry.promptId,
      });
      imported++;
    } catch {
      errors++;
    }
  }

  return { imported, skipped, errors };
}
