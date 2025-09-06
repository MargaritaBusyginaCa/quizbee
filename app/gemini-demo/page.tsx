"use client";
import { useState } from "react";

export default function GeminiDemo() {
  const [prompt, setPrompt] = useState(
    "Make a 1-sentence bedtime story about a unicorn."
  );
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
      <pre className="whitespace-pre-wrap border rounded p-3 min-h-24">
        {out}
      </pre>
    </main>
  );
}
