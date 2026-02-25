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
