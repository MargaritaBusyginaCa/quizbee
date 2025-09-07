// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set.");
}
const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as any));
    const message: string = body?.message;
    const meta = body?.meta ?? body?.context ?? null;
    const quiz: QuizQ[] | null = shortenQuiz(body?.quiz, 20);

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required and must be a string" },
        { status: 400 }
      );
    }

    const prompt = `
You are a quiz-modification assistant. Analyze the user's request carefully.

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
    "subtopic": "..."        // CRITICAL: When adding questions, extract the EXACT specific topic/subject the user mentioned
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

CRITICAL INSTRUCTIONS:
- When user says "add questions about X" or "add a question about Y", set type="append" and put the exact topic X or Y in "subtopic"
- Examples: 
  * "add questions about photosynthesis" → type="append", subtopic="photosynthesis"
  * "add a question about World War 2" → type="append", subtopic="World War 2"  
  * "add more chemistry questions" → type="append", subtopic="chemistry"
- Each "options" array must have exactly 4 strings and one "correctAnswer" that matches one option.
- Use "patches" for editing specific questions; use "modification" for topic/difficulty/count changes; use "quiz" for complete rewrites.
`.trim();

    const resp = await model.generateContent(prompt);
    const text = resp.response.text();

    let parsed: any;
    try {
      parsed = fenceOrDirectParse(text);
    } catch {
      parsed = { content: text };
    }

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
