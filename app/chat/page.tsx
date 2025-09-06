"use client";

import { ChatDialog } from "@/components/ChatDialog";
import { useState } from "react";

export default function ChatPage() {
  const handleQuizModification = (modification: any) => {
    console.log("Quiz modification requested:", modification);
    // Here you can implement logic to modify the quiz based on the chat command
    // For example, update form values, regenerate quiz, etc.
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
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

        {/* Main content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Welcome to QuizBee Chat
            </h2>
            <p className="text-gray-600 max-w-md">
              Use the chat panel on the right to interact with your AI quiz assistant. 
              Ask questions about creating, modifying, or improving your quizzes.
            </p>
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
