"use client";

import { useState, useEffect } from "react";
import { Check, Eye, EyeOff, Lock, LockOpen, X, AlertTriangle } from "lucide-react";
import {
  isEncryptionEnabled,
  enableEncryption,
  disableEncryption,
  verifyPassphrase,
  getEncryptionHint,
} from "@/lib/encryption";
import { SettingsSection } from "./shared";

type Mode = "idle" | "enable-passphrase" | "enable-confirm" | "disable";

export function EncryptionSection() {
  const [enabled, setEnabled] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [passphrase, setPassphrase] = useState("");
  const [passphraseNew, setPassphraseNew] = useState("");
  const [hintInput, setHintInput] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(isEncryptionEnabled());
    setHint(getEncryptionHint());
  }, []);

  const reset = () => {
    setMode("idle");
    setPassphrase("");
    setPassphraseNew("");
    setHintInput("");
    setVisible(false);
    setError(null);
  };

  const handleEnable = async () => {
    setError(null);
    if (mode === "idle") {
      setMode("enable-passphrase");
      return;
    }
    if (mode === "enable-passphrase") {
      if (passphrase.length < 8) { setError("Passphrase must be at least 8 characters."); return; }
      setPassphraseNew(passphrase);
      setPassphrase("");
      setMode("enable-confirm");
      return;
    }
    if (mode === "enable-confirm") {
      if (passphrase !== passphraseNew) { setError("Passphrases don't match. Try again."); setPassphrase(""); return; }
      setLoading(true);
      try {
        await enableEncryption(passphraseNew, hintInput);
        setEnabled(true);
        setHint(hintInput.trim() || null);
        setSuccess("Encryption enabled. New entries will be encrypted.");
        reset();
        setTimeout(() => setSuccess(null), 4000);
      } finally {
        setLoading(false);
      }
      return;
    }
  };

  const handleDisable = async () => {
    setError(null);
    if (mode === "idle") { setMode("disable"); return; }
    if (mode === "disable") {
      setLoading(true);
      try {
        const key = await verifyPassphrase(passphrase);
        if (!key) { setError("Incorrect passphrase."); setPassphrase(""); return; }
        disableEncryption();
        setEnabled(false);
        setHint(null);
        setSuccess("Encryption disabled.");
        reset();
        setTimeout(() => setSuccess(null), 3000);
      } finally {
        setLoading(false);
      }
    }
  };

  const label = () => {
    if (mode === "enable-passphrase") return "Choose a passphrase (min 8 characters)";
    if (mode === "enable-confirm") return "Confirm passphrase";
    if (mode === "disable") return "Enter passphrase to disable encryption";
    return "";
  };

  return (
    <SettingsSection title="Encryption">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {enabled
              ? <Lock className="w-4 h-4 text-primary" />
              : <LockOpen className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="text-[14px] font-medium">{enabled ? "Encryption enabled" : "Encryption disabled"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {enabled
                  ? "Entry text and tags are encrypted with AES-GCM."
                  : "Enable to encrypt your entries at rest with AES-GCM + PBKDF2."}
              </p>
            </div>
          </div>
          {mode === "idle" && !enabled && (
            <button
              onClick={handleEnable}
              className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
            >
              Enable
            </button>
          )}
        </div>

        {enabled && hint && mode === "idle" && (
          <p className="text-[12px] text-muted-foreground">
            Hint: <span className="font-medium text-foreground/70">{hint}</span>
          </p>
        )}

        {enabled && mode === "idle" && (
          <button
            onClick={() => setMode("disable")}
            className="text-[12px] text-destructive hover:text-destructive/80 transition-colors cursor-pointer self-start font-medium"
          >
            Disable encryption
          </button>
        )}

        {mode !== "idle" && (
          <div className="flex flex-col gap-2 pt-1">
            {mode === "enable-passphrase" && (
              <>
                <label className="text-[12px] font-medium text-muted-foreground">
                  Passphrase hint <span className="text-muted-foreground/60 font-normal">(optional — shown on lock screen)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. my childhood street"
                  value={hintInput}
                  onChange={(e) => setHintInput(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all"
                />
              </>
            )}

            <label className="text-[12px] font-medium text-muted-foreground">{label()}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visible ? "text" : "password"}
                  value={passphrase}
                  onChange={(e) => { setPassphrase(e.target.value); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") mode === "disable" ? handleDisable() : handleEnable(); }}
                  autoFocus
                  autoComplete={mode === "disable" ? "current-password" : "new-password"}
                  placeholder={mode === "enable-confirm" ? "Re-enter passphrase" : "Passphrase"}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={visible ? "Hide passphrase" : "Show passphrase"}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={mode === "disable" ? handleDisable : handleEnable}
                disabled={loading || !passphrase.trim()}
                className="px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {loading ? "…" : mode === "enable-passphrase" ? "Next" : mode === "enable-confirm" ? "Enable" : "Confirm"}
              </button>
              <button onClick={reset} className="px-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" aria-label="Cancel">
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-[12px] text-destructive">{error}</p>}
          </div>
        )}

        {success && (
          <p className="text-[12px] text-green-600 dark:text-green-400 font-medium flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" /> {success}
          </p>
        )}

        {!enabled && mode === "idle" && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-500/8 border border-amber-500/15">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/70">If you forget your passphrase, your entries cannot be recovered.</span>{" "}
              Export a plaintext JSON backup before enabling encryption.
            </p>
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
