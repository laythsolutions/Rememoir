"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { TEMPLATES, type JournalTemplate } from "@/lib/templates";

const CATEGORY_LABEL: Record<JournalTemplate["category"], string> = {
  gratitude: "Gratitude",
  wellbeing: "Wellbeing",
  therapy: "Therapy",
  reflection: "Reflection",
};

const CATEGORY_ORDER: JournalTemplate["category"][] = ["wellbeing", "gratitude", "therapy", "reflection"];

export function TemplateSheet({
  onSelect,
  onClose,
}: {
  onSelect: (content: string) => void;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    templates: TEMPLATES.filter((t) => t.category === cat),
  })).filter((g) => g.templates.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-border shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Choose a template</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">Replaces any current text</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template list */}
        <div className="overflow-y-auto px-4 pb-6 flex flex-col gap-5">
          {grouped.map(({ category, templates }) => (
            <div key={category} className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">
                {CATEGORY_LABEL[category]}
              </p>
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { onSelect(t.content); onClose(); }}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-background hover:border-primary/30 hover:bg-primary/4 transition-all duration-150 text-left cursor-pointer group"
                >
                  <span className="text-[22px] leading-none mt-0.5 shrink-0">{t.emoji}</span>
                  <div>
                    <p className="text-[14px] font-medium group-hover:text-primary transition-colors">{t.name}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
