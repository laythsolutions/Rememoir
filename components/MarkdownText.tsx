"use client";

import React from "react";

/**
 * Lightweight inline Markdown renderer.
 * Supports: **bold**, _italic_ / *italic*, `code`, and bare https:// URLs.
 * No dependencies — pure regex + React.
 */

interface Segment {
  type: "bold" | "italic" | "code" | "link" | "text";
  content: string;
  href?: string;
}

const TOKEN = /(\*\*(.+?)\*\*|_(.+?)_|\*(.+?)\*|`(.+?)`|https?:\/\/[^\s<>"]+)/g;

function parseInline(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(text)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", content: text.slice(last, match.index) });
    }

    const [full, , bold, italic1, italic2, code] = match;

    if (bold)           segments.push({ type: "bold",   content: bold });
    else if (italic1)   segments.push({ type: "italic", content: italic1 });
    else if (italic2)   segments.push({ type: "italic", content: italic2 });
    else if (code)      segments.push({ type: "code",   content: code });
    else                segments.push({ type: "link",   content: full, href: full });

    last = match.index + full.length;
  }

  if (last < text.length) {
    segments.push({ type: "text", content: text.slice(last) });
  }

  return segments;
}

function renderSegment(seg: Segment, i: number): React.ReactNode {
  switch (seg.type) {
    case "bold":
      return <strong key={i} className="font-semibold">{seg.content}</strong>;
    case "italic":
      return <em key={i} className="italic">{seg.content}</em>;
    case "code":
      return (
        <code key={i} className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-muted text-foreground/80">
          {seg.content}
        </code>
      );
    case "link":
      return (
        <a
          key={i}
          href={seg.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {seg.content}
        </a>
      );
    default:
      return <React.Fragment key={i}>{seg.content}</React.Fragment>;
  }
}

interface MarkdownTextProps {
  text: string;
  className?: string;
}

export function MarkdownText({ text, className }: MarkdownTextProps) {
  const lines = text.split("\n");

  return (
    <span className={className}>
      {lines.map((line, li) => (
        <React.Fragment key={li}>
          {li > 0 && <br />}
          {parseInline(line).map((seg, si) => renderSegment(seg, si))}
        </React.Fragment>
      ))}
    </span>
  );
}
