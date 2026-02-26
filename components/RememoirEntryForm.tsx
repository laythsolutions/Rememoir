"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Video, Square, Trash2, FileText, CornerUpLeft, ImagePlus, X, Tag, Sparkles, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TagInput } from "@/components/TagInput";
import { RememoirPromptDisplay } from "@/components/RememoirPromptDisplay";
import { addEntry, updateEntryAI } from "@/lib/db";
import { getDailyPrompt } from "@/lib/prompts";
import { useEntryStore } from "@/store/entryStore";
import type { RememoirEntry, ImageRef } from "@/lib/types";
import { useRecording } from "@/hooks/useRecording";
import { formatDuration } from "@/lib/utils";
import { saveMediaFile } from "@/lib/opfs";
import { compressImage } from "@/lib/imageUtils";
import { analyzeEntry, generateSmartPrompt, isAIEnabled } from "@/lib/ai";
import { getAllEntries } from "@/lib/db";
import { toast } from "sonner";
import { TemplateSheet } from "@/components/TemplateSheet";
import { performAutoBackup } from "@/lib/autobackup";

// ─── Side toolbar button ──────────────────────────────────────────────────────

function SideButton({
  icon,
  label,
  onClick,
  active = false,
  badge = 0,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  badge?: number;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
      }`}
    >
      {icon}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-0.5">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

// ─── Transcript card ──────────────────────────────────────────────────────────

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

const DRAFT_KEY = "rememoir_entry_draft";

interface DraftData {
  text: string;
  tags: string[];
}

export function RememoirEntryForm({ initialPrompt }: { initialPrompt?: string }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [showTagPanel, setShowTagPanel] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // AI features
  const [aiEnabled] = useState(() => isAIEnabled());
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isPersonalisingPrompt, setIsPersonalisingPrompt] = useState(false);
  const [customPromptText, setCustomPromptText] = useState<string | null>(null);

  const { addEntryToFeed } = useEntryStore();

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved: DraftData = JSON.parse(raw);
        if (saved.text?.trim()) {
          setText(saved.text);
          setTags(saved.tags ?? []);
          toast.info("Draft restored — pick up where you left off.");
        }
      }
    } catch {
      // ignore corrupt draft
    }
  }, []);

  // Auto-save draft on text/tag changes
  const saveDraft = useCallback((t: string, tg: string[]) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (t.trim()) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ text: t, tags: tg }));
      } else {
        localStorage.removeItem(DRAFT_KEY);
      }
    }, 800);
  }, []);

  const handleTextChange = useCallback((val: string) => {
    setText(val);
    saveDraft(val, tags);
  }, [tags, saveDraft]);

  const handleTagsChange = useCallback((tg: string[]) => {
    setTags(tg);
    saveDraft(text, tg);
  }, [text, saveDraft]);

  // Use initialPrompt from URL if provided, custom AI prompt, or fall back to daily prompt
  const dailyPrompt = getDailyPrompt();
  const prompt = customPromptText
    ? { id: dailyPrompt.id, text: customPromptText, category: dailyPrompt.category }
    : initialPrompt
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

  // Auto-grow textarea beyond its initial height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const handleImageFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const rawFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const compressed = await Promise.all(rawFiles.map((f) => compressImage(f)));
    const newUrls = compressed.map((f) => URL.createObjectURL(f));
    setImageFiles((prev) => [...prev, ...compressed]);
    setImagePreviewUrls((prev) => [...prev, ...newUrls]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setImagePreviewUrls((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Revoke preview URLs on unmount
  useEffect(() => {
    return () => { imagePreviewUrls.forEach((u) => URL.revokeObjectURL(u)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!text.trim() && !audioState.mediaRef && !videoState.mediaRef && imageFiles.length === 0) {
      setError("Write something, or add a recording or photo.");
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();

      let images: ImageRef[] | undefined;
      if (imageFiles.length > 0) {
        images = await Promise.all(
          imageFiles.map(async (file) => {
            const ext = file.name.split(".").pop() ?? "jpg";
            const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
            const path = await saveMediaFile(file, filename);
            return { path, mimeType: file.type, size: file.size };
          })
        );
      }

      const entryData: Omit<RememoirEntry, "id"> = {
        text: text.trim(),
        tags: tags.length > 0 ? tags : undefined,
        createdAt: now,
        updatedAt: now,
        promptId: showPrompt ? prompt.id : undefined,
        audio: audioState.mediaRef ?? undefined,
        video: videoState.mediaRef ?? undefined,
        images,
      };

      const id = await addEntry(entryData);
      addEntryToFeed({ ...entryData, id });
      localStorage.removeItem(DRAFT_KEY);

      // Fire-and-forget auto-backup
      getAllEntries().then((all) => performAutoBackup(all));

      // Fire-and-forget AI analysis
      if (aiEnabled && text.trim().split(/\s+/).length >= 10) {
        analyzeEntry(text.trim(), tags).then((insight) => {
          if (insight) updateEntryAI(id, insight).catch(() => {});
        });
      }

      router.push("/timeline");
    } catch (err) {
      setError("Failed to save entry. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }, [text, tags, audioState.mediaRef, videoState.mediaRef, imageFiles, showPrompt, prompt.id, addEntryToFeed, router]);

  const handleSuggestTags = useCallback(async () => {
    setIsSuggestingTags(true);
    try {
      const insight = await analyzeEntry(text.trim(), tags);
      const newTags = insight?.suggestedTags.filter((t) => !tags.includes(t)) ?? [];
      if (newTags.length) {
        setSuggestedTags(newTags);
      } else {
        toast.info("No new tag suggestions for this entry.");
      }
    } finally {
      setIsSuggestingTags(false);
    }
  }, [text, tags]);

  const handlePersonalisePrompt = useCallback(async () => {
    setIsPersonalisingPrompt(true);
    try {
      const recent = await getAllEntries();
      const entries = recent.slice(0, 5).map((e) => ({ text: e.text, createdAt: e.createdAt }));
      if (entries.length < 1) return;
      const p = await generateSmartPrompt(entries);
      if (p) setCustomPromptText(p);
    } finally {
      setIsPersonalisingPrompt(false);
    }
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {showTemplates && (
        <TemplateSheet
          onSelect={(content) => { setText(content); saveDraft(content, tags); }}
          onClose={() => setShowTemplates(false)}
        />
      )}
      {/* Daily prompt */}
      {showPrompt && (
        <div className="flex flex-col gap-1.5">
          <RememoirPromptDisplay
            prompt={prompt}
            onUse={(t) => { const val = text ? text + "\n\n" + t : t; setText(val); saveDraft(val, tags); }}
            onDismiss={() => setShowPrompt(false)}
          />
          {aiEnabled && (
            <button
              type="button"
              onClick={handlePersonalisePrompt}
              disabled={isPersonalisingPrompt}
              className="self-start flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed px-0.5"
            >
              {isPersonalisingPrompt
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Personalising…</>
                : <><Sparkles className="w-3 h-3" /> Personalise prompt</>}
            </button>
          )}
        </div>
      )}

      {/* Main writing row: large textarea + vertical side toolbar */}
      <div className="flex gap-2 items-start">
        {/* Textarea */}
        <div className="flex-1 flex flex-col gap-1.5">
          <label htmlFor="entry-text" className="sr-only">Journal entry</label>
          <textarea
            id="entry-text"
            ref={textareaRef}
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="What's on your mind today…"
            autoFocus
            className="writing-area w-full min-h-[calc(100svh-320px)] px-5 py-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/40 resize-none transition-all duration-200 shadow-sm overflow-hidden"
          />
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] text-muted-foreground/40">
              {!isSubmitting && "⌘↵ to save"}
            </span>
            <span className="text-[11px] text-muted-foreground/60 tabular-nums">
              {wordCount === 0 ? "" :
               wordCount >= 300 ? `${wordCount} words · great entry` :
               wordCount >= 100 ? `${wordCount} words · keep going` :
               `${wordCount} word${wordCount !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* Vertical side toolbar */}
        <div className="flex flex-col gap-1.5 shrink-0 pt-0.5">
          <SideButton
            icon={<LayoutTemplate className="w-4 h-4" />}
            label="Templates"
            onClick={() => setShowTemplates(true)}
          />
          <SideButton
            icon={<Tag className="w-4 h-4" />}
            label="Tags"
            onClick={() => setShowTagPanel((p) => !p)}
            active={showTagPanel}
            badge={tags.length}
          />
          <SideButton
            icon={audioState.isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            label={audioState.isRecording ? `Stop (${formatDuration(audioState.elapsed)})` : "Audio"}
            onClick={audioState.isRecording ? stopAudio : startAudio}
            active={audioState.isRecording || !!audioState.mediaRef}
            disabled={!audioState.isSupported || videoState.isRecording}
          />
          <SideButton
            icon={videoState.isRecording ? <Square className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            label={videoState.isRecording ? `Stop (${formatDuration(videoState.elapsed)})` : "Video"}
            onClick={videoState.isRecording ? stopVideo : startVideo}
            active={videoState.isRecording || !!videoState.mediaRef}
            disabled={!videoState.isSupported || audioState.isRecording}
          />
          <SideButton
            icon={<ImagePlus className="w-4 h-4" />}
            label="Photo"
            onClick={() => imageInputRef.current?.click()}
            badge={imageFiles.length}
            disabled={audioState.isRecording || videoState.isRecording}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleImageFiles(e.target.files)}
      />

      {/* Tag panel — slides in below when toggled */}
      {showTagPanel && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between px-0.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Tags
            </label>
            {aiEnabled && wordCount >= 30 && (
              <button
                type="button"
                onClick={handleSuggestTags}
                disabled={isSuggestingTags}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSuggestingTags
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> Suggesting…</>
                  : <><Sparkles className="w-3 h-3" /> Suggest</>}
              </button>
            )}
          </div>
          <TagInput value={tags} onChange={handleTagsChange} />
          {suggestedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <span className="text-[10px] text-muted-foreground/60 self-center">Add:</span>
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    const next = [...tags, tag];
                    handleTagsChange(next);
                    setSuggestedTags((prev) => prev.filter((t) => t !== tag));
                  }}
                  className="text-[11px] px-2 py-0.5 rounded-full border border-primary/30 bg-primary/8 text-primary font-medium hover:bg-primary/15 transition-colors cursor-pointer"
                >
                  +{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audio player (after recording done) */}
      {audioState.mediaRef && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40">
          <audio src={audioState.blobUrl!} controls className="h-8 flex-1 min-w-0" />
          <button
            type="button"
            onClick={clearAudio}
            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
            aria-label="Remove audio"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Video player (after recording done) */}
      {videoState.mediaRef && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-muted/40">
          <video src={videoState.blobUrl!} controls className="h-14 rounded-lg flex-1 min-w-0" />
          <button
            type="button"
            onClick={clearVideo}
            className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
            aria-label="Remove video"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
        <p className="text-xs text-muted-foreground/60 italic leading-relaxed line-clamp-2">
          &ldquo;{audioState.transcript}&rdquo;
        </p>
      )}
      {videoState.isRecording && videoState.transcript && (
        <p className="text-xs text-muted-foreground/60 italic leading-relaxed line-clamp-2">
          &ldquo;{videoState.transcript}&rdquo;
        </p>
      )}

      {/* Image previews */}
      {imagePreviewUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {imagePreviewUrls.map((url, i) => (
            <div key={url} className="relative aspect-square rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                aria-label="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
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
          "Keep this"
        )}
      </Button>
    </div>
  );
}
