"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Video, Square, Trash2, FileText, CornerUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/TagInput";
import { RememoirPromptDisplay } from "@/components/RememoirPromptDisplay";
import { addEntry } from "@/lib/db";
import { getDailyPrompt } from "@/lib/prompts";
import { useEntryStore } from "@/store/entryStore";
import type { RememoirEntry } from "@/lib/types";
import { useRecording } from "@/hooks/useRecording";
import { formatDuration } from "@/lib/utils";

// ─── Transcript card ─────────────────────────────────────────────────────────

function TranscriptCard({
  transcript,
  onInsert,
}: {
  transcript: string;
  onInsert: () => void;
}) {
  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-muted/40">
      <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
          Transcript
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-4">
          {transcript}
        </p>
      </div>
      <button
        type="button"
        onClick={onInsert}
        title="Insert into entry"
        className="shrink-0 flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors pt-0.5 cursor-pointer"
      >
        <CornerUpLeft className="w-3.5 h-3.5" />
        Insert
      </button>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function RememoirEntryForm({ initialPrompt }: { initialPrompt?: string }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addEntryToFeed } = useEntryStore();

  // Use initialPrompt from URL if provided, otherwise fall back to daily prompt
  const dailyPrompt = getDailyPrompt();
  const prompt = initialPrompt
    ? { id: dailyPrompt.id, text: initialPrompt, category: dailyPrompt.category }
    : dailyPrompt;

  const {
    audioState,
    videoState,
    startAudio,
    stopAudio,
    clearAudio,
    startVideo,
    stopVideo,
    clearVideo,
    videoPreviewRef,
  } = useRecording();

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  const insertTranscript = useCallback(
    (transcript: string) => {
      setText((prev) => (prev ? `${prev}\n\n${transcript}` : transcript));
      setTimeout(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!text.trim() && !audioState.mediaRef && !videoState.mediaRef) {
      setError("Write something, or add a recording.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      const entryData: Omit<RememoirEntry, "id"> = {
        text: text.trim(),
        tags: tags.length > 0 ? tags : undefined,
        createdAt: now,
        updatedAt: now,
        promptId: showPrompt ? prompt.id : undefined,
        audio: audioState.mediaRef ?? undefined,
        video: videoState.mediaRef ?? undefined,
      };

      const id = await addEntry(entryData);
      addEntryToFeed({ ...entryData, id });
      router.push("/timeline");
    } catch (err) {
      setError("Failed to save entry. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [text, tags, audioState.mediaRef, videoState.mediaRef, showPrompt, prompt.id, addEntryToFeed, router]);

  return (
    <div className="flex flex-col gap-5">
      {/* Daily prompt */}
      {showPrompt && (
        <RememoirPromptDisplay
          prompt={prompt}
          onUse={(t) => setText((prev) => prev ? prev + "\n\n" + t : t)}
          onDismiss={() => setShowPrompt(false)}
        />
      )}

      {/* Writing area */}
      <div className="flex flex-col gap-1.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind today…"
          autoFocus
          className="writing-area w-full min-h-[calc(100svh-380px)] px-5 py-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/40 resize-none transition-all duration-200 shadow-sm"
        />
        <div className="flex justify-end px-1">
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">
            {wordCount === 0 ? "" :
             wordCount >= 300 ? `${wordCount} words · great entry` :
             wordCount >= 100 ? `${wordCount} words · keep going` :
             `${wordCount} word${wordCount !== 1 ? "s" : ""}`}
          </span>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
          Tags
        </label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      {/* Media controls */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-0.5">
          Record
        </p>
        <div className="flex flex-wrap gap-2.5">
          {/* Audio */}
          {!audioState.mediaRef ? (
            <Button
              type="button"
              variant={audioState.isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={audioState.isRecording ? stopAudio : startAudio}
              disabled={!audioState.isSupported || videoState.isRecording}
              className="gap-2 h-9 rounded-xl cursor-pointer"
            >
              {audioState.isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop ({formatDuration(audioState.elapsed)})
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5" />
                  Audio
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40">
              <audio src={audioState.blobUrl!} controls className="h-8 max-w-[180px]" />
              <button
                type="button"
                onClick={clearAudio}
                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                aria-label="Remove audio"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Video */}
          {!videoState.mediaRef ? (
            <Button
              type="button"
              variant={videoState.isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={videoState.isRecording ? stopVideo : startVideo}
              disabled={!videoState.isSupported || audioState.isRecording}
              className="gap-2 h-9 rounded-xl cursor-pointer"
            >
              {videoState.isRecording ? (
                <>
                  <Square className="w-3.5 h-3.5" />
                  Stop ({formatDuration(videoState.elapsed)})
                </>
              ) : (
                <>
                  <Video className="w-3.5 h-3.5" />
                  Video
                </>
              )}
            </Button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40">
              <video src={videoState.blobUrl!} controls className="h-14 rounded-lg" />
              <button
                type="button"
                onClick={clearVideo}
                className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                aria-label="Remove video"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video preview — always in DOM to avoid display:none playback block */}
      <video
        ref={videoPreviewRef}
        autoPlay
        muted
        playsInline
        style={
          videoState.isRecording
            ? {}
            : { visibility: "hidden", height: 0, width: 0, overflow: "hidden", padding: 0, border: "none" }
        }
        className="w-full max-w-sm rounded-2xl border border-border"
      />

      {/* Live transcripts */}
      {audioState.isRecording && audioState.transcript && (
        <p className="text-xs text-muted-foreground/60 italic leading-relaxed line-clamp-2 -mt-2">
          &ldquo;{audioState.transcript}&rdquo;
        </p>
      )}
      {videoState.isRecording && videoState.transcript && (
        <p className="text-xs text-muted-foreground/60 italic leading-relaxed line-clamp-2 -mt-2">
          &ldquo;{videoState.transcript}&rdquo;
        </p>
      )}

      {/* Transcript cards */}
      {!audioState.isRecording && audioState.mediaRef && audioState.transcript && (
        <TranscriptCard
          transcript={audioState.transcript}
          onInsert={() => insertTranscript(audioState.transcript)}
        />
      )}
      {!videoState.isRecording && videoState.mediaRef && videoState.transcript && (
        <TranscriptCard
          transcript={videoState.transcript}
          onInsert={() => insertTranscript(videoState.transcript)}
        />
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive px-1">{error}</p>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || audioState.isRecording || videoState.isRecording}
        className="w-full h-12 rounded-2xl text-[15px] font-semibold shadow-md shadow-primary/20 cursor-pointer"
        size="lg"
      >
        {isSubmitting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
        ) : (
          "Save entry"
        )}
      </Button>
    </div>
  );
}
