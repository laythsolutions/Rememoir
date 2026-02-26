"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Trash2, ChevronDown, ChevronUp, Mic, Video, Pencil, Check, X, Loader2, ImageIcon, ImagePlus, Star, Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { deleteEntry, updateEntry, toggleStarEntry, updateEntryAI } from "@/lib/db";
import { getMediaBlobUrl, saveMediaFile, deleteMediaFile } from "@/lib/opfs";
import { compressImage } from "@/lib/imageUtils";
import { formatDayOfWeek, formatDateLong, formatTime } from "@/lib/utils";
import { useEntryStore } from "@/store/entryStore";
import type { RememoirEntry, ImageRef } from "@/lib/types";
import { MarkdownText } from "@/components/MarkdownText";

interface RememoirTimelineEntryProps {
  entry: RememoirEntry;
  highlightQuery?: string;
  index?: number;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    )
  );
}

export function RememoirTimelineEntry({ entry, highlightQuery, index = 0 }: RememoirTimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [imageBlobUrls, setImageBlobUrls] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isStarred, setIsStarred] = useState(!!entry.starred);
  const [showSentimentPicker, setShowSentimentPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const [editTags, setEditTags] = useState<string[]>(entry.tags ?? []);
  const [isSaving, setIsSaving] = useState(false);
  // Image editing
  const [editImages, setEditImages] = useState<ImageRef[]>(entry.images ?? []);
  const [editImageBlobUrls, setEditImageBlobUrls] = useState<string[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviewUrls, setNewImagePreviewUrls] = useState<string[]>([]);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  const { removeEntry, updateEntryInStore } = useEntryStore();
  const isLong = entry.text.length > 220;

  useEffect(() => {
    if (!expanded) return;
    if (entry.audio && !audioBlobUrl) {
      getMediaBlobUrl(entry.audio.path).then(setAudioBlobUrl).catch(() => {});
    }
    if (entry.video && !videoBlobUrl) {
      getMediaBlobUrl(entry.video.path).then(setVideoBlobUrl).catch(() => {});
    }
  }, [expanded, entry.audio, entry.video, audioBlobUrl, videoBlobUrl]);

  // Load image blob URLs eagerly (images are shown in collapsed state too)
  useEffect(() => {
    if (!entry.images?.length) return;
    let cancelled = false;
    Promise.all(entry.images.map((img) => getMediaBlobUrl(img.path)))
      .then((urls) => { if (!cancelled) setImageBlobUrls(urls); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [entry.images]);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
      imageBlobUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlobUrl, videoBlobUrl]);

  const closeLightbox = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setLightboxUrl(null);
  }, []);

  const enterEditMode = useCallback(() => {
    setEditImages(entry.images ?? []);
    setRemovedPaths([]);
    setNewImageFiles([]);
    setNewImagePreviewUrls([]);
    // Reuse already-loaded imageBlobUrls for existing images
    setEditImageBlobUrls([...imageBlobUrls]);
    setIsEditing(true);
  }, [entry.images, imageBlobUrls]);

  const handleEditAddImages = useCallback(async (files: FileList | null) => {
    if (!files) return;
    const rawFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const compressed = await Promise.all(rawFiles.map((f) => compressImage(f)));
    const newUrls = compressed.map((f) => URL.createObjectURL(f));
    setNewImageFiles((prev) => [...prev, ...compressed]);
    setNewImagePreviewUrls((prev) => [...prev, ...newUrls]);
  }, []);

  const handleEditRemoveExisting = useCallback((index: number) => {
    setRemovedPaths((prev) => [...prev, editImages[index].path]);
    setEditImages((prev) => prev.filter((_, i) => i !== index));
    setEditImageBlobUrls((prev) => prev.filter((_, i) => i !== index));
  }, [editImages]);

  const handleEditRemoveNew = useCallback((index: number) => {
    URL.revokeObjectURL(newImagePreviewUrls[index]);
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }, [newImagePreviewUrls]);

  const handleDelete = async () => {
    if (!entry.id) return;
    setIsDeleting(true);
    setDeleteConfirm(false);
    try {
      await deleteEntry(entry.id);
      removeEntry(entry.id);
    } catch {
      setIsDeleting(false);
    }
  };

  const handleOverrideSentiment = async (sentiment: "positive" | "reflective" | "neutral" | "challenging") => {
    if (!entry.id || !entry.aiInsight) return;
    setShowSentimentPicker(false);
    const updated = { ...entry.aiInsight, sentiment };
    await updateEntryAI(entry.id, updated);
    updateEntryInStore(entry.id, { aiInsight: updated });
  };

  const handleToggleStar = async () => {
    if (!entry.id) return;
    await toggleStarEntry(entry.id, isStarred);
    setIsStarred((v) => !v);
    updateEntryInStore(entry.id, { starred: !isStarred });
  };

  const handleShare = async () => {
    const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const tagLine = entry.tags?.length ? `\n${entry.tags.map((t) => `#${t}`).join(" ")}` : "";
    const shareText = `${date}\n\n${entry.text}${tagLine}`;

    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch { /* fall through to clipboard */ }
    }
    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const handleSaveEdit = async () => {
    if (!entry.id) return;
    setIsSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const tags = editTags.length > 0 ? editTags : undefined;

      // Delete removed images from OPFS
      await Promise.all(removedPaths.map((p) => deleteMediaFile(p)));

      // Save new images to OPFS
      const savedNew: ImageRef[] = await Promise.all(
        newImageFiles.map(async (file) => {
          const ext = file.name.split(".").pop() ?? "jpg";
          const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const path = await saveMediaFile(file, filename);
          return { path, mimeType: file.type, size: file.size };
        })
      );

      const images = [...editImages, ...savedNew];
      const finalImages = images.length > 0 ? images : undefined;

      await updateEntry(entry.id, { text: editText, tags, images: finalImages });
      updateEntryInStore(entry.id, { text: editText, tags, images: finalImages, updatedAt });

      // Revoke new preview URLs
      newImagePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
      setIsEditing(false);
    } catch {
      // keep editing
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(entry.text);
    setEditTags(entry.tags ?? []);
    newImagePreviewUrls.forEach((u) => URL.revokeObjectURL(u));
    setIsEditing(false);
  };

  // If entry has an AI summary and is not expanded, show it instead of raw truncation
  const previewText =
    !expanded && !highlightQuery && entry.aiInsight?.summary
      ? null // will render AI summary inline
      : isLong && !expanded
      ? entry.text.slice(0, 220).trim() + "…"
      : entry.text;

  const staggerDelay = Math.min(index * 40, 200);

  // ── Edit mode ────────────────────────────────────────────────────────────────

  if (isEditing) {
    const allEditUrls = [...editImageBlobUrls, ...newImagePreviewUrls];
    return (
      <div className="rounded-2xl border border-primary/30 border-l-[3px] border-l-primary/60 bg-card shadow-sm p-4 flex flex-col gap-3">
        <Textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="min-h-[120px] resize-none text-[14px] leading-relaxed rounded-xl border-border/80"
          autoFocus
        />
        <TagInput value={editTags} onChange={setEditTags} />

        {/* Image edit area */}
        {allEditUrls.length > 0 && (
          <div className={`grid gap-1.5 ${allEditUrls.length === 1 ? "grid-cols-1" : allEditUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {editImageBlobUrls.map((url, i) => (
              <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleEditRemoveExisting(i)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  aria-label="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {newImagePreviewUrls.map((url, i) => (
              <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden border border-primary/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleEditRemoveNew(i)}
                  className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                  aria-label="Remove photo"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="gap-1.5 rounded-xl h-8 cursor-pointer">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1.5 rounded-xl h-8 cursor-pointer">
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <input
            ref={editImageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleEditAddImages(e.target.files)}
          />
          <Button
            size="sm"
            variant="outline"
            type="button"
            onClick={() => editImageInputRef.current?.click()}
            disabled={isSaving}
            className="gap-1.5 rounded-xl h-8 cursor-pointer ml-auto"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Photo
          </Button>
        </div>
      </div>
    );
  }

  // ── Display mode ─────────────────────────────────────────────────────────────

  return (
    <div
      className={`animate-page-in rounded-2xl border border-border border-l-[3px] border-l-primary/25 bg-card shadow-sm transition-all duration-200 overflow-hidden ${isDeleting ? "opacity-40 pointer-events-none scale-[0.98]" : ""}`}
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0">
            <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest leading-none mb-0.5">
              {formatDayOfWeek(entry.createdAt)}
            </span>
            <span className="font-serif text-[15px] font-semibold text-foreground leading-snug">
              {formatDateLong(entry.createdAt)}
            </span>
            <span className="text-[11px] text-muted-foreground/60 mt-0.5">
              {formatTime(entry.createdAt)}
            </span>
          </div>

          <div className="flex items-center gap-0.5 -mr-1 shrink-0">
            {entry.aiInsight && (() => {
              const intensity = entry.aiInsight.intensity ?? 3;
              const isHigh = intensity >= 4;
              const s = entry.aiInsight.sentiment;
              const pillClass = `text-[10px] font-semibold px-2 py-0.5 rounded-full mr-0.5 transition-all cursor-pointer select-none ${
                s === "positive"
                  ? isHigh ? "bg-green-500/20 text-green-700 dark:text-green-400 ring-1 ring-green-400/30" : "bg-green-500/12 text-green-700 dark:text-green-400"
                  : s === "challenging"
                  ? isHigh ? "bg-rose-500/20 text-rose-700 dark:text-rose-400 ring-1 ring-rose-400/30" : "bg-rose-500/12 text-rose-700 dark:text-rose-400"
                  : s === "reflective"
                  ? isHigh ? "bg-primary/18 text-primary ring-1 ring-primary/20" : "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`;
              return (
                <div className="relative">
                  <button
                    onClick={() => setShowSentimentPicker((v) => !v)}
                    className={pillClass}
                    title="Tap to correct sentiment"
                  >
                    {s}
                    {isHigh && <span className="ml-0.5 opacity-60">{"●".repeat(Math.min(intensity - 3, 2))}</span>}
                  </button>
                  {showSentimentPicker && (
                    <>
                      {/* Invisible backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSentimentPicker(false)}
                      />
                      <div className="absolute top-full right-0 mt-1 z-20 flex flex-col gap-0.5 p-1.5 rounded-xl border border-border bg-popover shadow-lg min-w-[110px]">
                        {(["positive", "reflective", "neutral", "challenging"] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleOverrideSentiment(opt)}
                            className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                              opt === s ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground/80"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            {entry.images && entry.images.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5 rounded-md h-auto">
                <ImageIcon className="w-2.5 h-2.5" />
                {entry.images.length}
              </Badge>
            )}
            {entry.audio && (
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5 rounded-md h-auto">
                <Mic className="w-2.5 h-2.5" />
                Audio
              </Badge>
            )}
            {entry.video && (
              <Badge variant="secondary" className="gap-1 text-[10px] px-1.5 py-0.5 rounded-md h-auto">
                <Video className="w-2.5 h-2.5" />
                Video
              </Badge>
            )}
            <button
              onClick={handleToggleStar}
              aria-label={isStarred ? "Unstar entry" : "Star entry"}
              className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                isStarred
                  ? "text-amber-500 hover:text-amber-400"
                  : "text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/8"
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleShare}
              aria-label={copied ? "Copied!" : "Share or copy entry"}
              className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                copied
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={enterEditMode}
              aria-label="Edit entry"
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Inline two-step delete confirm */}
            {deleteConfirm ? (
              <div className="flex items-center gap-1.5 ml-1">
                <span className="text-[11px] text-muted-foreground">Delete?</span>
                <button
                  onClick={handleDelete}
                  className="text-[11px] font-semibold text-destructive hover:underline transition-colors cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                aria-label="Delete entry"
                disabled={isDeleting}
                className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/8 transition-all duration-150 cursor-pointer disabled:pointer-events-none"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Text */}
        {entry.text && (
          <>
            {previewText === null ? (
              // AI summary view (collapsed, no search query)
              <p className="text-[13px] leading-[1.65] text-muted-foreground italic">
                <span className="text-[10px] font-semibold not-italic mr-1 opacity-60">✦</span>
                {entry.aiInsight!.summary}
              </p>
            ) : (
              <p className="text-[14px] leading-[1.7] text-foreground/85 whitespace-pre-wrap">
                {highlightQuery
                  ? highlightText(previewText, highlightQuery)
                  : <MarkdownText text={previewText} />}
              </p>
            )}
          </>
        )}

        {/* Image thumbnails */}
        {imageBlobUrls.length > 0 && (
          <div className={`grid gap-1.5 ${imageBlobUrls.length === 1 ? "grid-cols-1" : imageBlobUrls.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {imageBlobUrls.slice(0, 4).map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightboxUrl(url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                {i === 3 && imageBlobUrls.length > 4 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">+{imageBlobUrls.length - 4}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/8 text-primary font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Expand / collapse */}
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors self-start font-medium cursor-pointer"
          >
            {expanded ? (
              <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
            )}
          </button>
        )}

        {/* Media */}
        {expanded && (
          <div className="flex flex-col gap-2 pt-1">
            {entry.audio && audioBlobUrl && (
              <audio src={audioBlobUrl} controls className="w-full h-10" />
            )}
            {entry.video && videoBlobUrl && (
              <video src={videoBlobUrl} controls playsInline className="w-full rounded-xl max-h-64" />
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Full size photo"
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
          />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>
      )}
    </div>
  );
}
