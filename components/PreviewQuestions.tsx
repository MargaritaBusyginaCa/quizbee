"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export interface PreviewQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
}

interface PreviewQuestionsProps {
  questions: PreviewQuestion[];
}

export default function PreviewQuestions({ questions }: PreviewQuestionsProps) {
  if (!questions || questions.length === 0) {
    return (
      <div className="text-center text-gray-500">No questions to preview.</div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {questions.map((q, idx) => (
        <Card key={idx} className="p-4 shadow-md">
          <div className="font-semibold mb-2">
            Q{idx + 1}: {q.questionText}
          </div>
          <ul className="mb-2 list-disc pl-6">
            {q.options.map((opt, i) => (
              <li key={i}>{opt}</li>
            ))}
          </ul>
          <div className="text-xs text-gray-400">
            Correct: {q.correctAnswer}
          </div>
        </Card>
      ))}
    </div>
  );
}
