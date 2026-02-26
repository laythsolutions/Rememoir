import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "No API key provided" }, { status: 401 });
  }

  let body: { recentEntries: Array<{ text: string; createdAt: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { recentEntries } = body;
  if (!recentEntries?.length) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const entrySummaries = recentEntries
    .slice(0, 5)
    .map((e, i) => `Entry ${i + 1} (${e.createdAt.slice(0, 10)}): ${e.text.slice(0, 300)}`)
    .join("\n\n");

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 64,
      system:
        "You are a thoughtful journaling coach. Based on recent entries, write ONE personalised reflection question (max 25 words). Do not reference specific names or details — keep it universal but emotionally resonant. Return only the question, no quotes.",
      messages: [{ role: "user", content: entrySummaries }],
    });

    const prompt =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return NextResponse.json({ prompt });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
