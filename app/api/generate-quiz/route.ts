import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Ensure you have GOOGLE_API_KEY in your .env.local file
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GOOGLE_API_KEY is not set in the environment variables.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Using gemini-pro for now, can switch to flash if preferred after testing

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const subject = formData.get('subject');
    const difficulty = formData.get('difficulty'); // This will be a string from the frontend
    const numQuestions = formData.get('numQuestions');
    const pdfFile = formData.get('pdfFile') as File | null;

    if (!subject || !numQuestions) {
      return NextResponse.json({ error: 'Missing required form fields (subject or number of questions).' }, { status: 400 });
    }

    let extractedPdfText = '';
    if (pdfFile) {
      // 1. Extract text from PDF
      const arrayBuffer = await pdfFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = await (await import('pdf-parse')).default(buffer); // Dynamically import pdf-parse
      extractedPdfText = data.text;
    }

    // 2. Construct Prompt
    const difficultyText = parseFloat(difficulty as string) < 33 ? "Easy" : parseFloat(difficulty as string) < 66 ? "Medium" : "Hard";
    
    let prompt = `
      You are an expert quiz generator. Create a multiple-choice quiz based on the provided information.
      Subject: ${subject}
      Difficulty: ${difficultyText}
      Number of questions: ${numQuestions}
      Include a few 'trick' questions that require careful reading, but are not unfairly misleading.
      Format the output as a JSON array of question objects. Each question object should have:
      - 'questionText': The text of the question.
      - 'options': An array of 4 strings for multiple-choice options.
      - 'correctAnswer': The string of the correct option.
      Example: [
        {
          "questionText": "What is the capital of France?",
          "options": ["Berlin", "Madrid", "Paris", "Rome"],
          "correctAnswer": "Paris"
        }
      ]
    `;

    if (extractedPdfText) {
      prompt += `

      Text Content for Quiz Generation:
      \`\`\`
      ${extractedPdfText}
      \`\`\`
      `;
    } else {
      prompt += `

      Since no specific text content was provided, generate questions based on general knowledge for the given subject and difficulty.
      `;
    }

    // 3. Call Gemini AI Model
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // 4. Parse AI Response (expecting JSON)
    let generatedQuiz;
    try {
      // Attempt to clean and parse the JSON, as AI responses can sometimes include extra text
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        generatedQuiz = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback if the code block isn't present, try to parse directly
        generatedQuiz = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text, parseError);
      return NextResponse.json({ error: 'Failed to parse AI response. Generated text was not valid JSON.', aiResponse: text }, { status: 500 });
    }

    console.log('Generated Quiz:', generatedQuiz);

    // TODO: Save generatedQuiz to database if persistent storage is enabled

    return NextResponse.json({ message: 'Quiz generated successfully!', quiz: generatedQuiz }, { status: 200 });
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ error: 'Failed to generate quiz.', details: (error as Error).message }, { status: 500 });
  }
}
