"use client";

import { ChatDialog } from "@/components/ChatDialog";
import { useState, useEffect, useCallback } from "react";
import PreviewQuestions, {
  type PreviewQuestion,
} from "@/components/PreviewQuestions";

type ModPlan =
  | {
      type: "difficulty" | "topic" | "count" | "append" | "other";
      action?: "increase" | "decrease" | "change";
      value?: any;
      // append specifics
      count?: number;
      subtopic?: string;
    }
  | Record<string, any>;

type Patch =
  | {
      op: "replace";
      index: number;
      question: PreviewQuestion;
    }
  | {
      op: "update";
      index: number;
      question: Partial<PreviewQuestion>;
    }
  | {
      op: "delete";
      index: number;
    }
  | {
      op: "insertAfter" | "insertBefore";
      index: number;
      question: PreviewQuestion;
    };

const LS_QUIZ = "quizbeeEditQuestions";
const LS_FORM = "quizbeeLastForm";
const LS_TEXT = "quizbeeSourceText";

export default function ChatPage() {
  const [editQuestions, setEditQuestions] = useState<PreviewQuestion[]>([]);
  const [lastForm, setLastForm] = useState<null | {
    subject: string;
    difficulty: "easy" | "medium" | "hard" | string;
    numberOfQuestions: number;
  }>(null);
  const [sourceText, setSourceText] = useState<string>("");

  // --- boot: load quiz + params from localStorage ---
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_QUIZ);
      if (stored) setEditQuestions(JSON.parse(stored));

      const lf = localStorage.getItem(LS_FORM);
      if (lf) setLastForm(JSON.parse(lf));

      const st = localStorage.getItem(LS_TEXT);
      if (st) setSourceText(st);
    } catch {
      // ignore
    }
  }, []);

  // --- utils ---
  const persistQuiz = (quiz: PreviewQuestion[]) => {
    try {
      localStorage.setItem(LS_QUIZ, JSON.stringify(quiz));
    } catch {}
  };
  const persistForm = (form: {
    subject: string;
    difficulty: string;
    numberOfQuestions: number;
  }) => {
    try {
      localStorage.setItem(LS_FORM, JSON.stringify(form));
    } catch {}
  };
  const persistSourceText = (text?: string) => {
    if (!text) return;
    try {
      localStorage.setItem(LS_TEXT, text);
    } catch {}
  };

  const applyReplacementQuiz = useCallback((quiz: PreviewQuestion[]) => {
    setEditQuestions(quiz);
    persistQuiz(quiz);
  }, []);

  const normalizeKey = (q: PreviewQuestion) =>
    (q?.questionText || "").trim().replace(/\s+/g, " ").toLowerCase();

  const mergeAppend = (
    base: PreviewQuestion[],
    extra: PreviewQuestion[],
    desiredTotal?: number
  ) => {
    const seen = new Set(base.map(normalizeKey));
    const merged: PreviewQuestion[] = [...base];
    for (const q of extra) {
      const key = normalizeKey(q);
      if (key && !seen.has(key)) {
        merged.push(q);
        seen.add(key);
      }
      if (desiredTotal && merged.length >= desiredTotal) break;
    }
    return merged;
  };

  const applyPatches = useCallback(
    (patches: Patch[]) => {
      if (!Array.isArray(patches) || patches.length === 0) return;
      setEditQuestions((prev) => {
        let next = [...prev];
        for (const p of patches) {
          if (p.op === "delete") {
            if (p.index >= 0 && p.index < next.length) {
              next = next.toSpliced(p.index, 1);
            }
          } else if (p.op === "replace" && "question" in p) {
            if (p.index >= 0 && p.index < next.length) {
              next = next.toSpliced(p.index, 1, p.question);
            }
          } else if (p.op === "update" && "question" in p) {
            if (p.index >= 0 && p.index < next.length) {
              next = next.toSpliced(p.index, 1, {
                ...next[p.index],
                ...p.question,
              });
            }
          } else if (
            (p.op === "insertAfter" || p.op === "insertBefore") &&
            "question" in p
          ) {
            const pos =
              p.op === "insertAfter" ? p.index + 1 : Math.max(0, p.index);
            if (pos >= 0 && pos <= next.length) {
              next = next.toSpliced(pos, 0, p.question);
            }
          }
        }
        persistQuiz(next);
        return next;
      });
    },
    [setEditQuestions]
  );

  // --- regenerate according to a "plan" from the model ---
  const regenerateWithPlan = useCallback(
    async (plan: ModPlan) => {
      if (!lastForm) return;

      const currentLen = editQuestions.length;
      let subject = lastForm.subject;
      let difficulty = lastForm.difficulty;
      let desiredCount = lastForm.numberOfQuestions;

      if (plan.type === "difficulty" && typeof plan.value === "string") {
        difficulty = plan.value.toLowerCase();
      }
      if (plan.type === "topic" && plan.value) {
        subject = String(plan.value);
      }

      // count change — explicit new total
      if (plan.type === "count" && Number.isFinite(Number(plan.value))) {
        desiredCount = Number(plan.value);
      }

      // append N more (keeps existing, adds new)
      if (plan.type === "append" && Number.isFinite(Number(plan.count))) {
        desiredCount = currentLen + Number(plan.count);
      }

      // branch behaviors
      if (desiredCount > currentLen) {
        // append diff more
        const remaining = desiredCount - currentLen;

        const body = {
          subject,
          difficulty,
          numQuestions: remaining, // generate only the delta
          ...(sourceText ? { sourceText } : {}),
        };

        const res = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const raw = await res.text();
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(raw.slice(0, 500));
        }
        if (!res.ok) throw new Error(data?.error || "Failed to append");

        const extra: PreviewQuestion[] = Array.isArray(data.quiz)
          ? data.quiz
          : [];
        const merged = mergeAppend(editQuestions, extra, desiredCount);
        applyReplacementQuiz(merged);

        // persist form & source text
        const nextForm = {
          subject,
          difficulty,
          numberOfQuestions: desiredCount,
        };
        setLastForm(nextForm);
        persistForm(nextForm);
        persistSourceText(data.sourceTextUsed);
        setSourceText((s) => data.sourceTextUsed || s);
        return;
      }

      if (desiredCount < currentLen) {
        // just slice down; keep easiest behavior local
        const trimmed = editQuestions.slice(0, desiredCount);
        applyReplacementQuiz(trimmed);
        const nextForm = {
          subject,
          difficulty,
          numberOfQuestions: desiredCount,
        };
        setLastForm(nextForm);
        persistForm(nextForm);
        return;
      }

      // same count but difficulty/topic changed -> full regenerate
      if (
        plan.type === "difficulty" ||
        plan.type === "topic" ||
        plan.type === "other"
      ) {
        const body = {
          subject,
          difficulty,
          numQuestions: desiredCount,
          ...(sourceText ? { sourceText } : {}),
        };

        const res = await fetch("/api/generate-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const raw = await res.text();
        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          throw new Error(raw.slice(0, 500));
        }
        if (!res.ok) throw new Error(data?.error || "Failed to regenerate");

        const quiz: PreviewQuestion[] = Array.isArray(data.quiz)
          ? data.quiz
          : [];
        applyReplacementQuiz(quiz);

        const nextForm = {
          subject,
          difficulty,
          numberOfQuestions: desiredCount,
        };
        setLastForm(nextForm);
        persistForm(nextForm);
        persistSourceText(data.sourceTextUsed);
        setSourceText((s) => data.sourceTextUsed || s);
      }
    },
    [editQuestions, lastForm, sourceText, applyReplacementQuiz]
  );

  // --- called by ChatDialog after it hits /api/chat ---
  const handleQuizModification = async (payload: any) => {
    // 1) apply full replacement quiz, if provided
    if (payload?.quiz && Array.isArray(payload.quiz)) {
      applyReplacementQuiz(payload.quiz as PreviewQuestion[]);
    }

    // 2) apply in-place patches, if provided
    if (payload?.patches && Array.isArray(payload.patches)) {
      applyPatches(payload.patches as Patch[]);
    }

    // 3) execute a plan (harder/easier/topic/change count/append)
    if (payload?.modification) {
      await regenerateWithPlan(payload.modification as ModPlan);
    }
  };

  // Context for the ChatDialog to send along with the message
  const getContext = useCallback(() => {
    return {
      quiz: editQuestions,
      meta: lastForm
        ? {
            subject: lastForm.subject,
            difficulty: lastForm.difficulty,
            numberOfQuestions: lastForm.numberOfQuestions,
          }
        : null,
    };
  }, [editQuestions, lastForm]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">QuizBee Chat</h1>
              <p className="text-gray-600">Chat with your AI quiz assistant</p>
            </div>
            <a
              href="/"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Quiz
            </a>
          </div>
        </div>

        <div className="flex-1 overflow-auto max-h-[calc(100vh-80px)] p-8 flex flex-col items-center">
          {editQuestions && editQuestions.length > 0 ? (
            <PreviewQuestions questions={editQuestions} />
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Welcome to QuizBee Chat
              </h2>
              <p className="text-gray-600 max-w-md">
                Use the chat panel on the right to interact with your AI quiz
                assistant.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Chat dialog sidebar */}
      <div className="w-96 h-full">
        <ChatDialog
          getContext={getContext} // let it send quiz + meta
          onQuizModification={handleQuizModification} // handle model output
        />
      </div>
    </div>
  );
}
