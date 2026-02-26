"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { getPreferences, savePreferences, type PromptFrequency } from "@/lib/preferences";
import { SettingsSection } from "./shared";

const FREQUENCIES: { value: PromptFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "every3days", label: "Every 3 days" },
  { value: "weekly", label: "Weekly" },
  { value: "off", label: "Off" },
];

const GOAL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "None" },
  { value: 3, label: "3 / week" },
  { value: 5, label: "5 / week" },
  { value: 7, label: "Every day" },
];

export function PromptsSection() {
  const [frequency, setFrequency] = useState<PromptFrequency>("daily");
  const [weeklyGoal, setWeeklyGoal] = useState(0);
  const [customPrompts, setCustomPrompts] = useState<string[]>([]);
  const [newPrompt, setNewPrompt] = useState("");

  useEffect(() => {
    const prefs = getPreferences();
    setFrequency(prefs.promptFrequency);
    setWeeklyGoal(prefs.weeklyGoal ?? 0);
    setCustomPrompts(prefs.customPrompts ?? []);
  }, []);

  const handleFrequency = (value: PromptFrequency) => {
    setFrequency(value);
    savePreferences({ promptFrequency: value });
  };

  const handleGoal = (value: number) => {
    setWeeklyGoal(value);
    savePreferences({ weeklyGoal: value });
  };

  const handleAddPrompt = () => {
    const text = newPrompt.trim();
    if (!text || customPrompts.includes(text)) return;
    const updated = [...customPrompts, text];
    setCustomPrompts(updated);
    savePreferences({ customPrompts: updated });
    setNewPrompt("");
  };

  const handleRemovePrompt = (i: number) => {
    const updated = customPrompts.filter((_, idx) => idx !== i);
    setCustomPrompts(updated);
    savePreferences({ customPrompts: updated });
  };

  return (
    <SettingsSection title="Prompts">
      <div className="flex flex-col gap-5">
        {/* Prompt frequency */}
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            How often should a writing prompt appear on your home screen?
          </p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCIES.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleFrequency(value)}
                className={`px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                  frequency === value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Weekly writing goal */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Weekly writing goal
          </p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleGoal(value)}
                className={`px-3.5 py-2 rounded-xl border text-[13px] font-medium transition-all duration-150 cursor-pointer ${
                  weeklyGoal === value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {weeklyGoal > 0 && (
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              Your progress toward {weeklyGoal === 7 ? "journalling every day" : `${weeklyGoal} days a week`} shows on the home screen.
            </p>
          )}
        </div>

        {/* Custom prompts */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Your prompts
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Add your own writing prompts — they rotate alongside the built-in ones.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. What am I proud of this week?"
              value={newPrompt}
              onChange={(e) => setNewPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleAddPrompt(); }
              }}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-[13px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
            />
            <button
              onClick={handleAddPrompt}
              disabled={!newPrompt.trim()}
              aria-label="Add prompt"
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-border bg-background text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {customPrompts.length > 0 && (
            <div className="flex flex-col gap-1.5 mt-0.5">
              {customPrompts.map((text, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 px-3 py-2 rounded-xl bg-muted/50 text-[13px]"
                >
                  <span className="flex-1 text-foreground/80 leading-snug">{text}</span>
                  <button
                    onClick={() => handleRemovePrompt(i)}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer shrink-0 mt-0.5"
                    aria-label="Remove prompt"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
