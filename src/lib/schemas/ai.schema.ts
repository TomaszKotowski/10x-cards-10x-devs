import { z } from "zod";

/**
 * Validation schema for AI card generation request
 * Enforces prompt length constraints (1-10,000 characters after trimming)
 */
export const GenerateCardsSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt cannot be empty").max(10000, "Prompt cannot exceed 10,000 characters"),
});

export type GenerateCardsInput = z.infer<typeof GenerateCardsSchema>;
