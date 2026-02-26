export interface JournalTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "wellbeing" | "therapy" | "reflection" | "gratitude";
  content: string;
}

export const TEMPLATES: JournalTemplate[] = [
  {
    id: "gratitude",
    name: "Gratitude",
    description: "Three things you're grateful for and why",
    emoji: "🌱",
    category: "gratitude",
    content: `Three things I'm grateful for today:

1.

2.

3.

Why these matter to me right now:

One small way I'll carry this forward today:`,
  },
  {
    id: "daily-checkin",
    name: "Daily check-in",
    description: "Highlight, lowlight, and intention",
    emoji: "☀️",
    category: "wellbeing",
    content: `Today's highlight:

Today's low point:

How I'm feeling right now (physically and emotionally):

One thing I want to do or let go of tomorrow:`,
  },
  {
    id: "worry-dump",
    name: "Worry dump",
    description: "Externalise anxiety and find what's in your control",
    emoji: "🌊",
    category: "wellbeing",
    content: `What's worrying me right now:

Is this worry about something real or something imagined?

What's actually within my control here?

What's outside my control that I need to release?

One small action I can take:`,
  },
  {
    id: "cbt-thought-record",
    name: "CBT thought record",
    description: "Examine and reframe an unhelpful thought",
    emoji: "🔍",
    category: "therapy",
    content: `Situation (what happened, where, when):

Automatic thought (what went through my mind):

Emotion (what did I feel, 0–10 intensity):

Evidence that supports this thought:

Evidence that challenges this thought:

A more balanced perspective:

How I feel now (0–10):`,
  },
  {
    id: "weekly-reflection",
    name: "Weekly reflection",
    description: "Review the week and set an intention",
    emoji: "🔭",
    category: "reflection",
    content: `This week's biggest win:

Something that was harder than expected:

What I learned about myself:

Something I'd do differently:

One intention for next week:`,
  },
];
