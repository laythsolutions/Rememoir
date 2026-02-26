"use client";

import { useState, useEffect } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { getAllTags, removeTagFromAllEntries, renameTagInAllEntries } from "@/lib/db";
import { SettingsSection } from "./shared";

export function TagsSection() {
  const [tags, setTags] = useState<string[]>([]);
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null);

  useEffect(() => {
    getAllTags().then(setTags);
  }, []);

  const handleStartRename = (tag: string) => {
    setRenamingTag(tag);
    setRenameValue(tag);
    setDeleteConfirmTag(null);
  };

  const handleConfirmRename = async () => {
    if (!renamingTag) return;
    const trimmed = renameValue.trim().toLowerCase().replace(/\s+/g, "-");
    if (!trimmed || trimmed === renamingTag) { setRenamingTag(null); return; }
    await renameTagInAllEntries(renamingTag, trimmed);
    setTags((prev) => prev.map((t) => (t === renamingTag ? trimmed : t)).sort());
    setRenamingTag(null);
  };

  const handleDelete = async (tag: string) => {
    await removeTagFromAllEntries(tag);
    setTags((prev) => prev.filter((t) => t !== tag));
    setDeleteConfirmTag(null);
  };

  if (tags.length === 0) return null;

  return (
    <SettingsSection title="Tags">
      <div className="flex flex-col divide-y divide-border/60">
        {tags.map((tag) => (
          <div key={tag} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
            {renamingTag === tag ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRename();
                    if (e.key === "Escape") setRenamingTag(null);
                  }}
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-primary/40 bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
                <button
                  onClick={handleConfirmRename}
                  className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingTag(null)}
                  className="p-0.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label="Cancel rename"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : deleteConfirmTag === tag ? (
              <div className="flex-1 flex items-center justify-between">
                <span className="text-[13px] text-destructive">Remove #{tag} from all entries?</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleDelete(tag)}
                    className="text-[12px] font-semibold text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => setDeleteConfirmTag(null)}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-[13px] font-medium text-foreground/80">#{tag}</span>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => handleStartRename(tag)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
                    aria-label={`Rename tag ${tag}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setDeleteConfirmTag(tag); setRenamingTag(null); }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all duration-150 cursor-pointer"
                    aria-label={`Delete tag ${tag}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </SettingsSection>
  );
}
