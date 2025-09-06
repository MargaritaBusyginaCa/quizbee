import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs"; // pdf-parse needs Node

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GOOGLE_API_KEY is not set in the environment variables.");
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const subject = formData.get("subject")?.toString();
    const difficultyRaw = formData.get("difficulty")?.toString() ?? "medium";
    const numQuestionsStr = formData.get("numQuestions")?.toString() ?? "10";
    const pdfFile = formData.get("pdfFile") as File | null;

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

    let extractedPdfText = "";
    if (pdfFile) {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = (await (await import("pdf-parse")).default(buffer)) as {
        text: string;
      };
      extractedPdfText = data.text;
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

    const prompt = `
You are an expert quiz generator. Create a multiple-choice quiz as pure JSON (no prose before or after).
Subject: ${subject}
Difficulty: ${difficultyText}
Number of questions: ${numQuestions}
Include a few fair 'trick' questions that require careful reading.
Return ONLY a JSON array of question objects with keys: "questionText", "options" (4 strings), "correctAnswer".
${
  extractedPdfText
    ? `Use ONLY the following source text:\n"""${extractedPdfText}"""`
    : `No source text provided. Use general knowledge for the subject and difficulty.`
}
    `.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to parse as JSON (with or without ```json fences)
    let generatedQuiz: unknown;
    try {
      const fenced = text.match(/```json\s*([\s\S]*?)```/i);
      generatedQuiz = JSON.parse(fenced ? fenced[1] : text);
    } catch (e) {
      return NextResponse.json(
        {
          error:
            "Failed to parse AI response. Generated text was not valid JSON.",
          aiResponse: text,
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(generatedQuiz)) {
      return NextResponse.json(
        {
          error: "Model did not return a JSON array of questions.",
          aiResponse: text,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Quiz generated successfully!", quiz: generatedQuiz },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error generating quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz.", details: error.message },
      { status: 500 }
    );
  }
}