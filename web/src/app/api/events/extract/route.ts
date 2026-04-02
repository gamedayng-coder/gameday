import { auth } from "@/auth";
import { NextResponse } from "next/server";

// AI extraction: parse free-form text into structured event fields using Claude API.
// Falls back to a basic NLP-style regex extraction if no API key is configured.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { text?: string };
  if (!body.text?.trim()) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: `Extract structured sports/event data from this text. Return ONLY valid JSON with keys like: title, home_team, away_team, date, venue, competition, score, status, and any other relevant fields you find. If a field is missing, omit it.\n\nText:\n${body.text}`,
            },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json() as { content: Array<{ text: string }> };
        const raw = data.content?.[0]?.text ?? "{}";
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          return NextResponse.json({ fields: parsed, source: "ai" });
        }
      }
    } catch { /* fall through to regex */ }
  }

  // Basic regex fallback when no AI API key
  const text = body.text;
  const fields: Record<string, string> = {};

  // Try to extract teams from "Team A vs Team B" or "Team A v Team B"
  const vsMatch = text.match(/([A-Z][A-Za-z\s.]+?)\s+(?:vs?\.?)\s+([A-Z][A-Za-z\s.]+?)(?:\s*[-,]|\s*$)/);
  if (vsMatch) { fields.home_team = vsMatch[1].trim(); fields.away_team = vsMatch[2].trim(); }

  // Extract date patterns
  const dateMatch = text.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/i);
  if (dateMatch) fields.date = dateMatch[1];

  // Extract time
  const timeMatch = text.match(/\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/);
  if (timeMatch) fields.time = timeMatch[1];

  // Extract score
  const scoreMatch = text.match(/\b(\d+)\s*[-:]\s*(\d+)\b/);
  if (scoreMatch) fields.score = `${scoreMatch[1]}-${scoreMatch[2]}`;

  // Use first line or sentence as title fallback
  const firstLine = text.split(/[.\n]/)[0].trim();
  if (firstLine) fields.title = firstLine.slice(0, 100);

  return NextResponse.json({ fields, source: "regex" });
}
