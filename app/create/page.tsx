
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define the type for a quiz question
interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
}

export default function CreateQuizPage() {
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState([50]); // Default to medium
  const [numQuestions, setNumQuestions] = useState('10'); // Default 10 questions
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [generatedQuiz, setGeneratedQuiz] = useState<QuizQuestion[] | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject || !numQuestions) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsLoading(true); // Start loading
    setGeneratedQuiz(null); // Clear previous quiz
    setSelectedAnswers([]); // Clear previous answers
    setCurrentQuestionIndex(0); // Reset question index

    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('difficulty', difficulty[0].toString());
    formData.append('numQuestions', numQuestions);
    if (pdfFile) {
      formData.append('pdfFile', pdfFile);
    }

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Quiz generation successful:', result);
      if (result.quiz && Array.isArray(result.quiz)) {
        setGeneratedQuiz(result.quiz); // Store the generated quiz
        // alert('Quiz generation request sent successfully! Check console for quiz data.');
      } else {
        throw new Error('Invalid quiz format received from API.');
      }
    } catch (error: any) {
      console.error('Error submitting quiz request:', error);
      alert(`Failed to generate quiz: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      setIsLoading(false); // Stop loading
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
    }
  };

  const handleAnswerSelect = (option: string) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = option;
    setSelectedAnswers(newSelectedAnswers);
  };

  const handleNextQuestion = () => {
    if (generatedQuiz && currentQuestionIndex < generatedQuiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = () => {
    if (!generatedQuiz) return;
    // For now, just log the answers and show a simple score
    console.log('Submitted Answers:', selectedAnswers);
    
    let score = 0;
    generatedQuiz.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctAnswer) {
        score++;
      }
    });
    alert(`Quiz Submitted! Your score: ${score} out of ${generatedQuiz.length}`);
    setGeneratedQuiz(null); // Clear quiz after submission
  };

  const currentQuestion = generatedQuiz ? generatedQuiz[currentQuestionIndex] : null;
  const totalQuestions = generatedQuiz ? generatedQuiz.length : 0;

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Create New Quiz</h1>

      {isLoading && (
        <div className="text-center text-xl text-blue-600 mb-8">Generating your quiz... Please wait.</div>
      )}

      {!generatedQuiz && !isLoading && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="subject" className="text-lg">Subject / Topic</Label>
            <Input
              id="subject"
              type="text"
              placeholder="e.g., Biology, World History, JavaScript Fundamentals"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="difficulty" className="text-lg">Difficulty Level</Label>
            <Slider
              id="difficulty"
              min={0}
              max={100}
              step={1}
              value={difficulty}
              onValueChange={setDifficulty}
              className="mt-3 w-[80%] mx-auto"
            />
            <div className="flex justify-between text-sm mt-2">
              <span>Easy</span>
              <span>Medium</span>
              <span>Hard</span>
            </div>
          </div>

          <div>
            <Label htmlFor="numQuestions" className="text-lg">Number of Questions</Label>
            <Select value={numQuestions} onValueChange={setNumQuestions}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue placeholder="Select number of questions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pdfUpload" className="text-lg">Upload PDF/Syllabus</Label>
            <Input
              id="pdfUpload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
            {pdfFile && <p className="text-sm text-gray-600 mt-2">Selected file: {pdfFile.name}</p>}
          </div>

          <Button type="submit" className="w-full py-3 text-lg">Generate Quiz</Button>
        </form>
      )}

      {generatedQuiz && currentQuestion && (
        <div className="mt-8 space-y-6">
          <h2 className="text-3xl font-bold text-center">Quiz: {subject}</h2>
          <div className="text-center text-gray-600">Question {currentQuestionIndex + 1} of {totalQuestions}</div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-xl font-semibold mb-4">{currentQuestion.questionText}</p>
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="flex items-center">
                  <input
                    type="radio"
                    id={`option-${index}`}
                    name="quiz-option"
                    value={option}
                    checked={selectedAnswers[currentQuestionIndex] === option}
                    onChange={() => handleAnswerSelect(option)}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor={`option-${index}`} className="text-lg font-medium text-gray-800">{option}</label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <Button onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
              Previous
            </Button>
            {currentQuestionIndex < totalQuestions - 1 ? (
              <Button onClick={handleNextQuestion} disabled={!selectedAnswers[currentQuestionIndex]}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmitQuiz} disabled={!selectedAnswers[currentQuestionIndex]}>
                Submit Quiz
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
