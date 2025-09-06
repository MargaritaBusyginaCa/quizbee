import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs"; // pdf-parse needs Node

// ---- Tuning ----
const MAX_CHARS_SINGLE_PROMPT = 180_000; // safe margin for one-shot
const CHUNK_SIZE = 60_000; // ~60k chars per chunk
const MAX_PDF_MB = 25; // reject super-large uploads

// ---- Helpers ----
function cleanText(t: string) {
  return t
    .replace(/\u0000/g, "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
function chunkText(t: string, size = CHUNK_SIZE) {
  const chunks: string[] = [];
  for (let i = 0; i < t.length; i += size) chunks.push(t.slice(i, i + size));
  return chunks;
}
function parseQuizJson(text: string) {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  return JSON.parse(fenced ? fenced[1] : text);
}
function basePrompt({
  subject,
  difficultyText,
  numQuestions,
  sourceText,
  perChunkCap,
  part,
  total,
}: {
  subject: string;
  difficultyText: "Easy" | "Medium" | "Hard";
  numQuestions: number;
  sourceText?: string;
  perChunkCap?: number;
  part?: number;
  total?: number;
}) {
  return `
You are an expert quiz generator. Create a multiple-choice quiz as pure JSON (no prose before or after).
Subject: ${subject}
Difficulty: ${difficultyText}
Number of questions: ${numQuestions}
Include a few fair 'trick' questions that require careful reading.
Return ONLY a JSON array of question objects with keys: "questionText", "options" (4 strings), "correctAnswer".
${
  sourceText
    ? `Use ONLY the following source text${
        part && total ? ` (part ${part}/${total})` : ""
      }:\n"""${sourceText}"""`
    : `No source text provided. Use general knowledge for the subject and difficulty.`
}
${perChunkCap ? `Generate up to ${perChunkCap} questions for this part.` : ""}
`.trim();
}

// ---- Model ----
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in the environment variables.");
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

// Centralized call: use string prompt; parse JSON; fall back to fenced JSON
async function callModelJSON(prompt: string) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  try {
    return JSON.parse(text);
  } catch {
    return parseQuizJson(text);
  }
}

// ---- Route ----
export async function POST(request: NextRequest) {
  try {
    let subject = "";
    let difficultyRaw = "medium";
    let numQuestionsStr = "10";
    let pdfFile: File | null = null;
    let extractedPdfText = "";

    // Prefer multipart/form-data; fall back to JSON
    let isFormData = false;
    try {
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("multipart/form-data")) {
        isFormData = true;
        const formData = await request.formData();
        subject = formData.get("subject")?.toString() || "";
        difficultyRaw = formData.get("difficulty")?.toString() || "medium";
        numQuestionsStr = formData.get("numQuestions")?.toString() || "10";
        pdfFile = formData.get("pdfFile") as File | null;
      }
    } catch {
      // ignore and try JSON
    }

    if (!isFormData) {
      const body = await request.json().catch(() => ({}));
      subject = body.subject || subject;
      difficultyRaw = body.difficulty || difficultyRaw;
      numQuestionsStr = String(body.numQuestions || numQuestionsStr);
    }

    if (!subject || !numQuestionsStr) {
      return NextResponse.json(
        {
          error:
            "Missing required form fields (subject or number of questions).",
        },
        { status: 400 }
      );
    }

    const numQuestions = parseInt(numQuestionsStr, 10);

    // Basic guards
    if (pdfFile) {
      const mb = pdfFile.size / (1024 * 1024);
      if (mb > MAX_PDF_MB) {
        return NextResponse.json(
          {
            error: `PDF is too large (${mb.toFixed(
              1
            )}MB). Max ${MAX_PDF_MB}MB.`,
          },
          { status: 413 }
        );
      }
      if (pdfFile.type && pdfFile.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are supported." },
          { status: 400 }
        );
      }
    }

    // Extract text
    if (pdfFile) {
      try {
        // IMPORTANT: import the real parser to avoid pdf-parse debug mode
        const { default: pdfParse } = await import(
          "pdf-parse/lib/pdf-parse.js"
        );
        const arrayBuffer = await pdfFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const data = (await pdfParse(buffer)) as { text: string };
        extractedPdfText = data.text || "";
      } catch (err: any) {
        return NextResponse.json(
          {
            error: "Failed to read PDF.",
            details: err?.message || String(err),
          },
          { status: 400 }
        );
      }
    }

    // normalize difficulty
    let difficultyText: "Easy" | "Medium" | "Hard";
    if (["easy", "medium", "hard"].includes(difficultyRaw)) {
      difficultyText = (difficultyRaw[0].toUpperCase() +
        difficultyRaw.slice(1)) as "Easy" | "Medium" | "Hard";
    } else {
      const n = Number(difficultyRaw);
      difficultyText = n < 33 ? "Easy" : n < 66 ? "Medium" : "Hard";
    }

    // ---- Generation (single or chunked) ----
    let quizItems: any[] = [];

    if (extractedPdfText) {
      const cleaned = cleanText(extractedPdfText);

      if (cleaned.length <= MAX_CHARS_SINGLE_PROMPT) {
        const prompt = basePrompt({
          subject,
          difficultyText,
          numQuestions,
          sourceText: cleaned,
        });
        const parsed = await callModelJSON(prompt);
        if (!Array.isArray(parsed))
          throw new Error("Model did not return an array.");
        quizItems = parsed;
      } else {
        const chunks = chunkText(cleaned);
        const perChunkCap = Math.max(
          1,
          Math.ceil(numQuestions / chunks.length)
        );

        const results = await Promise.all(
          chunks.map(async (chunk, i) => {
            const prompt = basePrompt({
              subject,
              difficultyText,
              numQuestions,
              sourceText: chunk,
              perChunkCap,
              part: i + 1,
              total: chunks.length,
            });
            try {
              const arr = await callModelJSON(prompt);
              return Array.isArray(arr) ? arr : [];
            } catch {
              return [];
            }
          })
        );

        const seen = new Set<string>();
        for (const arr of results) {
          for (const q of arr) {
            const key =
              typeof q?.questionText === "string"
                ? q.questionText.trim().replace(/\s+/g, " ").toLowerCase()
                : "";
            if (key && !seen.has(key)) {
              seen.add(key);
              quizItems.push(q);
            }
          }
        }

        if (quizItems.length > numQuestions) {
          quizItems = quizItems.slice(0, numQuestions);
        }

        if (quizItems.length < numQuestions) {
          const remaining = numQuestions - quizItems.length;
          const fallbackPrompt = basePrompt({
            subject,
            difficultyText,
            numQuestions: remaining,
          });
          try {
            const extra = await callModelJSON(fallbackPrompt);
            if (Array.isArray(extra)) {
              for (const q of extra) {
                if (quizItems.length >= numQuestions) break;
                const key =
                  typeof q?.questionText === "string"
                    ? q.questionText.trim().replace(/\s+/g, " ").toLowerCase()
                    : "";
                if (!key) continue;
                if (
                  !quizItems.find(
                    (x) => (x.questionText || "").toLowerCase().trim() === key
                  )
                ) {
                  quizItems.push(q);
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }
    } else {
      const prompt = basePrompt({ subject, difficultyText, numQuestions });
      const parsed = await callModelJSON(prompt);
      if (!Array.isArray(parsed))
        throw new Error("Model did not return an array.");
      quizItems = parsed;
    }

    if (!Array.isArray(quizItems) || quizItems.length === 0) {
      return NextResponse.json(
        { error: "Model returned no questions." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Quiz generated successfully!", quiz: quizItems },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      {
        error: "Failed to generate quiz.",
        details: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
