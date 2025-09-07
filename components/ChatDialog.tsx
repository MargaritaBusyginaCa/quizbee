"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type QuizQ = { questionText: string; options: string[]; correctAnswer: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export type ChatDialogProps = {
  onQuizModification?: (payload: any) => void | Promise<void>;

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const send = async () => {
    const msg = inputValue.trim();
    if (!msg) return;

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: msg,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setBusy(true);

    try {
      const ctx = getContext ? getContext() : { quiz: null, meta: null };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          quiz: ctx.quiz,
          meta: ctx.meta,
        }),
      });

      const data = await res.json();

      // Add assistant response to chat
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "I've updated your quiz!",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // forward model output to the page
      await onQuizModification?.(data);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full border-l bg-white flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-sm text-gray-600">
              💬 Chat with your AI assistant to modify your quiz
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="text-sm">{message.content}</div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === "user"
                        ? "text-blue-100"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg max-w-[80%]">
                <div className="text-sm">Thinking...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

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
