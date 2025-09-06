import { QuizForm } from "@/components/QuizForm";

export default function Home() {
  return (
    <div className="w-full h-screen flex items-center justify-center">
      <div>
        <h1 className="py-6">Welcome to QuizBee 🐝</h1>
        <QuizForm />
      </div>
    </div>
  );
}
