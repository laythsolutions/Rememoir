"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Plus, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  getAutobiography,
  saveAutobiography,
  getMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  type AutobiographySections,
  type LifeMemory,
} from "@/lib/autobiography";

// ─── About Me section config ──────────────────────────────────────────────────

const SECTIONS: {
  key: keyof Omit<AutobiographySections, "updatedAt">;
  label: string;
  prompt: string;
  rows: number;
}[] = [
  {
    key: "whoIAm",
    label: "Who I am",
    prompt: "Describe yourself — your personality, your roles, how you'd introduce yourself to the world.",
    rows: 4,
  },
  {
    key: "myJourney",
    label: "My journey so far",
    prompt: "Where did you come from? What experiences shaped you? The chapters of your life, in your own words.",
    rows: 6,
  },
  {
    key: "formativeMemory",
    label: "A memory that made me",
    prompt: "One moment — a person, a place, a day — that changed how you see yourself or the world.",
    rows: 5,
  },
  {
    key: "whatIBelieve",
    label: "What I believe in",
    prompt: "Your values, your principles, the things you'd stand up for.",
    rows: 4,
  },
  {
    key: "workingToward",
    label: "What I'm working toward",
    prompt: "Your hopes, your goals, the version of yourself you're becoming.",
    rows: 4,
  },
];

const EMPTY_FORM = { era: "", title: "", content: "" };

type Tab = "about" | "memories";

export function AutobiographyView() {
  const [tab, setTab] = useState<Tab>("memories");

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150 cursor-pointer"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-4.5 h-4.5" />
            </Link>
            <h1 className="text-base font-semibold tracking-tight">My Story</h1>
          </div>
          <ThemeToggle />
        </div>

        <div className="py-5 animate-page-in">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-muted/80 rounded-xl mb-6">
            {(["memories", "about"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "memories" ? "Life Memories" : "About Me"}
              </button>
            ))}
          </div>

          {tab === "memories" ? <MemoriesTab /> : <AboutTab />}
        </div>
      </div>
    </main>
  );
}

// ─── Memories tab ─────────────────────────────────────────────────────────────

function MemoriesTab() {
  const [memories, setMemories] = useState<LifeMemory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setMemories(getMemories());
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (memory: LifeMemory) => {
    setEditingId(memory.id);
    setForm({ era: memory.era, title: memory.title, content: memory.content });
    setShowForm(true);
    setExpandedId(null);
  };

  const handleSave = () => {
    if (!form.content.trim()) return;
    if (editingId) {
      updateMemory(editingId, form);
      setMemories(getMemories());
    } else {
      const m = addMemory(form);
      setMemories((prev) => [m, ...prev]);
    }
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleDelete = (id: string) => {
    deleteMemory(id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
    setDeleteConfirmId(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Add button */}
      {!showForm && (
        <Button onClick={handleAdd} className="gap-2 self-start rounded-xl shadow-sm shadow-primary/15 cursor-pointer">
          <Plus className="w-4 h-4" />
          Add a memory
        </Button>
      )}

      {/* Memory form */}
      {showForm && (
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-primary/25 bg-card shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">
              {editingId ? "Edit memory" : "New memory"}
            </p>
            <button
              onClick={handleCancel}
              className="text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <input
            type="text"
            value={form.era}
            onChange={(e) => setForm((f) => ({ ...f, era: e.target.value }))}
            placeholder="Era or period  (e.g. Childhood, Summer 2015)"
            maxLength={60}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200"
          />

          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title (optional)"
            maxLength={100}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 transition-all duration-200"
          />

          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="Write this memory…"
            rows={5}
            autoFocus
            className="writing-area w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 resize-none transition-all duration-200"
          />

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={!form.content.trim()} className="rounded-xl cursor-pointer">
              {editingId ? "Save changes" : "Add memory"}
            </Button>
            <Button size="sm" variant="outline" onClick={handleCancel} className="rounded-xl cursor-pointer">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {memories.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <Plus className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-sm font-semibold">No memories yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Capture moments from your past — big or small.
            </p>
          </div>
        </div>
      )}

      {/* Memory list */}
      <div className="flex flex-col gap-2.5">
        {memories.map((memory) => {
          const isExpanded = expandedId === memory.id;
          return (
            <div
              key={memory.id}
              className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden"
            >
              <button
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/30 transition-colors cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : memory.id)}
              >
                <div className="flex-1 min-w-0">
                  {memory.era && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/8 text-primary mb-2">
                      {memory.era}
                    </span>
                  )}
                  {memory.title && (
                    <p className="text-[14px] font-semibold leading-snug">{memory.title}</p>
                  )}
                  <p className={`text-[13px] text-muted-foreground mt-0.5 leading-relaxed ${isExpanded ? "" : "line-clamp-2"}`}>
                    {memory.content}
                  </p>
                </div>
              </button>

              {isExpanded && (
                <div className="flex items-center gap-3 px-4 pb-3.5 border-t border-border/50 pt-2.5 mt-0">
                  <button
                    onClick={() => handleEdit(memory)}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </button>
                  <span className="text-border">·</span>
                  {deleteConfirmId === memory.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Delete?</span>
                      <button
                        onClick={() => handleDelete(memory.id)}
                        className="text-xs font-semibold text-destructive hover:underline cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(memory.id)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground/60">
                    {new Date(memory.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── About Me tab ─────────────────────────────────────────────────────────────

function AboutTab() {
  const [sections, setSections] = useState<AutobiographySections>({
    whoIAm: "",
    myJourney: "",
    whatIBelieve: "",
    workingToward: "",
    formativeMemory: "",
  });
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const data = getAutobiography();
    setSections(data);
    if (data.updatedAt) setLastSaved(data.updatedAt);
  }, []);

  const handleChange = useCallback(
    (key: keyof Omit<AutobiographySections, "updatedAt">, value: string) => {
      setSections((prev) => {
        const updated = { ...prev, [key]: value };
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          saveAutobiography(updated);
          setLastSaved(new Date().toISOString());
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }, 1500);
        return updated;
      });
    },
    []
  );

  const wordCount = Object.entries(sections)
    .filter(([k]) => k !== "updatedAt")
    .reduce((sum, [, v]) => {
      return sum + (v as string).trim().split(/\s+/).filter(Boolean).length;
    }, 0);

  return (
    <div className="flex flex-col gap-7">
      {/* Empty state prompt */}
      {wordCount === 0 && !lastSaved && (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-center flex flex-col gap-1.5">
          <p className="text-sm font-semibold">Tell your story</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            These sections build your personal narrative — private, saved only on your device.
          </p>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
        <span className="tabular-nums">{wordCount} {wordCount !== 1 ? "words" : "word"}</span>
        {lastSaved && (
          <>
            <span className="text-border">·</span>
            <span>
              {saved ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                  <Check className="w-3 h-3" /> Saved
                </span>
              ) : (
                `Saved ${new Date(lastSaved).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              )}
            </span>
          </>
        )}
      </div>

      {SECTIONS.map(({ key, label, prompt, rows }) => (
        <section key={key} className="flex flex-col gap-2.5">
          <div>
            <h2 className="text-[15px] font-semibold">{label}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{prompt}</p>
          </div>
          <textarea
            value={sections[key] as string}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={rows}
            placeholder="Start writing…"
            className="writing-area w-full px-4 py-3 rounded-2xl border border-border bg-card shadow-sm text-[14px] placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/40 resize-none transition-all duration-200"
          />
        </section>
      ))}

      <p className="text-[11px] text-muted-foreground/60 text-center pb-6">
        Auto-saved · Private · Never leaves your device
      </p>
    </div>
  );
}
