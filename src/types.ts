/**
 * Shared TypeScript types for backend and frontend
 * This file contains:
 * - Database entity types derived from Supabase schema
 * - Command Models (Request DTOs) for API endpoints
 * - Response DTOs for API responses
 * - Helper types and utilities
 */

import type { Tables, TablesInsert, Enums } from "./db/database.types";

// ============================================================================
// HELPER TYPES
// ============================================================================

// Note: Helper types for snake_case to camelCase conversion are defined here
// but actual conversion is done manually in mapper functions for better type safety

// ============================================================================
// DATABASE ENTITY TYPES (Raw from Supabase)
// ============================================================================

export type Deck = Tables<"decks">;
export type Card = Tables<"cards">;
export type StudySession = Tables<"study_sessions">;
export type CardReview = Tables<"card_reviews">;
export type AIGeneration = Tables<"ai_generations">;
export type AIGeneratedCard = Tables<"ai_generated_cards">;
export type AIGenerationAttempt = Tables<"ai_generation_attempts">;
export type CardIssueReport = Tables<"card_issue_reports">;
export type DeckStats = Tables<"deck_stats">;

export type DeckInsert = TablesInsert<"decks">;
export type CardInsert = TablesInsert<"cards">;
export type StudySessionInsert = TablesInsert<"study_sessions">;
export type CardReviewInsert = TablesInsert<"card_reviews">;
export type AIGenerationInsert = TablesInsert<"ai_generations">;
export type AIGeneratedCardInsert = TablesInsert<"ai_generated_cards">;
export type CardIssueReportInsert = TablesInsert<"card_issue_reports">;

export type CardReviewResult = Enums<"card_review_result">;

// ============================================================================
// COMMAND MODELS (Request DTOs)
// ============================================================================

// --- AI Generation Commands ---

/**
 * Command to generate flashcards from text using AI
 * Derived from: API endpoint POST /api/ai/generate
 */
export interface GenerateCardsCommand {
  prompt: string; // Max 10,000 characters
}

/**
 * Command to edit an AI-generated card before acceptance
 * Derived from: API endpoint PATCH /api/ai/generated-cards/:cardId
 */
export interface EditGeneratedCardCommand {
  question?: string;
  answer?: string;
}

/**
 * Command to accept selected AI-generated cards and create a new deck
 * Derived from: API endpoint POST /api/ai/generations/:generationId/accept
 */
export interface AcceptGeneratedCardsCommand {
  deckName: string;
  deckDescription?: string;
  acceptedCardIds: string[];
}

// --- Deck Commands ---

/**
 * Command to create a new deck
 * Derived from: DeckInsert (decks table)
 */
export interface CreateDeckCommand {
  name: string;
  description?: string;
}

/**
 * Command to update an existing deck
 * Derived from: DeckInsert (decks table)
 */
export interface UpdateDeckCommand {
  name?: string;
  description?: string;
}

// --- Card Commands ---

/**
 * Command to create a new manual card in a deck
 * Derived from: CardInsert (cards table)
 */
export interface CreateCardCommand {
  question: string;
  answer: string;
}

/**
 * Command to update an existing card
 * Derived from: CardInsert (cards table)
 * Note: Resets learning progress (leitner_box=1, due_at=now)
 */
export interface UpdateCardCommand {
  question?: string;
  answer?: string;
}

// --- Study Session Commands ---

/**
 * Command to submit a card review during a study session
 * Derived from: CardReviewInsert (card_reviews table)
 */
export interface SubmitReviewCommand {
  cardId: string;
  result: CardReviewResult;
  responseDurationMs?: number;
}

// --- Card Issue Commands ---

/**
 * Command to report an issue with a card
 * Derived from: CardIssueReportInsert (card_issue_reports table)
 */
export interface CreateCardIssueCommand {
  description: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

// --- AI Generation Response DTOs ---

/**
 * DTO for AI generation quota information
 * Derived from: API endpoint GET /api/ai/quota
 */
export interface QuotaDTO {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string; // ISO 8601 timestamp
}

/**
 * DTO for an AI-generated card
 * Derived from: AIGeneratedCard (ai_generated_cards table)
 */
export interface AIGeneratedCardDTO {
  id: string;
  question: string;
  answer: string;
  accepted: boolean;
  createdAt?: string; // ISO 8601 timestamp
}

/**
 * Response DTO for card generation request
 * Derived from: API endpoint POST /api/ai/generate
 */
export interface GenerateCardsResponseDTO {
  generationId: string;
  status: "succeeded" | "failed";
  cards: AIGeneratedCardDTO[];
  createdAt: string; // ISO 8601 timestamp
}

/**
 * Response DTO for getting generated cards
 * Derived from: API endpoint GET /api/ai/generations/:generationId/cards
 */
export interface GetGeneratedCardsResponseDTO {
  generationId: string;
  cards: AIGeneratedCardDTO[];
}

/**
 * Response DTO for editing a generated card
 * Derived from: API endpoint PATCH /api/ai/generated-cards/:cardId
 */
export interface EditGeneratedCardResponseDTO {
  id: string;
  question: string;
  answer: string;
  accepted: boolean;
}

/**
 * Response DTO for accepting generated cards and creating a deck
 * Derived from: API endpoint POST /api/ai/generations/:generationId/accept
 */
export interface AcceptGeneratedCardsResponseDTO {
  deck: DeckWithStatsDTO;
  acceptedCount: number;
}

// --- Deck Response DTOs ---

/**
 * DTO for basic deck information with camelCase keys
 * Derived from: Deck (decks table)
 */
export interface DeckDTO {
  id: string;
  name: string;
  description: string | null;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * DTO for deck with statistics
 * Derived from: Deck + DeckStats (decks + deck_stats tables)
 */
export interface DeckWithStatsDTO extends DeckDTO {
  cardsTotal: number;
  dueCount: number;
}

/**
 * Response DTO for listing decks
 * Derived from: API endpoint GET /api/decks
 */
export interface ListDecksResponseDTO {
  decks: DeckWithStatsDTO[];
  pagination: PaginationDTO;
}

/**
 * Response DTO for updating a deck
 * Derived from: API endpoint PATCH /api/decks/:deckId
 */
export interface UpdateDeckResponseDTO {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string; // ISO 8601 timestamp
}

// --- Card Response DTOs ---

/**
 * DTO for card information with camelCase keys
 * Derived from: Card (cards table)
 */
export interface CardDTO {
  id: string;
  question: string;
  answer: string;
  origin: "manual" | "ai"; // "manual" | "ai"
  leitnerBox: number; // 1-3
  dueAt: string; // ISO 8601 timestamp
  lastReviewedAt: string | null; // ISO 8601 timestamp
  createdAt: string; // ISO 8601 timestamp
  updatedAt?: string; // ISO 8601 timestamp
}

/**
 * Response DTO for listing cards in a deck
 * Derived from: API endpoint GET /api/decks/:deckId/cards
 */
export interface ListCardsResponseDTO {
  cards: CardDTO[];
  pagination: PaginationDTO;
}

/**
 * Response DTO for updating a card
 * Derived from: API endpoint PATCH /api/cards/:cardId
 */
export interface UpdateCardResponseDTO {
  id: string;
  question: string;
  answer: string;
  leitnerBox: number;
  dueAt: string; // ISO 8601 timestamp
  lastReviewedAt: string | null; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// --- Study Session Response DTOs ---

/**
 * Response DTO for starting a study session
 * Derived from: API endpoint POST /api/decks/:deckId/study-sessions
 */
export interface StartStudySessionResponseDTO {
  sessionId: string;
  deckId: string;
  startedAt: string; // ISO 8601 timestamp
  dueCardsCount: number;
}

/**
 * DTO for study session with camelCase keys
 * Derived from: StudySession (study_sessions table)
 */
export interface StudySessionDTO {
  id: string;
  deckId: string;
  startedAt: string; // ISO 8601 timestamp
  endedAt: string | null; // ISO 8601 timestamp
  cardsReviewed: number;
  knowCount: number;
  dontKnowCount: number;
}

/**
 * DTO for a card in study context (limited fields)
 * Derived from: Card (cards table) - subset of fields
 */
export interface StudyCardDTO {
  id: string;
  question: string;
  answer: string;
  leitnerBox: number;
  dueAt: string; // ISO 8601 timestamp
}

/**
 * Response DTO for getting due cards in a session
 * Derived from: API endpoint GET /api/study-sessions/:sessionId/cards
 */
export interface GetDueCardsResponseDTO {
  cards: StudyCardDTO[];
  remaining: number;
}

/**
 * Response DTO for submitting a card review
 * Derived from: API endpoint POST /api/study-sessions/:sessionId/reviews
 */
export interface SubmitReviewResponseDTO {
  reviewId: string;
  cardId: string;
  result: CardReviewResult;
  previousBox: number;
  newBox: number;
  newDueAt: string; // ISO 8601 timestamp
  reviewedAt: string; // ISO 8601 timestamp
}

/**
 * Response DTO for ending a study session
 * Derived from: API endpoint PATCH /api/study-sessions/:sessionId/end
 */
export interface EndSessionResponseDTO extends StudySessionDTO {
  durationSeconds: number;
}

// --- Card Issue Report Response DTOs ---

/**
 * DTO for card issue report with camelCase keys
 * Derived from: CardIssueReport (card_issue_reports table)
 */
export interface CardIssueReportDTO {
  id: string;
  cardId: string;
  description: string;
  status: "open" | "in_review" | "resolved" | "dismissed"; // "open" | "in_review" | "resolved" | "dismissed"
  resolutionNotes: string | null;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

// --- Common Response DTOs ---

/**
 * DTO for pagination metadata
 * Used across multiple list endpoints
 */
export interface PaginationDTO {
  total: number;
  limit: number;
  offset: number;
}

/**
 * DTO for API error responses
 * Used across all endpoints for error handling
 */
export interface ApiErrorDTO {
  error: string;
  message: string;
  fields?: string[];
}

// ============================================================================
// MAPPER FUNCTIONS (Helper utilities for snake_case <-> camelCase conversion)
// ============================================================================

/**
 * Converts a database Deck entity to DeckDTO (snake_case -> camelCase)
 */
export function mapDeckToDTO(deck: Deck): DeckDTO {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    createdAt: deck.created_at,
    updatedAt: deck.updated_at,
  };
}

/**
 * Converts a database Deck + DeckStats to DeckWithStatsDTO
 */
export function mapDeckWithStatsToDTO(deck: Deck, stats: DeckStats): DeckWithStatsDTO {
  return {
    ...mapDeckToDTO(deck),
    cardsTotal: stats.cards_total,
    dueCount: stats.due_count,
  };
}

/**
 * Converts a database Card entity to CardDTO (snake_case -> camelCase)
 */
export function mapCardToDTO(card: Card): CardDTO {
  return {
    id: card.id,
    question: card.question,
    answer: card.answer,
    origin: card.origin as "manual" | "ai",
    leitnerBox: card.leitner_box,
    dueAt: card.due_at,
    lastReviewedAt: card.last_reviewed_at,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
  };
}

/**
 * Converts a database Card to StudyCardDTO (limited fields)
 */
export function mapCardToStudyCardDTO(card: Card): StudyCardDTO {
  return {
    id: card.id,
    question: card.question,
    answer: card.answer,
    leitnerBox: card.leitner_box,
    dueAt: card.due_at,
  };
}

/**
 * Converts a database StudySession entity to StudySessionDTO (snake_case -> camelCase)
 */
export function mapStudySessionToDTO(session: StudySession): StudySessionDTO {
  return {
    id: session.id,
    deckId: session.deck_id,
    startedAt: session.started_at,
    endedAt: session.ended_at,
    cardsReviewed: session.cards_reviewed,
    knowCount: session.know_count,
    dontKnowCount: session.dont_know_count,
  };
}

/**
 * Converts a database AIGeneratedCard to AIGeneratedCardDTO (snake_case -> camelCase)
 */
export function mapAIGeneratedCardToDTO(card: AIGeneratedCard): AIGeneratedCardDTO {
  return {
    id: card.id,
    question: card.question,
    answer: card.answer,
    accepted: card.accepted,
    createdAt: card.created_at,
  };
}

/**
 * Converts a database CardIssueReport to CardIssueReportDTO (snake_case -> camelCase)
 */
export function mapCardIssueReportToDTO(report: CardIssueReport): CardIssueReportDTO {
  return {
    id: report.id,
    cardId: report.card_id,
    description: report.description,
    status: report.status as "open" | "in_review" | "resolved" | "dismissed",
    resolutionNotes: report.resolution_notes,
    createdAt: report.created_at,
    updatedAt: report.updated_at,
  };
}
