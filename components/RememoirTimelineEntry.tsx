"use client";

import { useState, useEffect } from "react";
import { Trash2, ChevronDown, ChevronUp, Mic, Video, Pencil, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/TagInput";
import { deleteEntry, updateEntry } from "@/lib/db";
import { getMediaBlobUrl } from "@/lib/opfs";
import { formatDate, formatTime } from "@/lib/utils";
import { useEntryStore } from "@/store/entryStore";
import type { RememoirEntry } from "@/lib/types";

interface RememoirTimelineEntryProps {
  entry: RememoirEntry;
  highlightQuery?: string;
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

export function RememoirTimelineEntry({ entry, highlightQuery }: RememoirTimelineEntryProps) {
  const [expanded, setExpanded] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const [editTags, setEditTags] = useState<string[]>(entry.tags ?? []);
  const [isSaving, setIsSaving] = useState(false);

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

  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    };
  }, [audioBlobUrl, videoBlobUrl]);

  const handleDelete = async () => {
    if (!entry.id || !confirm("Delete this entry? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteEntry(entry.id);
      removeEntry(entry.id);
    } catch {
      setIsDeleting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!entry.id) return;
    setIsSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      const tags = editTags.length > 0 ? editTags : undefined;
      await updateEntry(entry.id, { text: editText, tags });
      updateEntryInStore(entry.id, { text: editText, tags, updatedAt });
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
    setIsEditing(false);
  };

  const previewText = isLong && !expanded
    ? entry.text.slice(0, 220).trim() + "…"
    : entry.text;

  // ── Edit mode ────────────────────────────────────────────────────────────────

  if (isEditing) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-card shadow-sm p-4 flex flex-col gap-3">
        <Textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="min-h-[120px] resize-none text-[14px] leading-relaxed rounded-xl border-border/80"
          autoFocus
        />
        <TagInput value={editTags} onChange={setEditTags} />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="gap-1.5 rounded-xl h-8 cursor-pointer">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="gap-1.5 rounded-xl h-8 cursor-pointer">
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Display mode ─────────────────────────────────────────────────────────────

  return (
    <div className={`rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 overflow-hidden ${isDeleting ? "opacity-40 pointer-events-none scale-[0.98]" : ""}`}>
      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] font-semibold leading-tight">{formatDate(entry.createdAt)}</span>
            <span className="text-[11px] text-muted-foreground">{formatTime(entry.createdAt)}</span>
          </div>

          <div className="flex items-center gap-0.5 -mr-1 shrink-0">
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
              onClick={() => setIsEditing(true)}
              aria-label="Edit entry"
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Delete entry"
              disabled={isDeleting}
              className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/8 transition-all duration-150 cursor-pointer disabled:pointer-events-none"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Text */}
        {entry.text && (
          <p className="text-[14px] leading-[1.7] text-foreground/85 whitespace-pre-wrap">
            {highlightQuery ? highlightText(previewText, highlightQuery) : previewText}
          </p>
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
    </div>
  );
}
