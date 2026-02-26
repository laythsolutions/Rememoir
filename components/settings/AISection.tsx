"use client";

import { useState, useEffect } from "react";
import { Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAIKey, setAIKey, isAIEnabled, setAIEnabled } from "@/lib/ai";
import { SettingsSection } from "./shared";

export function AISection() {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyVisible, setKeyVisible] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(isAIEnabled());
    setApiKey(getAIKey() ?? "");
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.startsWith("sk-ant-")) {
      setKeyError("Key must start with sk-ant-");
      return;
    }
    setAIKey(apiKey);
    setSaved(true);
    setKeyError(null);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <SettingsSection title="AI Features">
      <div className="flex flex-col gap-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-primary" />
            <div>
              <p className="text-[14px] font-medium">Enable AI features</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Auto-tag, sentiment, smart prompts, autobiography drafts
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !enabled;
              setEnabled(next);
              setAIEnabled(next);
            }}
            aria-label={enabled ? "Disable AI features" : "Enable AI features"}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring ${
              enabled ? "bg-primary" : "bg-muted-foreground/30"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* API key input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium" htmlFor="ai-key">
            Anthropic API key
          </label>
          <div className="relative">
            <input
              id="ai-key"
              type={keyVisible ? "text" : "password"}
              value={apiKey}
              onChange={(e) => { setApiKey(e.target.value); setKeyError(null); setSaved(false); }}
              placeholder="sk-ant-…"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200 pr-10 font-mono text-[13px]"
            />
            <button
              type="button"
              onClick={() => setKeyVisible((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={keyVisible ? "Hide key" : "Show key"}
            >
              {keyVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {keyError && <p className="text-[12px] text-destructive">{keyError}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handleSaveKey}
            variant={saved ? "outline" : "default"}
            className="gap-1.5 rounded-xl cursor-pointer"
          >
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : "Save key"}
          </Button>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-primary hover:text-primary/80 transition-colors font-medium"
          >
            Get an API key →
          </a>
        </div>

        <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
          Powered by Claude. Your key, your data. Calls go directly from your device to Anthropic — Rememoir never sees them.
        </p>
      </div>
    </SettingsSection>
  );
}
