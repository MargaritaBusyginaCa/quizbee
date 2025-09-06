"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  quizPrompt: z
    .string()
    .min(2, { message: "Too short" })
    .max(100, { message: "Too long" }),
  numberOfQuestions: z.number().min(1).max(25),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export function QuizForm() {
  const questionOptions = [5, 10, 15, 20, 25];
  // Helper for mapping difficulty value to slider and vice versa
  function getSliderValue(difficulty: string) {
    if (difficulty === "easy") return 0;
    if (difficulty === "medium") return 50;
    return 100;
  }

  function handleSliderChange(field: any, value: number[]) {
    const v = value[0];
    if (v === 0) field.onChange("easy");
    else if (v === 50) field.onChange("medium");
    else field.onChange("hard");
  }
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
    // Save form values to localStorage
    try {
      localStorage.setItem("quizbeeFormValues", JSON.stringify(values));
    } catch (e) {
      console.error("Failed to save form values to localStorage", e);
    }
    console.log(values);
  }

  return (
    <div className="flex justify-center items-center">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 mx-auto w-[650px]"
        >
          <FormField
            control={form.control}
            name="quizPrompt"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="py-2">Quiz Prompt</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your quiz prompt"
                    {...field}
                    className=""
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="difficulty"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="py-2">Quiz Difficulty</FormLabel>
                <FormControl>
                  <div>
                    <Slider
                      value={[getSliderValue(field.value)]}
                      max={100}
                      step={50}
                      onValueChange={(value) =>
                        handleSliderChange(field, value)
                      }
                    />
                    <div className="flex justify-between mt-2 text-sm text-gray-500">
                      <span>Easy</span>
                      <span>Medium</span>
                      <span>Hard</span>
                    </div>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="numberOfQuestions"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="py-2">Number of Questions</FormLabel>
                <FormControl>
                  <Select>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Number of questions" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionOptions.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
