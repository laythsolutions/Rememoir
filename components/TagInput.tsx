"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";

const MAX_TAGS = 10;
const MAX_TAG_LEN = 30;

function sanitize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, MAX_TAG_LEN);
}

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  placeholder = "Add tags…",
}: TagInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const tag = sanitize(raw);
    if (!tag || value.includes(tag) || value.length >= MAX_TAGS) {
      setInput("");
      return;
    }
    onChange([...value, tag]);
    setInput("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      e.preventDefault();
      commit(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 min-h-10 px-3 py-2 rounded-md border border-input bg-transparent cursor-text transition-[box-shadow] focus-within:ring-[3px] focus-within:ring-ring/50 focus-within:border-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
        >
          #{tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); remove(tag); }}
            className="hover:text-primary/60 transition-colors"
            aria-label={`Remove tag ${tag}`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => commit(input)}
        placeholder={value.length === 0 ? placeholder : ""}
        disabled={value.length >= MAX_TAGS}
        className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  );
}
