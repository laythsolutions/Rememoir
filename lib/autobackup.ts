"use client";

import type { RememoirEntry } from "./types";
import { readMediaAsBase64 } from "./opfs";

const BACKUP_DB_NAME = "rememoir-backup-store";
const BACKUP_DB_VERSION = 1;
const STORE_NAME = "backup";
const HANDLE_KEY = "directory-handle";

// ─── IDB helpers (plain API — keeps Dexie schema untouched) ───────────────────

function openBackupDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB_NAME, BACKUP_DB_VERSION);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE_NAME); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function loadHandle(): Promise<FileSystemDirectoryHandle | null> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function deleteHandle(): Promise<void> {
  const db = await openBackupDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function isAutoBackupSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

/** Open the OS folder picker and persist the chosen handle. Returns folder name or null if cancelled. */
export async function pickBackupFolder(): Promise<string | null> {
  if (!isAutoBackupSupported()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle: FileSystemDirectoryHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
    await storeHandle(handle);
    return handle.name;
  } catch {
    return null; // user cancelled
  }
}

/** Returns the stored backup folder name, or null if none configured. */
export async function getBackupFolderName(): Promise<string | null> {
  try {
    const handle = await loadHandle();
    return handle?.name ?? null;
  } catch {
    return null;
  }
}

/** Remove the stored backup folder handle. */
export async function clearBackupFolder(): Promise<void> {
  await deleteHandle();
}

/** Write a dated JSON backup to the stored folder. Silent no-op if not configured. */
export async function performAutoBackup(entries: RememoirEntry[]): Promise<void> {
  try {
    const handle = await loadHandle();
    if (!handle) return;

    // requestPermission is not in standard TS types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const permission = await (handle as any).requestPermission({ mode: "readwrite" });
    if (permission !== "granted") return;

    const filename = `rememoir-backup-${new Date().toISOString().slice(0, 10)}.json`;

    // Serialise entries with base64 media (same format as manual JSON export)
    const active = entries.filter((e) => !e.deleted);
    const serialised = await Promise.all(
      active.map(async (e) => {
        let imageData: Array<{ mimeType: string; size: number; base64: string }> | undefined;
        if (e.images?.length) {
          const results = await Promise.all(
            e.images.map(async (img) => {
              try { return { mimeType: img.mimeType, size: img.size, base64: await readMediaAsBase64(img.path) }; }
              catch { return null; }
            })
          );
          const valid = results.filter(Boolean) as typeof imageData;
          if (valid?.length) imageData = valid;
        }
        let audioData: { mimeType: string; duration: number; size: number; base64: string } | undefined;
        if (e.audio) {
          try { audioData = { mimeType: e.audio.mimeType, duration: e.audio.duration, size: e.audio.size, base64: await readMediaAsBase64(e.audio.path) }; }
          catch { /* skip */ }
        }
        let videoData: { mimeType: string; duration: number; size: number; base64: string } | undefined;
        if (e.video) {
          try { videoData = { mimeType: e.video.mimeType, duration: e.video.duration, size: e.video.size, base64: await readMediaAsBase64(e.video.path) }; }
          catch { /* skip */ }
        }
        return { ...e, audio: audioData, video: videoData, images: imageData };
      })
    );

    const data = {
      exported_at: new Date().toISOString(),
      version: 2,
      entries: serialised,
    };

    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch {
    // Silently fail — auto-backup is best-effort
  }
}
