"use client";

import { Sparkles, X } from "lucide-react";
import type { Prompt } from "@/lib/prompts";

interface RememoirPromptDisplayProps {
  prompt: Prompt;
  onUse: (text: string) => void;
  onDismiss: () => void;
}

export function RememoirPromptDisplay({
  prompt,
  onUse,
  onDismiss,
}: RememoirPromptDisplayProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/6 border border-primary/15">
      <Sparkles className="w-4 h-4 mt-0.5 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
          Today's prompt
        </p>
        <p className="text-sm text-foreground/80 leading-relaxed">{prompt.text}</p>
        <button
          type="button"
          onClick={() => onUse(prompt.text)}
          className="mt-2.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer"
        >
          Use this prompt →
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss prompt"
        className="text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0 cursor-pointer mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
