import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

import { GenerateCardsSchema } from "@/lib/schemas/ai.schema";
import { AIService } from "@/lib/services/ai.service";
import { QuotaService } from "@/lib/services/quota.service";
import { mapAIGeneratedCardToDTO, type GenerateCardsResponseDTO, type ApiErrorDTO } from "@/types";
import type { Database } from "@/db/database.types";

export const prerender = false;

/**
 * POST /api/ai/generate
 * Generates flashcards from provided text using AI
 *
 * Request body: { prompt: string }
 * Response: GenerateCardsResponseDTO with generated cards
 *
 * Rate limit: 15 generations per 24 hours
 * Authentication: Required (mock for now)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // ============================================================================
    // STEP 1: Authentication (MOCK - TODO: Replace with real auth)
    // ============================================================================
    // For mock auth, we need to use service role to bypass RLS
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceKey) {
      // eslint-disable-next-line no-console
      console.error("[MOCK AUTH] SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({
          error: "configuration_error",
          message: "Service role key not configured for mock auth",
        } as ApiErrorDTO),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create service role client (bypasses RLS)
    const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

    // Mock user for development
    const mockUserId = "00000000-0000-0000-0000-000000000001";
    const user = { id: mockUserId };

    // eslint-disable-next-line no-console
    console.log("[MOCK AUTH] Using mock user:", mockUserId);
    // eslint-disable-next-line no-console
    console.log("[MOCK AUTH] Using service role client to bypass RLS");

    // TODO: Replace with real authentication
    // const supabase = locals.supabase;
    // const { data: { user }, error: authError } = await supabase.auth.getUser();
    // if (authError || !user) {
    //   return new Response(
    //     JSON.stringify({
    //       error: "unauthorized",
    //       message: "Authentication required",
    //     } as ApiErrorDTO),
    //     { status: 401, headers: { "Content-Type": "application/json" } }
    //   );
    // }

    // ============================================================================
    // STEP 2: Validate request body
    // ============================================================================
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: "invalid_json",
          message: "Request body must be valid JSON",
        } as ApiErrorDTO),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const validation = GenerateCardsSchema.safeParse(body);

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: firstError.message,
          fields: validation.error.errors.map((e) => String(e.path[0])),
        } as ApiErrorDTO),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { prompt } = validation.data;

    // ============================================================================
    // STEP 3: Check quota (15 generations per 24 hours)
    // ============================================================================
    let quotaCheck;
    try {
      quotaCheck = await QuotaService.checkQuota(supabase, user.id);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Quota check failed:", error);
      return new Response(
        JSON.stringify({
          error: "internal_server_error",
          message: "Failed to check quota",
        } as ApiErrorDTO),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!quotaCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "quota_exceeded",
          message: "You have reached the limit of 15 generations per 24 hours",
          resetAt: quotaCheck.resetAt,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": quotaCheck.limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": quotaCheck.resetTimestamp.toString(),
            "Retry-After": quotaCheck.retryAfterSeconds.toString(),
          },
        }
      );
    }

    // ============================================================================
    // STEP 4: Generate flashcards using AI (mock data)
    // ============================================================================
    let aiResult;
    try {
      aiResult = await AIService.generateCards(prompt);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("AI generation failed:", error);

      // Record failed attempt
      await QuotaService.recordFailedAttempt(supabase, user.id, "ai_service_error");

      return new Response(
        JSON.stringify({
          error: "internal_server_error",
          message: "Failed to generate flashcards",
        } as ApiErrorDTO),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // ============================================================================
    // STEP 5: Save generation and cards to database
    // ============================================================================
    try {
      // Insert AI generation record
      const { data: generation, error: genError } = await supabase
        .from("ai_generations")
        .insert([
          {
            user_id: user.id,
            prompt: prompt,
            model: aiResult.model,
            raw_response: aiResult.rawResponse,
            status: "succeeded",
            completed_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (genError) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert generation:", genError);
        throw genError;
      }

      // Insert generated cards
      const cardsToInsert = aiResult.cards.map((card) => ({
        user_id: user.id,
        generation_id: generation.id,
        question: card.question.trim(),
        answer: card.answer.trim(),
        accepted: false,
      }));

      const { data: insertedCards, error: cardsError } = await supabase
        .from("ai_generated_cards")
        .insert(cardsToInsert)
        .select();

      if (cardsError) {
        // eslint-disable-next-line no-console
        console.error("Failed to insert cards:", cardsError);
        throw cardsError;
      }

      // Record successful attempt
      await QuotaService.recordSuccessfulAttempt(supabase, user.id, generation.id);

      // ============================================================================
      // STEP 6: Return response with rate limit headers
      // ============================================================================
      const response: GenerateCardsResponseDTO = {
        generationId: generation.id,
        status: "succeeded",
        cards: insertedCards.map(mapAIGeneratedCardToDTO),
        createdAt: generation.created_at,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": quotaCheck.limit.toString(),
          "X-RateLimit-Remaining": quotaCheck.remaining.toString(),
          "X-RateLimit-Reset": quotaCheck.resetTimestamp.toString(),
        },
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Database operation failed:", error);

      // Record failed attempt
      await QuotaService.recordFailedAttempt(supabase, user.id, "database_error");

      return new Response(
        JSON.stringify({
          error: "internal_server_error",
          message: "An unexpected error occurred",
        } as ApiErrorDTO),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in generate endpoint:", error);

    return new Response(
      JSON.stringify({
        error: "internal_server_error",
        message: "An unexpected error occurred",
      } as ApiErrorDTO),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
