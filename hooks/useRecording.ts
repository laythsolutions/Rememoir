"use client";

import { useState, useRef, useCallback } from "react";
import {
  startAudioRecording,
  startVideoRecording,
  isMediaRecorderSupported,
  getSupportedAudioMimeType,
  getSupportedVideoMimeType,
} from "@/lib/media";
import { saveMediaFile, isOPFSSupported } from "@/lib/opfs";
import { startTranscription, isTranscriptionSupported } from "@/lib/transcription";
import type { TranscriptionSession } from "@/lib/transcription";
import type { MediaRef } from "@/lib/types";

export interface RecordingState {
  isRecording: boolean;
  isSupported: boolean;
  elapsed: number;
  mediaRef: MediaRef | null;
  blobUrl: string | null;
  /** Live transcript — updates during recording, frozen when recording stops */
  transcript: string;
  /** Whether the browser supports the Web Speech API */
  transcriptSupported: boolean;
}

const initialState = (
  isSupported: boolean,
  transcriptSupported: boolean
): RecordingState => ({
  isRecording: false,
  isSupported,
  elapsed: 0,
  mediaRef: null,
  blobUrl: null,
  transcript: "",
  transcriptSupported,
});

export function useRecording() {
  const audioSupported =
    isMediaRecorderSupported() && getSupportedAudioMimeType() !== null;
  const videoSupported =
    isMediaRecorderSupported() && getSupportedVideoMimeType() !== null;
  const txSupported = isTranscriptionSupported();

  const [audioState, setAudioState] = useState<RecordingState>(
    initialState(audioSupported, txSupported)
  );
  const [videoState, setVideoState] = useState<RecordingState>(
    initialState(videoSupported, txSupported)
  );

  const audioSessionRef = useRef<{ stop: () => void } | null>(null);
  const videoSessionRef = useRef<{ stop: () => void } | null>(null);
  const audioTxRef = useRef<TranscriptionSession | null>(null);
  const videoTxRef = useRef<TranscriptionSession | null>(null);
  // Refs mirror transcript state so onStop closures read the latest value
  const audioTranscriptRef = useRef("");
  const videoTranscriptRef = useRef("");
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

  // ─── Audio ──────────────────────────────────────────────────────────────────

  const startAudio = useCallback(async () => {
    audioTranscriptRef.current = "";
    setAudioState((s) => ({ ...s, isRecording: true, elapsed: 0, transcript: "" }));

    // Start transcription in parallel with recording
    audioTxRef.current = startTranscription({
      onUpdate: (text) => {
        audioTranscriptRef.current = text;
        setAudioState((s) => ({ ...s, transcript: text }));
      },
    });

    const session = await startAudioRecording({
      onTick: (ms) => setAudioState((s) => ({ ...s, elapsed: ms })),
      onStop: async (blob, mimeType, durationMs) => {
        audioTxRef.current?.stop();
        audioTxRef.current = null;
        const finalTranscript = audioTranscriptRef.current;

        const filename = `audio-${Date.now()}.${mimeType.split("/")[1].split(";")[0]}`;
        let mediaRef: MediaRef | null = null;

        if (isOPFSSupported()) {
          try {
            const path = await saveMediaFile(blob, filename);
            mediaRef = { path, mimeType, duration: durationMs / 1000, size: blob.size };
          } catch {
            // OPFS denied — recording still playable via blobUrl this session
          }
        }

        const blobUrl = URL.createObjectURL(blob);
        setAudioState((s) => ({
          ...s,
          isRecording: false,
          mediaRef,
          blobUrl,
          transcript: finalTranscript,
        }));
      },
    });

    if (!session) {
      audioTxRef.current?.stop();
      audioTxRef.current = null;
      setAudioState((s) => ({ ...s, isRecording: false }));
      return;
    }
    audioSessionRef.current = session;
  }, []);

  const stopAudio = useCallback(() => {
    audioSessionRef.current?.stop();
    audioSessionRef.current = null;
  }, []);

  const clearAudio = useCallback(() => {
    audioTxRef.current?.stop();
    audioTxRef.current = null;
    audioTranscriptRef.current = "";
    if (audioState.blobUrl) URL.revokeObjectURL(audioState.blobUrl);
    setAudioState(initialState(audioSupported, txSupported));
  }, [audioState.blobUrl, audioSupported, txSupported]);

  // ─── Video ──────────────────────────────────────────────────────────────────

  const startVideo = useCallback(async () => {
    videoTranscriptRef.current = "";
    // Set isRecording:true first — React will re-render and mount the video
    // element before getUserMedia resolves (async permission dialog takes time)
    setVideoState((s) => ({ ...s, isRecording: true, elapsed: 0, transcript: "" }));

    videoTxRef.current = startTranscription({
      onUpdate: (text) => {
        videoTranscriptRef.current = text;
        setVideoState((s) => ({ ...s, transcript: text }));
      },
    });

    const session = await startVideoRecording({
      onTick: (ms) => setVideoState((s) => ({ ...s, elapsed: ms })),
      onStop: async (blob, mimeType, durationMs) => {
        // Clear preview stream
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }

        videoTxRef.current?.stop();
        videoTxRef.current = null;
        const finalTranscript = videoTranscriptRef.current;

        const filename = `video-${Date.now()}.${mimeType.split("/")[1].split(";")[0]}`;
        let mediaRef: MediaRef | null = null;

        if (isOPFSSupported()) {
          try {
            const path = await saveMediaFile(blob, filename);
            mediaRef = { path, mimeType, duration: durationMs / 1000, size: blob.size };
          } catch {
            // OPFS denied — recording still playable via blobUrl this session
          }
        }

        const blobUrl = URL.createObjectURL(blob);
        setVideoState((s) => ({
          ...s,
          isRecording: false,
          mediaRef,
          blobUrl,
          transcript: finalTranscript,
        }));
      },
    });

    if (!session) {
      videoTxRef.current?.stop();
      videoTxRef.current = null;
      setVideoState((s) => ({ ...s, isRecording: false }));
      return;
    }

    // Attach live stream to the preview element.
    // By this point getUserMedia has resolved, React has processed the
    // isRecording:true state update, and the video element is in the DOM.
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = session.stream;
      videoPreviewRef.current.play().catch(() => {});
    }

    videoSessionRef.current = session;
  }, []);

  const stopVideo = useCallback(() => {
    videoSessionRef.current?.stop();
    videoSessionRef.current = null;
  }, []);

  const clearVideo = useCallback(() => {
    videoTxRef.current?.stop();
    videoTxRef.current = null;
    videoTranscriptRef.current = "";
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    if (videoState.blobUrl) URL.revokeObjectURL(videoState.blobUrl);
    setVideoState(initialState(videoSupported, txSupported));
  }, [videoState.blobUrl, videoSupported, txSupported]);

  return {
    audioState,
    videoState,
    startAudio,
    stopAudio,
    clearAudio,
    startVideo,
    stopVideo,
    clearVideo,
    videoPreviewRef,
  };
}
