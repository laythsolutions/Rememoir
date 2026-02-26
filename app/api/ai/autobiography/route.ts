import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "No API key provided" }, { status: 401 });
  }

  let body: { entries: Array<{ text: string; createdAt: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { entries } = body;
  if (!entries?.length) {
    return NextResponse.json({ error: "No entries provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const entryContent = entries
    .map((e) => `[${e.createdAt.slice(0, 10)}] ${e.text.slice(0, 500)}`)
    .join("\n\n");

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system:
        "You are helping someone write their memoir. Given journal entries, write a narrative paragraph (150–200 words) in first person, warm and literary in tone, suitable for a personal autobiography. Synthesize themes rather than listing events. Return only the paragraph.",
      messages: [{ role: "user", content: entryContent }],
    });

    const draft =
      message.content[0].type === "text" ? message.content[0].text.trim() : "";

    return NextResponse.json({ draft });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
