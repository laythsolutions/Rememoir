import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "No API key provided" }, { status: 401 });
  }

  let body: { text: string; existingTags: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { text, existingTags } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You are a journaling assistant. Given a journal entry, respond with ONLY valid JSON:
{"sentiment":"positive|reflective|challenging|neutral","intensity":1-5,"summary":"<1-2 sentences>","suggestedTags":["tag1","tag2"]}
- sentiment: the dominant emotional tone
- intensity: 1=mild/subtle, 5=very strong/intense expression of that sentiment
- summary: kind, non-judgmental, written in third person ("The writer...")
- suggestedTags: 0–3 single-word or short-phrase tags not in existingTags: ${JSON.stringify(existingTags)}`,
      messages: [{ role: "user", content: text.slice(0, 4000) }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    // Strip markdown code fences if present
    const cleaned = raw.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(cleaned);

    const rawIntensity = Number(parsed.intensity);
    const intensity = rawIntensity >= 1 && rawIntensity <= 5 ? rawIntensity : 3;
    return NextResponse.json({
      sentiment: parsed.sentiment ?? "neutral",
      intensity,
      summary: parsed.summary ?? "",
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags.slice(0, 3) : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
