"use client";

import { useState, useEffect, useCallback } from "react";
import { Delete } from "lucide-react";
import { verifyPin, hasPinSet } from "@/lib/pin";

const LOCK_TIMEOUT_MS = 60_000; // lock after 60s hidden

interface PinLockProps {
  onUnlocked: () => void;
}

const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

export function PinLock({ onUnlocked }: PinLockProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const submit = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin);
    if (ok) {
      onUnlocked();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => { setDigits([]); setError(false); setShake(false); }, 600);
    }
  }, [onUnlocked]);

  const press = useCallback((key: string) => {
    if (key === "⌫") {
      setDigits((d) => d.slice(0, -1));
      setError(false);
      return;
    }
    if (digits.length >= 4) return;
    const next = [...digits, key];
    setDigits(next);
    if (next.length === 4) submit(next.join(""));
  }, [digits, submit]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") press(e.key);
      if (e.key === "Backspace") press("⌫");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [press]);

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center gap-8 px-6">
      {/* Brand */}
      <div className="flex flex-col items-center gap-1 mb-2">
        <span className="text-primary text-[28px] font-serif select-none" aria-hidden>✦</span>
        <span className="font-serif font-semibold text-lg tracking-tight">Rememoir</span>
        <p className="text-[13px] text-muted-foreground mt-1">Enter your PIN to continue</p>
      </div>

      {/* Dots */}
      <div
        className={`flex gap-4 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}
        aria-label={`${digits.length} of 4 digits entered`}
      >
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
              i < digits.length
                ? error
                  ? "bg-destructive border-destructive"
                  : "bg-primary border-primary"
                : "border-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;
          return (
            <button
              key={i}
              onClick={() => press(key)}
              aria-label={key === "⌫" ? "Delete" : key}
              className={`
                h-16 rounded-2xl flex items-center justify-center text-xl font-semibold
                transition-all duration-100 active:scale-95 cursor-pointer select-none
                ${key === "⌫"
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "bg-card border border-border shadow-sm hover:bg-muted/40 text-foreground"}
              `}
            >
              {key === "⌫" ? <Delete className="w-5 h-5" /> : key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Wraps the app: shows PinLock when PIN is set and app comes back from background */
export function PinGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [checked, setChecked] = useState(false);
  const hiddenAt = useState<number | null>(null);

  useEffect(() => {
    setLocked(hasPinSet());
    setChecked(true);
  }, []);

  useEffect(() => {
    let hiddenTime: number | null = null;

    const onHide = () => { hiddenTime = Date.now(); };
    const onShow = () => {
      if (hiddenTime && Date.now() - hiddenTime > LOCK_TIMEOUT_MS && hasPinSet()) {
        setLocked(true);
      }
      hiddenTime = null;
    };

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) onHide(); else onShow();
    });
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onShow);

    return () => {
      document.removeEventListener("visibilitychange", () => {});
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onShow);
    };
  }, [hiddenAt]);

  if (!checked) return null;
  if (locked) return <PinLock onUnlocked={() => setLocked(false)} />;
  return <>{children}</>;
}
