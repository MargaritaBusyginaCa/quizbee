"use client";
import { useState } from "react";

export default function GeminiDemo() {
  let quizFormValues = null;
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("quizbeeFormValues");
    if (stored) quizFormValues = JSON.parse(stored);
  }

  const defaultPrompt = quizFormValues
    ? `Create a quiz with the following settings:\nPrompt: ${quizFormValues.quizPrompt}\nDifficulty: ${quizFormValues.difficulty}\nNumber of Questions: ${quizFormValues.numberOfQuestions}`
    : "Make a 1-sentence bedtime story about a unicorn.";

  const [prompt, setPrompt] = useState(defaultPrompt);
  const [out, setOut] = useState("");
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setOut("");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      setOut(data.text ?? data.error ?? "No output");
    } catch (e: any) {
      setOut(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">Gemini demo</h1>
      <textarea
        className="w-full border rounded p-3"
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={run}
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? "Running…" : "Run"}
      </button>
      <h2 className="font-semibold mt-6">QuizForm values from localStorage:</h2>
      <pre className="whitespace-pre-wrap border rounded p-3 min-h-24">
        {quizFormValues
          ? JSON.stringify(quizFormValues, null, 2)
          : "No QuizForm values found in localStorage."}
      </pre>
      <h2 className="font-semibold mt-6">AI Output:</h2>
      <pre className="whitespace-pre-wrap border rounded p-3 min-h-24">
        {out}
      </pre>
    </main>
  );
}
