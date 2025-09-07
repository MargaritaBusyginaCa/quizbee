"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { QuizForm, type QuizFormValues } from "@/components/QuizForm";
import PreviewQuestions from "@/components/PreviewQuestions";
import ScoreCard from "@/components/ScoreCard";

type QuizQuestion = {
  questionText: string;
  options: string[];
  correctAnswer: string;
};

const LS_QUIZ = "quizbeeEditQuestions";
const LS_FORM = "quizbeeLastForm";
const LS_TEXT = "quizbeeSourceText";

export default function Home() {
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(
    null
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isQuizComplete, setIsQuizComplete] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const hydrate = () => {
      try {
        const storedQuiz = localStorage.getItem(LS_QUIZ);
        if (storedQuiz) {
          const parsed = JSON.parse(storedQuiz);
          if (Array.isArray(parsed)) {
            setGeneratedQuiz(parsed);
            setGeneratedQuiz((prev) => {
              if (!prev) {
                setSelectedAnswers([]);
                setCurrentQuestionIndex(0);
              }
              return parsed;
            });
          }
        }
        const lf = localStorage.getItem(LS_FORM);
        if (lf) {
          const last = JSON.parse(lf);
          if (last?.subject) setSubject(String(last.subject));
        }
      } catch {}
    };

    hydrate();
    window.addEventListener("focus", hydrate);
    return () => window.removeEventListener("focus", hydrate);
  }, []);

  const persistAfterGenerate = (
    quiz: QuizQuestion[],
    values: QuizFormValues,
    sourceTextUsed?: string
  ) => {
    try {
      localStorage.setItem(LS_QUIZ, JSON.stringify(quiz));
      localStorage.setItem(
        LS_FORM,
        JSON.stringify({
          subject: values.subject,
          difficulty: values.difficulty,
          numberOfQuestions: values.numberOfQuestions,
        })
      );
      if (sourceTextUsed) localStorage.setItem(LS_TEXT, sourceTextUsed);
    } catch {}
  };

  const clearPersistence = () => {
    try {
      localStorage.removeItem(LS_QUIZ);
      localStorage.removeItem(LS_FORM);
      localStorage.removeItem(LS_TEXT);
    } catch {}
  };

  const handleGenerate = async (values: QuizFormValues) => {
    setIsLoading(true);
    setGeneratedQuiz(null);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setSubject(values.subject);

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
      persistAfterGenerate(data.quiz, values, data.sourceTextUsed);
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
    setFinalScore(score);
    setIsQuizComplete(true);
  };

  const handleDiscard = () => {
    setGeneratedQuiz(null);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setIsPreviewMode(false);
    clearPersistence();
  };

  const handleRetakeQuiz = () => {
    setIsQuizComplete(false);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setFinalScore(0);
  };

  const handleNewQuiz = () => {
    setGeneratedQuiz(null);
    setSelectedAnswers([]);
    setCurrentQuestionIndex(0);
    setIsQuizComplete(false);
    setFinalScore(0);
    clearPersistence();
  };

  const currentQuestion = generatedQuiz
    ? generatedQuiz[currentQuestionIndex]
    : null;
  const totalQuestions = generatedQuiz ? generatedQuiz.length : 0;

  return (
    <div className="container mx-auto p-12 max-w-4xl bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-8 text-center">
        Test your knowledge with QuizBee 🐝
      </h1>

      {!generatedQuiz && (
        <>
          {isLoading && (
            <div className="text-center text-xl text-black-600 mb-8">
              Generating your quiz...
            </div>
          )}
          <QuizForm onSubmit={handleGenerate} isSubmitting={isLoading} />
        </>
      )}

      {generatedQuiz && !isQuizComplete && (
        <div className="mt-8 space-y-6">
          <h2 className="text-xl font-bold text-center">Quiz: {subject}</h2>
          <div className="flex items-center justify-between">
            <div className="flex justify-center items-center gap-3 w-full">
              <Button
                variant={isPreviewMode ? "default" : "outline"}
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className="bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer"
              >
                {isPreviewMode ? "Take Quiz" : "Preview All"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleDiscard}
                className="bg-white border text-black hover:bg-[#e0d9b3] cursor-pointer"
              >
                Leave this quiz
              </Button>
            </div>
          </div>

          {isPreviewMode ? (
            <div className="space-y-4">
              <div className="text-center text-gray-600">
                Previewing all {generatedQuiz.length} questions
              </div>
              <PreviewQuestions questions={generatedQuiz} />
            </div>
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
                    className="bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer"
                  >
                    Previous
                  </Button>
                  {currentQuestionIndex < totalQuestions - 1 ? (
                    <Button
                      onClick={handleNextQuestion}
                      disabled={!selectedAnswers[currentQuestionIndex]}
                      className="bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer"
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitQuiz}
                      disabled={!selectedAnswers[currentQuestionIndex]}
                      className="bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer"
                    >
                      Submit Quiz
                    </Button>
                  )}
                </div>
              </>
            )
          )}

          <div className="text-center">
            <a
              href="/chat"
              className="text-black-600 hover:text-[#b38a19] hover:underline font-medium"
            >
              Modify this quiz →
            </a>
          </div>
        </div>
      )}

      {isQuizComplete && generatedQuiz && (
        <ScoreCard
          score={finalScore}
          total={generatedQuiz.length}
          subject={subject}
          onRetakeQuiz={handleRetakeQuiz}
          onNewQuiz={handleNewQuiz}
        />
      )}
    </div>
  );
}
