"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ScoreCardProps {
  score: number;
  total: number;
  subject: string;
  onRetakeQuiz: () => void;
  onNewQuiz: () => void;
}

export default function ScoreCard({
  score,
  total,
  subject,
  onRetakeQuiz,
  onNewQuiz,
}: ScoreCardProps) {
  const percentage = Math.round((score / total) * 100);

  const getScoreMessage = () => {
    if (percentage >= 90)
      return { message: "Excellent work! 🌟", color: "text-green-600" };
    if (percentage >= 80)
      return { message: "Great job! 👏", color: "text-green-500" };
    if (percentage >= 70)
      return { message: "Good effort! 👍", color: "text-blue-500" };
    if (percentage >= 60)
      return { message: "Not bad! 📚", color: "text-yellow-500" };
    return { message: "Keep practicing! 💪", color: "text-orange-500" };
  };

  const { message, color } = getScoreMessage();

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">Quiz Complete!</CardTitle>
          <p className="text-lg text-gray-600">Subject: {subject}</p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <div className="text-6xl font-bold text-blue-600">
              {score}/{total}
            </div>
            <div className="text-2xl font-semibold text-gray-700">
              {percentage}%
            </div>
            <div className={`text-xl font-medium ${color}`}>{message}</div>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-500 mb-4">
              You answered {score} out of {total} questions correctly
            </div>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={onRetakeQuiz}
                variant="outline"
                className="flex-1 max-w-[140px]"
              >
                Retake Quiz
              </Button>
              <Button onClick={onNewQuiz} className="flex-1 max-w-[140px]">
                New Quiz
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
