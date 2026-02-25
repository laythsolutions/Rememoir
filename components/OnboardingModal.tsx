"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, Wifi, Download, ArrowRight, ArrowLeft, Bell } from "lucide-react";
import { saveProfile } from "@/lib/profile";
import { getDailyPrompt } from "@/lib/prompts";
import { savePreferences, type PromptFrequency } from "@/lib/preferences";

const ONBOARDING_KEY = "rememoir_onboarded";

export function OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [promptFreq, setPromptFreq] = useState<PromptFrequency>("daily");
  const router = useRouter();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShow(false);
  };

  const goNext = () => {
    if (step === 0) {
      saveProfile({ name: name.trim(), bio: "" });
    }
    if (step === 2) {
      savePreferences({ promptFrequency: promptFreq });
    }
    setStep((s) => s + 1);
  };

  const goBack = () => setStep((s) => s - 1);

  if (!show) return null;

  const prompt = getDailyPrompt();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5 pb-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 h-2 bg-primary"
                  : i < step
                  ? "w-2 h-2 bg-primary/40"
                  : "w-2 h-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Slides */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${step * 100}%)` }}
          >
            {/* Step 0 — Welcome */}
            <div className="min-w-full px-6 pt-5 pb-6 flex flex-col gap-5">
              <div className="text-center">
                <span className="text-5xl block mb-3">🪶</span>
                <h2 className="text-2xl font-bold tracking-tight">Welcome to Rememoir</h2>
                <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
                  My memories, my thoughts, my reflections, Me.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium" htmlFor="onboarding-name">
                  What should we call you? <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  id="onboarding-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name or nickname"
                  maxLength={60}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200"
                />
              </div>
              <Button onClick={goNext} className="w-full gap-2">
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Step 1 — Privacy & features */}
            <div className="min-w-full px-6 pt-5 pb-6 flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Built for privacy</h2>
                <p className="text-muted-foreground text-sm mt-1">Everything stays on your device.</p>
              </div>
              <div className="flex flex-col gap-4">
                <Feature
                  icon={<Shield className="w-5 h-5 text-primary" />}
                  title="Completely private"
                  description="Everything is stored locally on your device. No servers, no tracking."
                />
                <Feature
                  icon={<Wifi className="w-5 h-5 text-primary" />}
                  title="Works offline"
                  description="Write entries anywhere, anytime — even without internet."
                />
                <Feature
                  icon={<Download className="w-5 h-5 text-primary" />}
                  title="Your data, always"
                  description="Export everything as JSON, PDF, or Markdown whenever you want."
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button onClick={goNext} className="flex-1 gap-2">
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Step 2 — Prompt frequency */}
            <div className="min-w-full px-6 pt-5 pb-6 flex flex-col gap-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Writing prompts</h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    How often would you like a prompt to inspire you?
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "daily", label: "Daily", sub: "A fresh question every day" },
                    { value: "every3days", label: "Every 3 days", sub: "A gentle nudge" },
                    { value: "weekly", label: "Weekly", sub: "Once a week" },
                    { value: "off", label: "Off", sub: "No prompts" },
                  ] as { value: PromptFrequency; label: string; sub: string }[]
                ).map(({ value, label, sub }) => (
                  <button
                    key={value}
                    onClick={() => setPromptFreq(value)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                      promptFreq === value
                        ? "bg-primary/8 border-primary/30 shadow-sm"
                        : "border-border bg-background hover:border-border/80"
                    }`}
                  >
                    <span className={`text-[13px] font-semibold ${promptFreq === value ? "text-primary" : ""}`}>{label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5">{sub}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={goBack} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button onClick={goNext} className="flex-1 gap-2">
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Step 3 — First prompt */}
            <div className="min-w-full px-6 pt-5 pb-6 flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Your first prompt</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  A fresh question every day to get you writing.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-primary/6 border border-primary/15 flex flex-col gap-2">
                <p className="text-[11px] font-semibold text-primary uppercase tracking-widest">
                  Today&rsquo;s prompt
                </p>
                <p className="text-[15px] font-medium text-foreground/90 leading-relaxed">
                  &ldquo;{prompt.text}&rdquo;
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    dismiss();
                    router.push(`/entry?prompt=${encodeURIComponent(prompt.text)}`);
                  }}
                  className="w-full gap-2"
                >
                  Write your first entry
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={dismiss} className="w-full text-muted-foreground">
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
