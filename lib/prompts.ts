export interface Prompt {
  id: number;
  text: string;
  category: "gratitude" | "reflection" | "growth" | "connection" | "wellbeing";
}

export const PROMPTS: Prompt[] = [
  { id: 1, text: "What made you smile today?", category: "gratitude" },
  { id: 2, text: "What challenged you, and how did you handle it?", category: "reflection" },
  { id: 3, text: "What are you most grateful for right now?", category: "gratitude" },
  { id: 4, text: "What's one thing you want to remember about today?", category: "reflection" },
  { id: 5, text: "How did you take care of yourself today?", category: "wellbeing" },
  { id: 6, text: "What's something you learned recently?", category: "growth" },
  { id: 7, text: "Who made a positive impact on your day?", category: "connection" },
  { id: 8, text: "What would have made today even better?", category: "growth" },
  { id: 9, text: "What emotion has been most present for you lately?", category: "reflection" },
  { id: 10, text: "What are you looking forward to?", category: "wellbeing" },
  { id: 11, text: "What's a small win you can celebrate today?", category: "gratitude" },
  { id: 12, text: "What's been on your mind that you haven't said out loud?", category: "reflection" },
  { id: 13, text: "How have you grown in the past month?", category: "growth" },
  { id: 14, text: "What's one thing you want to let go of?", category: "wellbeing" },
  { id: 15, text: "What does your ideal tomorrow look like?", category: "growth" },
];

/**
 * Returns a deterministic prompt for a given date.
 * Rotates daily across all prompts (built-in + custom) so the same prompt
 * appears every N days where N = pool size.
 */
export function getDailyPrompt(date: Date = new Date(), customPrompts: string[] = []): Prompt {
  const custom: Prompt[] = customPrompts.map((text, i) => ({
    id: 1000 + i,
    text,
    category: "reflection",
  }));
  const pool = [...PROMPTS, ...custom];
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return pool[dayOfYear % pool.length];
}
