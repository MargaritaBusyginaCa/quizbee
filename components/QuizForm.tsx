"use client";

import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Slider } from "@/components/ui/slider";
import { BrainElectricity, BrightStar, Hashtag, Upload } from "iconoir-react";
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
  subject: z
    .string()
    .min(2, { message: "Too short" })
    .max(100, { message: "Too long" }),
  numberOfQuestions: z.coerce.number().min(1).max(25),
  difficulty: z.enum(["easy", "medium", "hard"]),
  pdfFile: z.instanceof(File).optional(),
});

export type QuizFormValues = z.infer<typeof formSchema>;

type Props = {
  defaultValues?: Partial<QuizFormValues>;
  onSubmit: (values: QuizFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
};

export function QuizForm({ defaultValues, onSubmit, isSubmitting }: Props) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: "",
      numberOfQuestions: 10,
      difficulty: "medium",
      ...defaultValues,
    },
  });

  const getSliderValue = (d: QuizFormValues["difficulty"]) =>
    d === "easy" ? 0 : d === "medium" ? 50 : 100;

  const setDifficultyFromSlider = (value: number[]) => {
    const v = value[0];
    form.setValue("difficulty", v < 33 ? "easy" : v < 66 ? "medium" : "hard", {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="py-2">
                <div className="p-1 bg-[#F8F7F2] rounded-sm ">
                  <BrainElectricity color="#b38a19" height={20} width={20} />
                </div>
                <span>Subject / Topic</span>
              </FormLabel>
              <FormControl>
                <Input placeholder="e.g., World History" {...field} />
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
              <FormLabel className="py-2">
                <div className="p-1 bg-[#F8F7F2] rounded-sm ">
                  <BrightStar color="#b38a19" height={20} width={20} />
                </div>
                Difficulty
              </FormLabel>
              <FormControl>
                <div>
                  <Slider
                    value={[getSliderValue(field.value)]}
                    max={100}
                    step={50}
                    onValueChange={setDifficultyFromSlider}
                    className="[&_[data-slot=slider-range]]:bg-[#b38a19]"
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
              <FormLabel className="py-2">
                <div className="p-1 bg-[#F8F7F2] rounded-sm ">
                  <Hashtag color="#b38a19" height={20} width={20} />
                </div>
                Number of Questions
              </FormLabel>
              <Select
                value={String(field.value)}
                onValueChange={(v) => field.onChange(Number(v))}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Number of questions" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[5, 10, 15, 20, 25].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pdfFile"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="py-2">
                <div className="p-1 bg-[#F8F7F2] rounded-sm ">
                  <Upload color="#b38a19" height={20} width={20} />
                </div>
                Upload PDF/Syllabus (optional)
              </FormLabel>
              <FormControl>
                <FileUpload
                  value={(field.value as File | null) ?? null}
                  onChange={(file) => field.onChange(file)}
                  accept=".pdf"
                  maxSizeMB={10}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#F8F7F2] text-black hover:bg-[#e0d9b3] cursor-pointer"
        >
          {isSubmitting ? "Generating..." : "Generate Quiz"}
        </Button>
      </form>
    </Form>
  );
}
