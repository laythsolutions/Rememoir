"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  isEncryptionEnabled,
  getSessionKey,
  setSessionKey,
  verifyPassphrase,
  getEncryptionHint,
} from "@/lib/encryption";

function PassphraseGate({ onUnlocked }: { onUnlocked: () => void }) {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    setHint(getEncryptionHint());
  }, []);

  const submit = async () => {
    if (!value.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const key = await verifyPassphrase(value);
      if (key) {
        setSessionKey(key);
        onUnlocked();
      } else {
        setError("Incorrect passphrase — try again.");
        setValue("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-1 mb-2">
        <span className="text-primary text-[28px] font-serif select-none" aria-hidden>✦</span>
        <span className="font-serif font-semibold text-lg tracking-tight">Rememoir</span>
        <p className="text-[13px] text-muted-foreground mt-1">Enter your passphrase to unlock</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="relative">
          <input
            ref={inputRef}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Passphrase"
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-card text-[15px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-primary/40 transition-all pr-12"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide passphrase" : "Show passphrase"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {hint && !error && (
          <p className="text-[12px] text-muted-foreground text-center">
            Hint: <span className="font-medium text-foreground/70">{hint}</span>
          </p>
        )}
        {error && (
          <p className="text-[13px] text-destructive text-center">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={loading || !value.trim()}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed shadow-md shadow-primary/20"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking…</>
            : "Unlock"}
        </button>
      </div>
    </div>
  );
}

/** Wraps the app: shows passphrase entry when encryption is enabled but not yet unlocked for this session */
export function EncryptionGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setLocked(isEncryptionEnabled() && !getSessionKey());
    setChecked(true);
  }, []);

  if (!checked) return null;
  if (locked) return <PassphraseGate onUnlocked={() => setLocked(false)} />;
  return <>{children}</>;
}
