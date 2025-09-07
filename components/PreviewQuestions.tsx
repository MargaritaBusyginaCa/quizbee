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
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      {questions.map((q, idx) => (
        <Card key={idx} className="p-6 shadow-md min-w-0">
          <div className="font-semibold mb-3 break-words">
            Q{idx + 1}: {q.questionText}
          </div>
          <ul className="mb-3 list-disc pl-6 space-y-1">
            {q.options.map((opt, i) => (
              <li key={i} className="break-words">
                {opt}
              </li>
            ))}
          </ul>
          <div className="text-xs text-gray-400 break-words">
            Correct: {q.correctAnswer}
          </div>
        </Card>
      ))}
    </div>
  );
}
