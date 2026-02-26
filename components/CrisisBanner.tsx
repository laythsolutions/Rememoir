"use client";

import { useState } from "react";
import { X, Heart } from "lucide-react";
import { dismissCrisisBanner } from "@/lib/crisis";

const RESOURCES = [
  { name: "Crisis Text Line", detail: "Text HOME to 741741", url: "https://www.crisistextline.org" },
  { name: "Samaritans (UK/IE)", detail: "116 123", url: "https://www.samaritans.org" },
  { name: "Lifeline (AU)", detail: "13 11 14", url: "https://www.lifeline.org.au" },
  { name: "Find a helpline", detail: "International directory", url: "https://findahelpline.com" },
];

export function CrisisBanner() {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    dismissCrisisBanner();
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Heart className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[14px] font-semibold text-rose-800 dark:text-rose-300 leading-snug">
            It looks like things have been tough lately
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-[13px] text-rose-700 dark:text-rose-400 leading-relaxed">
        Writing through difficult periods takes real courage. You don&rsquo;t have to carry it alone — support is available.
      </p>

      <div className="flex flex-col gap-1.5">
        {RESOURCES.map((r) => (
          <a
            key={r.name}
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-700 transition-all cursor-pointer group"
          >
            <span className="text-[13px] font-medium text-rose-800 dark:text-rose-300 group-hover:text-rose-600 dark:group-hover:text-rose-200 transition-colors">
              {r.name}
            </span>
            <span className="text-[12px] text-rose-500 dark:text-rose-500">{r.detail}</span>
          </a>
        ))}
      </div>

      <p className="text-[11px] text-rose-500/70 dark:text-rose-600">
        This suggestion is based on recent journal tone, not a clinical assessment.
      </p>
    </div>
  );
}
