"use client";

/**
 * OPFS (Origin Private File System) media storage.
 * Stores audio/video files in the browser's private file system
 * instead of IndexedDB blobs — much more reliable for large files.
 */

const MEDIA_DIR = "rememoir-media";

async function getMediaDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(MEDIA_DIR, { create: true });
}

/** Save a Blob to OPFS, return the file path */
export async function saveMediaFile(
  blob: Blob,
  filename: string
): Promise<string> {
  const dir = await getMediaDir();
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return `${MEDIA_DIR}/${filename}`;
}

/** Read a file from OPFS as a Blob URL */
export async function getMediaBlobUrl(path: string): Promise<string> {
  const [, filename] = path.split("/");
  const dir = await getMediaDir();
  const fileHandle = await dir.getFileHandle(filename);
  const file = await fileHandle.getFile();
  return URL.createObjectURL(file);
}

/** Read a file from OPFS and return it as a base64-encoded string */
export async function readMediaAsBase64(path: string): Promise<string> {
  const [, filename] = path.split("/");
  const dir = await getMediaDir();
  const fileHandle = await dir.getFileHandle(filename);
  const file = await fileHandle.getFile();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // Process in 8 KB chunks to avoid stack overflow on large files
  const chunkSize = 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    parts.push(String.fromCharCode(...bytes.subarray(i, i + chunkSize)));
  }
  return btoa(parts.join(""));
}

/** Delete a file from OPFS */
export async function deleteMediaFile(path: string): Promise<void> {
  try {
    const [, filename] = path.split("/");
    const dir = await getMediaDir();
    await dir.removeEntry(filename);
  } catch {
    // File may already be gone
  }
}

/** Check if OPFS is available in this browser */
export function isOPFSSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "storage" in navigator &&
    "getDirectory" in navigator.storage
  );
}
