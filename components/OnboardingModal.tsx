"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Wifi, Download } from "lucide-react";

const ONBOARDING_KEY = "rememoir_onboarded";

export function OnboardingModal() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Hero */}
        <div className="px-6 pt-8 pb-6 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-center">
          <span className="text-5xl block mb-3">🪶</span>
          <h2 className="text-2xl font-bold">Welcome to Rememoir</h2>
          <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
            My memories, my thoughts, my reflections, Me.
          </p>
        </div>

        {/* Features */}
        <div className="px-6 py-5 flex flex-col gap-4">
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
            description="Export everything as JSON or PDF whenever you want."
          />
        </div>

        <div className="px-6 pb-6">
          <Button onClick={dismiss} className="w-full" size="lg">
            Start journaling
          </Button>
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
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </div>
  );
}
