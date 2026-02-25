"use client";

export function isTranscriptionSupported(): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return typeof (w.SpeechRecognition ?? w.webkitSpeechRecognition) === "function";
}

export interface TranscriptionSession {
  stop: () => void;
}

/**
 * Starts a Web Speech API transcription session.
 * Calls onUpdate with the accumulated transcript (final + current interim segment).
 * Automatically restarts after browser-imposed silence timeouts so it keeps
 * running for the full duration of a recording.
 *
 * Returns null if the API is unavailable.
 */
export function startTranscription(opts: {
  onUpdate: (text: string) => void;
}): TranscriptionSession | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!SR) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognition: any = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = navigator.language || "en-US";
  recognition.maxAlternatives = 1;

  let finalText = "";
  let active = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recognition.onresult = (event: any) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        const segment = result[0].transcript.trim();
        if (segment) {
          finalText += (finalText ? " " : "") + segment;
        }
      } else {
        interim += result[0].transcript;
      }
    }
    const display = interim
      ? `${finalText}${finalText ? " " : ""}${interim.trim()}`
      : finalText;
    opts.onUpdate(display);
  };

  // Browsers stop recognition after silence (~10s) or max duration (~1min).
  // Restart automatically so it runs for the full recording.
  recognition.onend = () => {
    if (active) {
      try {
        recognition.start();
      } catch {
        // Already started or permission revoked — ignore
      }
    }
  };

  recognition.onerror = () => {
    // Silently ignore errors (permission denied will just mean no transcript)
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    stop: () => {
      active = false;
      try {
        recognition.stop();
      } catch {
        // Already stopped
      }
    },
  };
}
