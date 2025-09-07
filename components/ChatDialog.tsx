// components/ChatDialog.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Keep the shape local to avoid import cycles
type QuizQ = { questionText: string; options: string[]; correctAnswer: string };

export type ChatDialogProps = {
  // Called with the full payload returned from /api/chat
  onQuizModification?: (payload: any) => void | Promise<void>;

  // OPTIONAL: when provided, we’ll include {quiz, meta} in the /api/chat request
  getContext?: () => {
    quiz: QuizQ[] | null;
    meta: {
      subject?: string;
      difficulty?: string;
      numberOfQuestions?: number;
    } | null;
  };
};

export function ChatDialog({
  onQuizModification,
  getContext,
}: ChatDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    const msg = inputValue.trim();
    if (!msg) return;

    setBusy(true);
    try {
      const ctx = getContext ? getContext() : { quiz: null, meta: null };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          quiz: ctx.quiz, // <-- pass current quiz
          meta: ctx.meta, // <-- pass subject/difficulty/count
        }),
      });

      const data = await res.json();
      // forward model output to the page
      await onQuizModification?.(data);
      setInputValue("");
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full border-l bg-white flex flex-col">
      {/* Chat Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            💬 Chat with your AI assistant to modify your quiz
          </div>
          {/* Chat messages would go here */}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t bg-gray-50 flex gap-2">
        <Input
          placeholder="Ask to tweak the quiz…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={busy}
        />
        <Button onClick={send} disabled={busy}>
          Send
        </Button>
      </div>
    </div>
  );
}
