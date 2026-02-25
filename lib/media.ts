"use client";

/** Max recording durations in milliseconds */
export const MAX_AUDIO_MS = 30_000;
export const MAX_VIDEO_MS = 60_000;

/**
 * Returns the best supported MIME type for audio recording.
 * iOS Safari only supports audio/mp4; Chrome/Firefox prefer audio/webm.
 */
export function getSupportedAudioMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

/**
 * Returns the best supported MIME type for video recording.
 */
export function getSupportedVideoMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

export function isMediaRecorderSupported(): boolean {
  return typeof MediaRecorder !== "undefined";
}

export interface RecordingSession {
  stop: () => void;
  onDataAvailable: (blob: Blob) => void;
}

/**
 * Start an audio recording session.
 * Calls onStop with the final Blob and duration when stopped or time limit reached.
 */
export async function startAudioRecording(opts: {
  onStop: (blob: Blob, mimeType: string, durationMs: number) => void;
  onTick?: (elapsedMs: number) => void;
}): Promise<{ stop: () => void } | null> {
  const mimeType = getSupportedAudioMimeType();
  if (!mimeType) return null;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return null;
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  const startTime = Date.now();

  let tickInterval: ReturnType<typeof setInterval> | null = null;
  if (opts.onTick) {
    tickInterval = setInterval(() => opts.onTick!(Date.now() - startTime), 500);
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const finish = () => {
    if (tickInterval) clearInterval(tickInterval);
    stream.getTracks().forEach((t) => t.stop());
  };

  recorder.onstop = () => {
    finish();
    const blob = new Blob(chunks, { type: mimeType });
    opts.onStop(blob, mimeType, Date.now() - startTime);
  };

  // Auto-stop at time limit
  const autoStop = setTimeout(() => recorder.stop(), MAX_AUDIO_MS);

  recorder.start(250);

  return {
    stop: () => {
      clearTimeout(autoStop);
      recorder.stop();
    },
  };
}

/**
 * Start a video recording session.
 * Returns the live MediaStream so the caller can attach it to a preview element
 * after React has rendered the video element (avoids display:none playback issues).
 */
export async function startVideoRecording(opts: {
  onStop: (blob: Blob, mimeType: string, durationMs: number) => void;
  onTick?: (elapsedMs: number) => void;
}): Promise<{ stop: () => void; stream: MediaStream } | null> {
  const mimeType = getSupportedVideoMimeType();
  if (!mimeType) return null;

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
  } catch {
    return null;
  }

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  const startTime = Date.now();

  let tickInterval: ReturnType<typeof setInterval> | null = null;
  if (opts.onTick) {
    tickInterval = setInterval(() => opts.onTick!(Date.now() - startTime), 500);
  }

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const finish = () => {
    if (tickInterval) clearInterval(tickInterval);
    stream.getTracks().forEach((t) => t.stop());
  };

  recorder.onstop = () => {
    finish();
    const blob = new Blob(chunks, { type: mimeType });
    opts.onStop(blob, mimeType, Date.now() - startTime);
  };

  const autoStop = setTimeout(() => recorder.stop(), MAX_VIDEO_MS);

  recorder.start(250);

  return {
    stop: () => {
      clearTimeout(autoStop);
      recorder.stop();
    },
    stream,
  };
}
