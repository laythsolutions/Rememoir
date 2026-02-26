"use client";

import Link from "next/link";
import { ArrowLeft, BookMarked, ChevronRight, Github } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { PromptsSection } from "@/components/settings/PromptsSection";
import { TagsSection } from "@/components/settings/TagsSection";
import { StorageSection } from "@/components/settings/StorageSection";
import { ExportSection } from "@/components/settings/ExportSection";
import { ImportSection } from "@/components/settings/ImportSection";
import { AISection } from "@/components/settings/AISection";
import { PinSection } from "@/components/settings/PinSection";
import { EncryptionSection } from "@/components/settings/EncryptionSection";
import { RemindersSection } from "@/components/settings/RemindersSection";
import { BackupSection } from "@/components/settings/BackupSection";
import { SettingsSection } from "@/components/settings/shared";

export function SettingsView() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
              aria-label="Back"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <h1 className="text-base font-semibold tracking-tight">Settings</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="pb-8 flex flex-col gap-8 animate-page-in">
          <ProfileSection />
          <PromptsSection />
          <TagsSection />

          {/* My Story */}
          <SettingsSection title="My Story">
            <Link
              href="/autobiography"
              className="flex items-center justify-between p-3.5 bg-background rounded-xl border border-border hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookMarked className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-medium">My Autobiography</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Life memories & long-form self-reflection
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            </Link>
          </SettingsSection>

          <StorageSection />
          <ExportSection />
          <ImportSection />
          <AISection />
          <RemindersSection />
          <BackupSection />
          <PinSection />
          <EncryptionSection />

          {/* About */}
          <SettingsSection title="About">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookMarked className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[14px] font-semibold">Rememoir</p>
                  <p className="text-[11px] text-muted-foreground">Version 0.1.0 · MIT License</p>
                </div>
              </div>
              <Separator />
              <p className="text-[13px] text-muted-foreground leading-relaxed">
                100% open source, self-hostable, zero telemetry. Your journal stays on your device.
              </p>
              <a
                href="https://github.com/your-org/rememoir"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[13px] text-primary hover:text-primary/80 font-medium transition-colors cursor-pointer w-fit"
              >
                <Github className="w-4 h-4" />
                View on GitHub
              </a>
            </div>
          </SettingsSection>
        </div>
      </div>
    </main>
  );
}
