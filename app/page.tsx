"use client";

import { QuizForm } from "@/components/QuizForm";
import { ChatDialog } from "@/components/chatbox/ChatDialog";
import { useState } from "react";

export default function Home() {
  const [quizData, setQuizData] = useState(null);

  const handleQuizModification = (modification: any) => {
    console.log("Quiz modification requested:", modification);
    // Here you can implement logic to modify the quiz based on the chat command
    // For example, update form values, regenerate quiz, etc.
  };

  return (
    <div className="flex h-screen bg-rose-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-4xl">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">QuizBee</h1>
              <p className="text-lg text-gray-600">Create AI-powered quizzes with ease</p>
            </div>
            <QuizForm />
          </div>
        </div>
      </div>
      
      {/* Chat dialog sidebar */}
      <div className="w-96 h-full">
        <ChatDialog onQuizModification={handleQuizModification} />
      </div>
    </div>
  );
}
