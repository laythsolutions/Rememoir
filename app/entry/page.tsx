import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RememoirEntryForm } from "@/components/RememoirEntryForm";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "New Entry",
};

export default function EntryPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4 mb-2 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <h1 className="text-base font-semibold tracking-tight">New entry</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="py-6 animate-page-in">
          <RememoirEntryForm />
        </div>
      </div>
    </main>
  );
}
