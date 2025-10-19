# API Endpoint Implementation Plan: Generate Cards with AI

## 1. Przegląd punktu końcowego

**Endpoint:** `POST /api/ai/generate`

**Cel:** Generowanie fiszek edukacyjnych z dostarczonego tekstu przy użyciu AI (OpenRouter API). Endpoint wymusza limit 15 generacji na użytkownika w ciągu 24-godzinnego okna kroczącego.

**Funkcjonalność:**

- Przyjmuje tekst od użytkownika (prompt)
- Sprawdza limit generacji (15/24h)
- Wywołuje zewnętrzne API AI (OpenRouter)
- Parsuje odpowiedź AI i tworzy rekordy w bazie danych
- Zwraca wygenerowane fiszki do akceptacji przez użytkownika

**Kluczowe aspekty:**

- Synchroniczne przetwarzanie (MVP - bez kolejkowania)
- Transakcyjność operacji bazodanowych
- Advisory locks dla race condition prevention
- Rate limiting z nagłówkami HTTP

---

## 2. Szczegóły żądania

### Metoda HTTP

`POST`

### Struktura URL

`/api/ai/generate`

### Parametry

**Wymagane:**

- Brak parametrów URL ani query string

**Opcjonalne:**

- Brak

### Request Headers

**Wymagane:**

```
Authorization: Bearer <supabase_jwt_token>
Content-Type: application/json
```

### Request Body

**Struktura:**

```json
{
  "prompt": "String (max 10,000 characters)"
}
```

**Walidacja:**

- `prompt` (required):
  - Typ: string
  - Nie może być pusty po trim()
  - Maksymalna długość: 10,000 znaków
  - Minimalna długość: 1 znak (po trim)

**Przykład:**

```json
{
  "prompt": "Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in chloroplasts and requires sunlight, water, and carbon dioxide."
}
```

---

## 3. Wykorzystywane typy

### Command Models (Request DTOs)

**`GenerateCardsCommand`** (z `src/types.ts`):

```typescript
export interface GenerateCardsCommand {
  prompt: string; // Max 10,000 characters
}
```

### Response DTOs

**`GenerateCardsResponseDTO`** (z `src/types.ts`):

```typescript
export interface GenerateCardsResponseDTO {
  generationId: string;
  status: string;
  cards: AIGeneratedCardDTO[];
  createdAt: string; // ISO 8601 timestamp
}
```

**`AIGeneratedCardDTO`** (z `src/types.ts`):

```typescript
export interface AIGeneratedCardDTO {
  id: string;
  question: string;
  answer: string;
  accepted: boolean;
  createdAt?: string; // ISO 8601 timestamp
}
```

**`ApiErrorDTO`** (z `src/types.ts`):

```typescript
export interface ApiErrorDTO {
  error: string;
  message: string;
  fields?: string[];
}
```

### Database Entity Types

**`AIGeneration`** (z `src/types.ts`):

```typescript
export type AIGeneration = Tables<"ai_generations">;
// Pola: id, user_id, prompt, model, raw_response, meta, status, error_code, created_at, completed_at
```

**`AIGeneratedCard`** (z `src/types.ts`):

```typescript
export type AIGeneratedCard = Tables<"ai_generated_cards">;
// Pola: id, user_id, generation_id, card_id, question, answer, accepted, accepted_at, created_at
```

**`AIGenerationAttempt`** (z `src/types.ts`):

```typescript
export type AIGenerationAttempt = Tables<"ai_generation_attempts">;
// Pola: id, user_id, generation_id, status, error_code, created_at, advisory_lock_key
```

### Zod Validation Schemas

**Nowy schemat do utworzenia:**

```typescript
import { z } from "zod";

export const GenerateCardsSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt cannot be empty").max(10000, "Prompt cannot exceed 10,000 characters"),
});
```

---

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

**Status Code:** `201 Created`

**Response Headers:**

```
Content-Type: application/json
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1729432620
```

**Response Body:**

```json
{
  "generationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "succeeded",
  "cards": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "question": "What is photosynthesis?",
      "answer": "The process by which plants convert light energy into chemical energy.",
      "accepted": false,
      "createdAt": "2025-10-19T13:37:00Z"
    }
  ],
  "createdAt": "2025-10-19T13:37:00Z"
}
```

### Błędy

#### 400 Bad Request - Invalid Prompt

```json
{
  "error": "validation_error",
  "message": "Prompt cannot exceed 10,000 characters",
  "fields": ["prompt"]
}
```

#### 401 Unauthorized - Missing/Invalid Token

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

#### 429 Too Many Requests - Quota Exceeded

```json
{
  "error": "quota_exceeded",
  "message": "You have reached the limit of 15 generations per 24 hours",
  "resetAt": "2025-10-20T13:37:00Z"
}
```

**Response Headers:**

```
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729432620
Retry-After: 86400
```

#### 500 Internal Server Error - AI Service Failure

```json
{
  "error": "internal_server_error",
  "message": "An unexpected error occurred"
}
```

---

## 5. Przepływ danych

### Diagram sekwencji

```
Klient → API Endpoint → Middleware → Quota Service → AI Service → Database
   ↓         ↓              ↓             ↓             ↓           ↓
  201     Validate      Auth Check    Check Limit   Call API   Save Results
          Request       Get User      (15/24h)      Parse       Return Data
```

### Szczegółowy przepływ

#### Krok 1: Walidacja żądania

1. Middleware Astro sprawdza nagłówek `Authorization`
2. Ekstrahuje token JWT z nagłówka `Bearer`
3. Tworzy authenticated Supabase client
4. Weryfikuje token i pobiera `user` object
5. Jeśli błąd → zwraca `401 Unauthorized`

#### Krok 2: Walidacja danych wejściowych

1. Parsuje request body jako JSON
2. Waliduje za pomocą `GenerateCardsSchema` (Zod)
3. Sprawdza:
   - `prompt` jest stringiem
   - `prompt` po trim() nie jest pusty
   - `prompt` nie przekracza 10,000 znaków
4. Jeśli błąd walidacji → zwraca `400 Bad Request`

#### Krok 3: Sprawdzenie limitu generacji (Quota Service)

1. Wywołuje `QuotaService.checkAndRecordAttempt(userId)`
2. Rozpoczyna transakcję bazodanową
3. Uzyskuje advisory lock: `pg_advisory_xact_lock(hashtextextended(user_id::text, 0))`
4. Zlicza próby w ostatnich 24h:
   ```sql
   SELECT COUNT(*) FROM ai_generation_attempts
   WHERE user_id = $1
     AND status = 'succeeded'
     AND created_at > NOW() - INTERVAL '24 hours'
   ```
5. Jeśli count >= 15:
   - Oblicza `resetAt` (najstarszy attempt + 24h)
   - Zwraca `429 Too Many Requests` z nagłówkami rate limit
6. Jeśli count < 15:
   - Wstawia rekord do `ai_generation_attempts` ze statusem 'pending'
   - Zwraca `attemptId` i informacje o limicie

#### Krok 4: Generowanie fiszek przez AI (AI Service)

1. Wywołuje `AIService.generateCards(prompt)`
2. Przygotowuje request do OpenRouter API:
   ```typescript
   {
     model: "openai/gpt-4o-mini",
     messages: [
       {
         role: "system",
         content: "You are a flashcard generator..."
       },
       {
         role: "user",
         content: prompt
       }
     ],
     response_format: { type: "json_object" }
   }
   ```
3. Wysyła POST request do `https://openrouter.ai/api/v1/chat/completions`
4. Nagłówki:
   ```
   Authorization: Bearer ${OPENROUTER_API_KEY}
   Content-Type: application/json
   HTTP-Referer: ${APP_URL}
   X-Title: 10x-cards
   ```
5. Parsuje odpowiedź JSON:
   ```json
   {
     "cards": [
       { "question": "...", "answer": "..." },
       { "question": "...", "answer": "..." }
     ]
   }
   ```
6. Waliduje strukturę odpowiedzi
7. Jeśli błąd API → rzuca wyjątek

#### Krok 5: Zapis do bazy danych

1. Rozpoczyna transakcję
2. Wstawia rekord do `ai_generations`:
   ```typescript
   {
     user_id: userId,
     prompt: prompt,
     model: "openai/gpt-4o-mini",
     raw_response: rawApiResponse,
     status: "succeeded",
     completed_at: new Date().toISOString()
   }
   ```
3. Dla każdej wygenerowanej fiszki, wstawia do `ai_generated_cards`:
   ```typescript
   {
     user_id: userId,
     generation_id: generationId,
     question: card.question.trim(),
     answer: card.answer.trim(),
     accepted: false
   }
   ```
4. Aktualizuje `ai_generation_attempts`:
   ```typescript
   UPDATE ai_generation_attempts
   SET status = 'succeeded', generation_id = $1
   WHERE id = $2
   ```
5. Commituje transakcję
6. Jeśli błąd → rollback i aktualizuje attempt status na 'failed'

#### Krok 6: Przygotowanie odpowiedzi

1. Mapuje dane z bazy na DTOs:
   - `AIGeneration` → `generationId`, `status`, `createdAt`
   - `AIGeneratedCard[]` → `AIGeneratedCardDTO[]`
2. Oblicza nagłówki rate limit:
   - `X-RateLimit-Limit: 15`
   - `X-RateLimit-Remaining: 15 - currentCount`
   - `X-RateLimit-Reset: oldestAttemptTimestamp + 24h (unix)`
3. Zwraca `201 Created` z body i nagłówkami

### Interakcje z zewnętrznymi serwisami

#### OpenRouter API

- **Endpoint:** `https://openrouter.ai/api/v1/chat/completions`
- **Metoda:** POST
- **Timeout:** 30 sekund
- **Retry logic:** Brak (MVP)
- **Error handling:** Catch i log błędów, zwróć 500

#### Supabase Database

- **Tabele:**
  - `ai_generation_attempts` (quota tracking)
  - `ai_generations` (generation metadata)
  - `ai_generated_cards` (generated cards)
- **RLS:** Automatyczne filtrowanie po `user_id = auth.uid()`
- **Transakcje:** Używaj dla atomowych operacji

---

## 6. Względy bezpieczeństwa

### Uwierzytelnianie

**Mechanizm:** Supabase JWT Bearer Token

**Implementacja:**

1. Middleware Astro (`src/middleware/index.ts`) sprawdza nagłówek `Authorization`
2. Ekstrahuje token z formatu `Bearer <token>`
3. Weryfikuje token przez `supabase.auth.getUser()`
4. Jeśli token nieważny lub brak → zwraca `401 Unauthorized`
5. Jeśli token ważny → przekazuje `user` object do handlera

**Kod przykładowy:**

```typescript
const authHeader = request.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return new Response(
    JSON.stringify({
      error: "unauthorized",
      message: "Authentication required",
    }),
    { status: 401 }
  );
}
```

### Autoryzacja

**Mechanizm:** Row Level Security (RLS) w Supabase

**Polityki RLS:**

- Wszystkie tabele mają politykę: `user_id = auth.uid()`
- Automatyczne filtrowanie zapytań SQL
- Brak potrzeby dodatkowej walidacji w kodzie aplikacji

**Implikacje:**

- Użytkownik może tylko czytać/modyfikować swoje własne dane
- Próba dostępu do cudzych danych zwraca pusty wynik (nie 403)
- Service role key bypasuje RLS (tylko dla background jobs)

### Walidacja danych wejściowych

**Poziomy walidacji:**

1. **Schemat Zod** (walidacja struktury):

   ```typescript
   const GenerateCardsSchema = z.object({
     prompt: z.string().trim().min(1).max(10000),
   });
   ```

2. **Sanityzacja**:
   - `trim()` usuwa białe znaki
   - Brak HTML tags (prompt to plain text)
   - Brak SQL injection risk (używamy parametryzowanych zapytań)

3. **Business rules**:
   - Sprawdzenie limitu 15/24h przed przetwarzaniem
   - Advisory locks zapobiegają race conditions

### Ochrona API Key

**OpenRouter API Key:**

- Przechowywany w zmiennej środowiskowej `OPENROUTER_API_KEY`
- Nigdy nie wysyłany do klienta
- Używany tylko server-side w API route
- Nie logowany w błędach

**Konfiguracja:**

```typescript
const apiKey = import.meta.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY not configured");
}
```

### Rate Limiting

**Implementacja:**

- Database-level enforcement (nie middleware)
- Advisory locks zapobiegają concurrent requests
- Nagłówki HTTP informują o limicie

**Bezpieczeństwo:**

- Lock key: `hashtextextended(user_id::text, 0)` - unikalny per user
- Transakcyjne zliczanie prób
- Brak możliwości obejścia limitu przez concurrent requests

### Potencjalne zagrożenia i mitygacja

| Zagrożenie             | Opis                     | Mitygacja                                  |
| ---------------------- | ------------------------ | ------------------------------------------ |
| **Token theft**        | Kradzież JWT token       | Krótki czas życia tokenu, HTTPS only       |
| **Prompt injection**   | Złośliwy prompt do AI    | Walidacja długości, monitoring kosztów API |
| **DoS przez AI calls** | Nadmierne wywołania AI   | Rate limiting 15/24h, timeout 30s          |
| **Data leakage**       | Dostęp do cudzych danych | RLS policies, user_id verification         |
| **API key exposure**   | Wyciek klucza OpenRouter | Env variables, never log keys              |
| **Race conditions**    | Concurrent quota checks  | Advisory locks, transactions               |

---

## 7. Obsługa błędów

### Scenariusze błędów

#### 1. Błędy walidacji (400 Bad Request)

**Przyczyny:**

- Pusty prompt (po trim)
- Prompt > 10,000 znaków
- Brak pola `prompt` w body
- Nieprawidłowy JSON

**Odpowiedź:**

```json
{
  "error": "validation_error",
  "message": "Prompt cannot exceed 10,000 characters",
  "fields": ["prompt"]
}
```

**Implementacja:**

```typescript
try {
  const body = await request.json();
  const validated = GenerateCardsSchema.parse(body);
} catch (error) {
  if (error instanceof z.ZodError) {
    return new Response(
      JSON.stringify({
        error: "validation_error",
        message: error.errors[0].message,
        fields: error.errors.map((e) => e.path[0]),
      }),
      { status: 400 }
    );
  }
}
```

#### 2. Błędy uwierzytelniania (401 Unauthorized)

**Przyczyny:**

- Brak nagłówka `Authorization`
- Nieprawidłowy format tokenu
- Token wygasły
- Token unieważniony

**Odpowiedź:**

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**Implementacja:**

```typescript
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (error || !user) {
  return new Response(
    JSON.stringify({
      error: "unauthorized",
      message: "Authentication required",
    }),
    { status: 401 }
  );
}
```

#### 3. Przekroczenie limitu (429 Too Many Requests)

**Przyczyny:**

- Użytkownik wykonał już 15 generacji w ostatnich 24h

**Odpowiedź:**

```json
{
  "error": "quota_exceeded",
  "message": "You have reached the limit of 15 generations per 24 hours",
  "resetAt": "2025-10-20T13:37:00Z"
}
```

**Nagłówki:**

```
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729432620
Retry-After: 86400
```

**Implementacja:**

```typescript
const quotaCheck = await QuotaService.checkQuota(userId);
if (quotaCheck.exceeded) {
  return new Response(
    JSON.stringify({
      error: "quota_exceeded",
      message: "You have reached the limit of 15 generations per 24 hours",
      resetAt: quotaCheck.resetAt,
    }),
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": "15",
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": quotaCheck.resetTimestamp.toString(),
        "Retry-After": quotaCheck.retryAfterSeconds.toString(),
      },
    }
  );
}
```

#### 4. Błędy AI Service (500 Internal Server Error)

**Przyczyny:**

- OpenRouter API niedostępne
- Timeout (> 30s)
- Nieprawidłowa odpowiedź AI
- Błąd parsowania JSON

**Odpowiedź:**

```json
{
  "error": "internal_server_error",
  "message": "An unexpected error occurred"
}
```

**Implementacja:**

```typescript
try {
  const aiResponse = await AIService.generateCards(prompt);
} catch (error) {
  console.error("AI generation failed:", error);

  // Update attempt status to 'failed'
  await supabase
    .from("ai_generation_attempts")
    .update({ status: "failed", error_code: "ai_service_error" })
    .eq("id", attemptId);

  return new Response(
    JSON.stringify({
      error: "internal_server_error",
      message: "An unexpected error occurred",
    }),
    { status: 500 }
  );
}
```

#### 5. Błędy bazy danych (500 Internal Server Error)

**Przyczyny:**

- Błąd połączenia z Supabase
- Constraint violation
- Transaction rollback

**Logowanie:**

```typescript
console.error("Database error:", {
  operation: "insert_ai_generation",
  userId: user.id,
  error: error.message,
});
```

**Odpowiedź:** Generyczny 500 (nie ujawniamy szczegółów DB)

### Strategia logowania błędów

**Co logować:**

- Wszystkie błędy 500 (z pełnym stack trace)
- Błędy AI API (z response body)
- Quota violations (dla analytics)
- Database errors (z query context)

**Czego NIE logować:**

- Tokeny JWT
- API keys
- User prompts (PII)
- Pełne request bodies

**Format logów:**

```typescript
console.error("Error context:", {
  endpoint: "POST /api/ai/generate",
  userId: user.id,
  errorType: "ai_service_timeout",
  timestamp: new Date().toISOString(),
});
```

### Tabela błędów w bazie danych

**Tabela:** `ai_generation_attempts`

**Zapisywane błędy:**

- `status: 'failed'` - ogólny błąd
- `status: 'rate_limited'` - przekroczenie limitu
- `error_code` - kod błędu (np. "ai_timeout", "ai_invalid_response")

**Przykład:**

```typescript
await supabase.from("ai_generation_attempts").insert({
  user_id: userId,
  status: "failed",
  error_code: "ai_service_timeout",
  created_at: new Date().toISOString(),
});
```

---

## 8. Rozważania dotyczące wydajności

### Wąskie gardła

1. **OpenRouter API call** (największe opóźnienie)
   - Czas odpowiedzi: 5-15 sekund
   - Timeout: 30 sekund
   - Mitygacja: Brak (MVP - synchroniczne przetwarzanie)

2. **Database transactions**
   - Advisory lock acquisition
   - Multiple INSERTs w transakcji
   - Mitygacja: Indeksy na `user_id`, `created_at`

3. **Quota check query**
   - COUNT z filtrem czasowym
   - Mitygacja: Indeks `ai_generation_attempts_user_created_idx`

### Optymalizacje

#### Database Queries

**Quota check - zoptymalizowane zapytanie:**

```sql
SELECT COUNT(*)
FROM ai_generation_attempts
WHERE user_id = $1
  AND status = 'succeeded'
  AND created_at > NOW() - INTERVAL '24 hours'
```

**Indeks wspierający:**

```sql
CREATE INDEX ai_generation_attempts_user_created_idx
ON ai_generation_attempts(user_id, created_at DESC);
```

#### Batch Inserts

**Wstawianie wielu kart jednym zapytaniem:**

```typescript
const cardsToInsert = generatedCards.map((card) => ({
  user_id: userId,
  generation_id: generationId,
  question: card.question.trim(),
  answer: card.answer.trim(),
  accepted: false,
}));

await supabase.from("ai_generated_cards").insert(cardsToInsert);
```

#### Connection Pooling

- Supabase automatycznie zarządza connection pooling
- Brak potrzeby dodatkowej konfiguracji w MVP

### Monitoring i metryki

**Kluczowe metryki do śledzenia:**

- Średni czas odpowiedzi endpointu
- Czas odpowiedzi OpenRouter API
- Liczba błędów 500 vs 429
- Średnia liczba wygenerowanych kart
- Quota utilization per user

**Narzędzia:**

- Supabase Dashboard (query performance)
- OpenRouter Dashboard (API usage, costs)
- Application logs (error rates)

### Skalowanie (post-MVP)

**Potencjalne ulepszenia:**

1. **Async processing**: Kolejka zadań (BullMQ, Inngest)
2. **Caching**: Redis dla quota checks
3. **CDN**: Cache static responses
4. **Database**: Read replicas dla analytics

---

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska

**Zadania:**

1. Dodaj zmienną środowiskową `OPENROUTER_API_KEY` do `.env`
2. Zaktualizuj `.env.example` z nową zmienną
3. Zweryfikuj połączenie z Supabase

**Pliki do modyfikacji:**

- `.env` (lokalnie)
- `.env.example` (w repozytorium)

**Weryfikacja:**

```bash
# Sprawdź czy zmienna jest ustawiona
echo $OPENROUTER_API_KEY
```

---

### Krok 2: Utworzenie schematu walidacji Zod

**Lokalizacja:** `src/lib/schemas/ai.schema.ts` (nowy plik)

**Kod:**

```typescript
import { z } from "zod";

export const GenerateCardsSchema = z.object({
  prompt: z.string().trim().min(1, "Prompt cannot be empty").max(10000, "Prompt cannot exceed 10,000 characters"),
});

export type GenerateCardsInput = z.infer<typeof GenerateCardsSchema>;
```

**Weryfikacja:**

- Import działa bez błędów
- TypeScript kompiluje się poprawnie

---

### Krok 3: Implementacja Quota Service

**Lokalizacja:** `src/lib/services/quota.service.ts` (nowy plik)

**Interfejs:**

```typescript
export interface QuotaCheckResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  resetTimestamp: number;
  retryAfterSeconds: number;
}

export class QuotaService {
  static async checkAndRecordAttempt(supabase: SupabaseClient, userId: string): Promise<QuotaCheckResult>;
}
```

**Implementacja:**

1. Rozpocznij transakcję
2. Uzyskaj advisory lock: `SELECT pg_advisory_xact_lock(hashtextextended($1::text, 0))`
3. Zlicz próby w ostatnich 24h
4. Jeśli >= 15, zwróć `allowed: false` z informacją o resecie
5. Jeśli < 15, wstaw rekord do `ai_generation_attempts` ze statusem 'pending'
6. Zwróć `allowed: true` z informacją o limicie

**Testy manualne:**

- Wywołaj 15 razy i sprawdź czy 16-ta próba zwraca `allowed: false`
- Sprawdź czy advisory lock działa (concurrent requests)

---

### Krok 4: Implementacja AI Service

**Lokalizacja:** `src/lib/services/ai.service.ts` (nowy plik)

**Interfejs:**

```typescript
export interface GeneratedCard {
  question: string;
  answer: string;
}

export interface AIGenerationResult {
  cards: GeneratedCard[];
  rawResponse: any;
  model: string;
}

export class AIService {
  static async generateCards(prompt: string): Promise<AIGenerationResult>;
}
```

**Implementacja:**

1. Przygotuj system prompt dla AI
2. Wywołaj OpenRouter API z timeout 30s
3. Parsuj odpowiedź JSON
4. Waliduj strukturę (array of {question, answer})
5. Zwróć wynik lub rzuć błąd

**System Prompt:**

```
You are a flashcard generator. Generate educational flashcards based on the provided text.
Return a JSON object with a "cards" array. Each card must have "question" and "answer" fields.
Generate 3-10 cards depending on the content length.
Questions should be clear and concise. Answers should be informative but brief.
```

**Testy manualne:**

- Wywołaj z przykładowym promptem
- Sprawdź czy zwraca poprawną strukturę
- Przetestuj timeout (mock długiego requesta)

---

### Krok 5: Implementacja API Endpoint

**Lokalizacja:** `src/pages/api/ai/generate.ts` (nowy plik)

**Struktura:**

```typescript
import type { APIRoute } from "astro";
import { GenerateCardsSchema } from "@/lib/schemas/ai.schema";
import { QuotaService } from "@/lib/services/quota.service";
import { AIService } from "@/lib/services/ai.service";
import { mapAIGeneratedCardToDTO } from "@/types";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  // 1. Uwierzytelnianie
  // 2. Walidacja body
  // 3. Sprawdzenie quota
  // 4. Generowanie przez AI
  // 5. Zapis do bazy
  // 6. Zwrócenie odpowiedzi z nagłówkami
};
```

**Szczegółowa implementacja:**

```typescript
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // 1. Uwierzytelnianie
    const supabase = locals.supabase;
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
          message: "Authentication required",
        }),
        { status: 401 }
      );
    }

    // 2. Walidacja body
    const body = await request.json();
    const validation = GenerateCardsSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: validation.error.errors[0].message,
          fields: validation.error.errors.map((e) => e.path[0]),
        }),
        { status: 400 }
      );
    }

    const { prompt } = validation.data;

    // 3. Sprawdzenie quota
    const quotaCheck = await QuotaService.checkAndRecordAttempt(supabase, user.id);

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

    // 4. Generowanie przez AI
    const aiResult = await AIService.generateCards(prompt);

    // 5. Zapis do bazy (transakcja)
    const { data: generation, error: genError } = await supabase
      .from("ai_generations")
      .insert({
        user_id: user.id,
        prompt: prompt,
        model: aiResult.model,
        raw_response: aiResult.rawResponse,
        status: "succeeded",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (genError) throw genError;

    // Wstaw wygenerowane karty
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

    if (cardsError) throw cardsError;

    // Aktualizuj attempt status
    await supabase
      .from("ai_generation_attempts")
      .update({
        status: "succeeded",
        generation_id: generation.id,
      })
      .eq("user_id", user.id)
      .is("generation_id", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // 6. Zwrócenie odpowiedzi
    return new Response(
      JSON.stringify({
        generationId: generation.id,
        status: "succeeded",
        cards: insertedCards.map(mapAIGeneratedCardToDTO),
        createdAt: generation.created_at,
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": quotaCheck.limit.toString(),
          "X-RateLimit-Remaining": quotaCheck.remaining.toString(),
          "X-RateLimit-Reset": quotaCheck.resetTimestamp.toString(),
        },
      }
    );
  } catch (error) {
    console.error("AI generation failed:", error);

    return new Response(
      JSON.stringify({
        error: "internal_server_error",
        message: "An unexpected error occurred",
      }),
      { status: 500 }
    );
  }
};
```

---

### Krok 6: Testy integracyjne

**Scenariusze testowe:**

1. **Happy path:**
   - Wyślij poprawny request
   - Sprawdź status 201
   - Sprawdź strukturę odpowiedzi
   - Sprawdź nagłówki rate limit

2. **Walidacja:**
   - Pusty prompt → 400
   - Prompt > 10,000 znaków → 400
   - Brak pola prompt → 400

3. **Uwierzytelnianie:**
   - Brak tokenu → 401
   - Nieprawidłowy token → 401

4. **Rate limiting:**
   - Wykonaj 15 requestów → wszystkie 201
   - 16-ty request → 429
   - Sprawdź nagłówki Retry-After

5. **Błędy AI:**
   - Mock błędu OpenRouter → 500
   - Sprawdź czy attempt ma status 'failed'

**Narzędzia:**

- Postman / Insomnia
- curl
- Automated tests (Vitest + supertest)

---

### Krok 7: Dokumentacja

**Pliki do zaktualizowania:**

1. **README.md:**
   - Dodaj sekcję o zmiennych środowiskowych
   - Dodaj przykład użycia endpointu

2. **API Documentation:**
   - Zaktualizuj `.ai/api-plan.md` jeśli potrzeba
   - Dodaj przykłady requestów/responses

3. **Code comments:**
   - Dodaj JSDoc do publicznych funkcji
   - Wyjaśnij złożoną logikę (advisory locks, quota)

---

### Krok 8: Deployment checklist

**Przed wdrożeniem:**

- [ ] Wszystkie testy przechodzą
- [ ] Linter nie zgłasza błędów
- [ ] TypeScript kompiluje się bez błędów
- [ ] Zmienna `OPENROUTER_API_KEY` ustawiona w production
- [ ] Sprawdzono limity OpenRouter API (rate limits, koszty)
- [ ] Przegląd kodu (code review)
- [ ] Dokumentacja zaktualizowana

**Po wdrożeniu:**

- [ ] Smoke test na production
- [ ] Monitoring błędów (Sentry, LogRocket)
- [ ] Sprawdzenie metryk (response time, error rate)
- [ ] Monitoring kosztów OpenRouter API

---

### Krok 9: Monitoring i optymalizacja

**Metryki do śledzenia:**

1. **Performance:**
   - Średni czas odpowiedzi endpointu
   - P95, P99 latency
   - Czas odpowiedzi OpenRouter API

2. **Reliability:**
   - Error rate (% requestów z 500)
   - Success rate generacji AI
   - Quota violations (% requestów z 429)

3. **Business:**
   - Liczba generacji per user
   - Średnia liczba wygenerowanych kart
   - Adoption rate (% użytkowników używających AI)

**Alerty:**

- Error rate > 5%
- AI service timeout > 10% requestów
- Koszty OpenRouter > threshold

---

## Podsumowanie

Plan wdrożenia endpointu `POST /api/ai/generate` obejmuje:

1. ✅ **Przegląd funkcjonalności** - generowanie fiszek przez AI z rate limitingiem
2. ✅ **Szczegóły techniczne** - request/response, typy, walidacja
3. ✅ **Przepływ danych** - od uwierzytelniania do zapisu w bazie
4. ✅ **Bezpieczeństwo** - JWT auth, RLS, API key protection, rate limiting
5. ✅ **Obsługa błędów** - wszystkie scenariusze z odpowiednimi kodami HTTP
6. ✅ **Wydajność** - optymalizacje zapytań, batch inserts, monitoring
7. ✅ **Implementacja krok po kroku** - od środowiska do deploymentu

**Następne kroki:**

1. Rozpocznij od Kroku 1 (przygotowanie środowiska)
2. Implementuj kolejne kroki sekwencyjnie
3. Testuj każdy komponent przed przejściem dalej
4. Dokumentuj zmiany na bieżąco

**Szacowany czas implementacji:** 6-8 godzin dla doświadczonego developera

**Priorytet:** Wysoki (core feature MVP)
