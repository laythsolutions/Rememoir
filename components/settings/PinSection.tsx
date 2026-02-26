"use client";

import { useState, useEffect } from "react";
import { Check, Eye, EyeOff, Lock, LockOpen, X } from "lucide-react";
import { hasPinSet, setPin, verifyPin, clearPin } from "@/lib/pin";
import { SettingsSection } from "./shared";

type PinMode = "idle" | "set-current" | "set-new" | "confirm-new" | "remove";

export function PinSection() {
  const [pinEnabled, setPinEnabled] = useState(false);
  const [mode, setMode] = useState<PinMode>("idle");
  const [pinInput, setPinInput] = useState("");
  const [pinNew, setPinNew] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setPinEnabled(hasPinSet());
  }, []);

  const reset = () => {
    setMode("idle");
    setPinInput("");
    setPinNew("");
    setError(null);
    setVisible(false);
  };

  const handleSubmit = async () => {
    setError(null);
    if (mode === "set-new" && !pinEnabled) {
      if (pinInput.length !== 4) { setError("PIN must be 4 digits."); return; }
      setPinNew(pinInput); setPinInput(""); setMode("confirm-new");
    } else if (mode === "confirm-new") {
      if (pinInput !== pinNew) { setError("PINs don't match. Try again."); setPinInput(""); return; }
      await setPin(pinInput); setPinEnabled(true);
      setSuccess("PIN enabled."); reset(); setTimeout(() => setSuccess(null), 3000);
    } else if (mode === "set-current") {
      const ok = await verifyPin(pinInput);
      if (!ok) { setError("Incorrect PIN."); setPinInput(""); return; }
      setPinNew(""); setPinInput(""); setMode("set-new");
    } else if (mode === "remove") {
      const ok = await verifyPin(pinInput);
      if (!ok) { setError("Incorrect PIN."); setPinInput(""); return; }
      clearPin(); setPinEnabled(false);
      setSuccess("PIN removed."); reset(); setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <SettingsSection title="App Lock">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {pinEnabled
              ? <Lock className="w-4 h-4 text-primary" />
              : <LockOpen className="w-4 h-4 text-muted-foreground" />}
            <div>
              <p className="text-[14px] font-medium">{pinEnabled ? "PIN enabled" : "PIN disabled"}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {pinEnabled
                  ? "Journal locks after 60s in background."
                  : "Protect your journal with a 4-digit PIN."}
              </p>
            </div>
          </div>
          {mode === "idle" && (
            <button
              onClick={() => setMode(pinEnabled ? "set-current" : "set-new")}
              className="text-[12px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer shrink-0"
            >
              {pinEnabled ? "Change" : "Enable"}
            </button>
          )}
        </div>

        {pinEnabled && mode === "idle" && (
          <button
            onClick={() => setMode("remove")}
            className="text-[12px] text-destructive hover:text-destructive/80 transition-colors cursor-pointer self-start font-medium"
          >
            Remove PIN
          </button>
        )}

        {mode !== "idle" && (
          <div className="flex flex-col gap-2 pt-1">
            <label className="text-[12px] font-medium text-muted-foreground">
              {mode === "set-current" && "Current PIN"}
              {mode === "set-new" && (pinEnabled ? "New PIN" : "Choose a 4-digit PIN")}
              {mode === "confirm-new" && "Confirm new PIN"}
              {mode === "remove" && "Enter PIN to remove"}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visible ? "text" : "password"}
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all pr-10 tracking-widest"
                  placeholder="••••"
                />
                <button
                  type="button"
                  onClick={() => setVisible((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={visible ? "Hide PIN" : "Show PIN"}
                >
                  {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={pinInput.length !== 4}
                className="px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold disabled:opacity-40 transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                {mode === "confirm-new" ? "Save" : "Next"}
              </button>
              <button
                onClick={reset}
                className="px-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                aria-label="Cancel"
              >
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
      </div>
    </SettingsSection>
  );
}
