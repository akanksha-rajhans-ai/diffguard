import { z } from "zod";

export const MAX_DIFF_CHARACTERS = 100_000;

export const analyzeRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Title must contain at least 3 characters.")
      .max(200, "Title must contain at most 200 characters."),

    description: z
      .string()
      .trim()
      .max(5_000, "Description must contain at most 5,000 characters.")
      .optional()
      .default(""),

    diff: z
      .string()
      .min(1, "A pull request diff is required.")
      .max(
        MAX_DIFF_CHARACTERS,
        "The diff is too large to analyze in this demo.",
      )
      .refine(
        (value) => value.trim().length > 0,
        "A pull request diff is required.",
      ),
  })
  .strict();

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;