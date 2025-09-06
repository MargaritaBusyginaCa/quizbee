import { QuizForm } from "@/components/QuizForm";
import { Upload } from "@/components/Upload";

export default function Home() {
  return (
    <div className="w-full h-screen bg-rose-50 flex items-center justify-center">
      <div>
        <h1 className="py-3">Welcome to QuizBee 🐝</h1>
        <QuizForm />
        <div className="mt-8">
         <Upload />
        </div>
      </div>
    </div>
  );
}


