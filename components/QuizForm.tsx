"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React, { useState } from "react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Upload } from "lucide-react";

const formSchema = z.object({
  quizPrompt: z.string().min(2).max(100),
  numberOfQuestions: z.number().min(1).max(25),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export function QuizForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quizPrompt: "",
      numberOfQuestions: 5,
      difficulty: "easy",
    },
  });

  // 2. Define a submit handler.
  function onSubmit(values: z.infer<typeof formSchema>) {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    console.log(values);
  }

  return (
    <div className="flex justify-center items-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 w-fit mx-auto"
        >
          <FormField
            control={form.control}
            name="quizPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quiz Prompt</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your quiz prompt"
                    {...field}
                    className="w-fit"
                  />
                 <Upload className="cursor-pointer" /> 
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit">Submit</Button>
        </form>
      </Form>
    </div>
  );
}
