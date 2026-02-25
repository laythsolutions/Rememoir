"use client";

/**
 * Compress an image File using canvas.
 * Resizes to max 1920px on the longest side, converts to JPEG at 85% quality.
 * Falls back to the original file if canvas is unavailable or conversion fails.
 */
export async function compressImage(
  file: File,
  maxDim = 1920,
  quality = 0.85
): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const { naturalWidth: w, naturalHeight: h } = img;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const outName = file.name.replace(/\.[^.]+$/, ".jpg");
          resolve(new File([blob], outName, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
