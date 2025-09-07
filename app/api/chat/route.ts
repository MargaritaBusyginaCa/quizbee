// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// --- Model setup (keep env var name consistent with generate-quiz) ---
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set.");
}
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// --- Helpers ---
type QuizQ = { questionText: string; options: string[]; correctAnswer: string };

function fenceOrDirectParse(text: string) {
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  const payload = m ? m[1] : text;
  return JSON.parse(payload);
}

function shortenQuiz(quiz: unknown, cap = 20): QuizQ[] | null {
  if (!Array.isArray(quiz)) return null;
  return quiz.slice(0, cap);
}

// --- Route ---
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const message: string = body?.message;
    // Accept either meta or context for backwards compat
    const meta = body?.meta ?? body?.context ?? null;
    const quiz: QuizQ[] | null = shortenQuiz(body?.quiz, 20);

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    // System rules: ALWAYS return JSON only.
    const prompt = `
You are a quiz-modification assistant.

Input:
- User request: ${JSON.stringify(message)}
- Current quiz (optional, truncated): ${quiz ? JSON.stringify(quiz) : "none"}
- Meta (optional): ${meta ? JSON.stringify(meta) : "none"}

Output: JSON ONLY (no prose outside JSON). Choose one or more of:
1) A plan:
{
  "content": "<brief confirmation>",
  "modification": {
    "type": "difficulty" | "topic" | "count" | "append" | "other",
    "action": "increase" | "decrease" | "change",
    "value": "<new value if applicable>",
    "count": 5,              // for type=append (number of new questions)
    "subtopic": "..."        // optional hint for generation
  }
}

2) Direct in-place edits to the current quiz:
{
  "content": "<brief confirmation>",
  "patches": [
    { "op": "replace", "index": 2, "question": { "questionText": "...", "options": ["a","b","c","d"], "correctAnswer": "a" } },
    { "op": "update", "index": 0, "question": { "questionText": "..." } },
    { "op": "delete", "index": 4 },
    { "op": "insertAfter", "index": 1, "question": { ... } }
  ]
}

3) A full replacement quiz:
{
  "content": "<brief>",
  "quiz": [ { "questionText": "...", "options": ["...","...","...","..."], "correctAnswer": "..." } ]
}

Rules:
- Each "options" array must have exactly 4 strings and one "correctAnswer" that matches one option.
- Use "patches" when the user asks to tweak specific questions; use "modification" when they ask to change topic, difficulty, or question count; use "quiz" when rewriting everything.
`.trim();

    const resp = await model.generateContent(prompt);
    const text = resp.response.text();

    let parsed: any;
    try {
      parsed = fenceOrDirectParse(text);
    } catch {
      // Fallback: wrap as plain content if the model didn't return valid JSON
      parsed = { content: text };
    }

    // Basic shape safety
    if (parsed?.quiz && !Array.isArray(parsed.quiz)) {
      delete parsed.quiz;
    }
    if (parsed?.modification && typeof parsed.modification !== "object") {
      delete parsed.modification;
    }
    if (typeof parsed?.content !== "string") {
      parsed.content = String(parsed?.content ?? "");
    }

    return NextResponse.json(
      {
        success: true,
        ...parsed,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
