import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    // System prompt for quiz modification assistant
    const systemPrompt = `You are a helpful quiz modification assistant. Your job is to understand user requests about modifying quizzes and provide helpful responses along with structured modification data when applicable.

When users ask to modify quizzes, you should:
1. Provide a conversational response explaining what you'll do
2. If the request involves specific modifications, include a "modification" object in your response

Common modification types:
- "add more questions" -> increase question count
- "make it harder/easier" -> change difficulty level
- "change topic" -> update quiz subject
- "fewer questions" -> decrease question count

For modification requests, respond with JSON in this format:
{
  "content": "Your conversational response here",
  "modification": {
    "type": "difficulty|count|topic|other",
    "action": "increase|decrease|change",
    "value": "new_value_if_applicable"
  }
}

For general conversation, just respond with:
{
  "content": "Your conversational response here"
}

User message: ${message}`;

    // Call Gemini API
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: systemPrompt
              }
            ]
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to get chat response' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const generatedContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'No response generated' },
        { status: 500 }
      );
    }

    // Try to parse as JSON, fallback to plain text response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(generatedContent);
    } catch {
      parsedResponse = {
        content: generatedContent
      };
    }

    return NextResponse.json({
      success: true,
      ...parsedResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
