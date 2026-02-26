import { describe, it, expect } from "vitest";
import { getDailyPrompt, PROMPTS } from "../prompts";

describe("getDailyPrompt", () => {
  it("returns a prompt with non-empty text", () => {
    const prompt = getDailyPrompt();
    expect(typeof prompt.text).toBe("string");
    expect(prompt.text.length).toBeGreaterThan(0);
  });

  it("returns a built-in prompt category", () => {
    const valid = ["gratitude", "reflection", "growth", "connection", "wellbeing", "reflection"];
    const prompt = getDailyPrompt();
    expect(valid).toContain(prompt.category);
  });

  it("returns the same prompt for the same date (deterministic)", () => {
    const date = new Date("2024-06-15");
    expect(getDailyPrompt(date).id).toBe(getDailyPrompt(date).id);
    expect(getDailyPrompt(date).text).toBe(getDailyPrompt(date).text);
  });

  it("returns different prompts for different dates", () => {
    const texts = new Set(
      Array.from({ length: 15 }, (_, i) => {
        const d = new Date(2024, 0, i + 1);
        return getDailyPrompt(d).text;
      })
    );
    // With 15 built-in prompts and 15 unique days, each day should get a unique prompt
    expect(texts.size).toBe(15);
  });

  it("custom prompts are included in the rotation pool", () => {
    const custom = ["What am I proud of this week?", "Who inspired me lately?"];
    // Collect prompt texts over 17 days (15 built-in + 2 custom = pool of 17)
    const seen = new Set(
      Array.from({ length: 17 }, (_, i) => {
        const d = new Date(2024, 0, i + 1);
        return getDailyPrompt(d, custom).text;
      })
    );
    expect(seen).toContain("What am I proud of this week?");
    expect(seen).toContain("Who inspired me lately?");
  });

  it("custom prompt appears at the correct pool index", () => {
    // Pool = 16 (15 built-in + 1 custom)
    // Jan 15, 2024 → dayOfYear = 15; 15 % 16 = 15 → pool[15] = custom[0]
    const date = new Date(2024, 0, 15);
    const custom = ["My custom prompt?"];
    const prompt = getDailyPrompt(date, custom);
    expect(prompt.text).toBe("My custom prompt?");
  });

  it("without custom prompts, Jan 15 returns built-in PROMPTS[0] (15 % 15 = 0)", () => {
    const date = new Date(2024, 0, 15);
    const prompt = getDailyPrompt(date, []);
    expect(prompt.text).toBe(PROMPTS[0].text);
  });

  it("custom prompts get category 'reflection'", () => {
    const date = new Date(2024, 0, 15);
    const custom = ["A custom question?"];
    const prompt = getDailyPrompt(date, custom);
    if (prompt.text === "A custom question?") {
      expect(prompt.category).toBe("reflection");
    }
  });
});
