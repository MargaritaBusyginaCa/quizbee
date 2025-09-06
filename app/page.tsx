"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QuizForm, type QuizFormValues } from "@/components/QuizForm";
import PreviewQuestions, {
  type PreviewQuestion as QuizQuestion,
} from "@/components/PreviewQuestions";

export default function Home() {
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(
    null
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [showPreview, setShowPreview] = useState(false); // NEW

  const handleGenerate = async (values: QuizFormValues) => {
    setIsLoading(true);
    setGeneratedQuiz(null);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setSubject(values.subject);
    setShowPreview(false); // reset preview on new generation

    const formData = new FormData();
    formData.append("subject", values.subject);
    formData.append("difficulty", values.difficulty);
    formData.append("numQuestions", String(values.numberOfQuestions));
    if (values.pdfFile instanceof File) {
      formData.append("pdfFile", values.pdfFile);
    }

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        body: formData,
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(raw.slice(0, 500));
      }

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate quiz.");
      }
      if (!Array.isArray(data.quiz)) {
        throw new Error("Invalid quiz format from API.");
      }
      setGeneratedQuiz(data.quiz);
      // Optional: auto-open preview after generation
      // setShowPreview(true);
    } catch (e: any) {
      alert(e?.message || "Failed to generate quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = (option: string) => {
    const next = [...selectedAnswers];
    next[currentQuestionIndex] = option;
    setSelectedAnswers(next);
  };

  const handleNextQuestion = () => {
    if (generatedQuiz && currentQuestionIndex < generatedQuiz.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex((i) => i - 1);
  };

  const handleSubmitQuiz = () => {
    if (!generatedQuiz) return;
    let score = 0;
    generatedQuiz.forEach((q, i) => {
      if (selectedAnswers[i] === q.correctAnswer) score++;
    });
    alert(
      `Quiz Submitted! Your score: ${score} out of ${generatedQuiz.length}`
    );
    setGeneratedQuiz(null);
    setShowPreview(false);
  };

  const currentQuestion = generatedQuiz
    ? generatedQuiz[currentQuestionIndex]
    : null;
  const totalQuestions = generatedQuiz ? generatedQuiz.length : 0;

  return (
    <div className="container mx-auto p-4 my-12 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Welcome to QuizBee 🐝
      </h1>

      {!generatedQuiz && (
        <>
          {isLoading && (
            <div className="text-center text-xl text-blue-600 mb-8">
              Generating your quiz...
            </div>
          )}
          <QuizForm onSubmit={handleGenerate} isSubmitting={isLoading} />
        </>
      )}

      {generatedQuiz && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Quiz: {subject}</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Hide Preview" : "Preview All"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  if (generatedQuiz) {
                    localStorage.setItem(
                      "quizbeeEditQuestions",
                      JSON.stringify(generatedQuiz)
                    );
                  }
                  window.location.href = "/chat";
                }}
              >
                Edit Quiz
              </Button>
            </div>
          </div>

          {showPreview ? (
            <PreviewQuestions questions={generatedQuiz} />
          ) : (
            currentQuestion && (
              <>
                <div className="text-center text-gray-600">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                  <p className="text-xl font-semibold mb-4">
                    {currentQuestion.questionText}
                  </p>
                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => (
                      <label key={idx} className="flex items-center">
                        <input
                          type="radio"
                          name="quiz-option"
                          value={option}
                          checked={
                            selectedAnswers[currentQuestionIndex] === option
                          }
                          onChange={() => handleAnswerSelect(option)}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-lg font-medium text-gray-800">
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <Button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                  >
                    Previous
                  </Button>
                  {currentQuestionIndex < totalQuestions - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!selectedAnswers[currentQuestionIndex]}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={!selectedAnswers[currentQuestionIndex]}
                    >
                      Submit Quiz
                    </Button>
                  )}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
