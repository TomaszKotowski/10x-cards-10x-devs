# REST API Plan

## 1. Resources

The API exposes the following main resources mapped to database tables:

- **Decks** (`decks`) - Collections of flashcards organized by topic
- **Cards** (`cards`) - Individual flashcards with questions and answers
- **Study Sessions** (`study_sessions`) - Learning sessions tracking user progress
- **Card Reviews** (`card_reviews`) - Individual card ratings within study sessions
- **AI Generations** (`ai_generations`) - AI-powered card generation requests
- **AI Generated Cards** (`ai_generated_cards`) - Cards produced by AI awaiting review
- **Card Issue Reports** (`card_issue_reports`) - User-reported problems with cards
- **Deck Stats** (`deck_stats`) - Materialized statistics for decks (read-only)

## 2. Endpoints

### 2.1. AI Generation

#### Check AI Generation Quota

**GET** `/api/ai/quota`

**Description:** Returns the current user's AI generation usage and remaining quota.

**Query Parameters:** None

**Request Body:** None

**Response (200 OK):**

```json
{
  "limit": 15,
  "used": 7,
  "remaining": 8,
  "resetAt": "2025-10-20T13:37:00Z"
}
```

**Error Responses:**

- `401 Unauthorized` - Missing or invalid authentication token

---

#### Generate Cards with AI

**POST** `/api/ai/generate`

**Description:** Generates flashcards from provided text using AI. Enforces 15 generations per 24-hour rolling window.

**Query Parameters:** None

**Request Body:**

```json
{
  "prompt": "String (max 10,000 characters)"
}
```

**Response (201 Created):**

```json
{
  "generationId": "uuid",
  "status": "succeeded",
  "cards": [
    {
      "id": "uuid",
      "question": "What is photosynthesis?",
      "answer": "The process by which plants convert light energy into chemical energy.",
      "accepted": false
    }
  ],
  "createdAt": "2025-10-19T13:37:00Z"
}
```

**Response Headers:**

```
X-RateLimit-Limit: 15
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1729432620
```

**Error Responses:**

- `400 Bad Request` - Invalid prompt (empty or > 10,000 characters)
- `401 Unauthorized` - Missing or invalid authentication token
- `429 Too Many Requests` - Generation quota exceeded
- `500 Internal Server Error` - AI service failure

---

#### Get Generated Cards

**GET** `/api/ai/generations/:generationId/cards`

**Description:** Retrieves all AI-generated cards for a specific generation.

**Response (200 OK):**

```json
{
  "generationId": "uuid",
  "cards": [
    {
      "id": "uuid",
      "question": "What is photosynthesis?",
      "answer": "The process...",
      "accepted": false,
      "createdAt": "2025-10-19T13:37:00Z"
    }
  ]
}
```

---

#### Edit Generated Card

**PATCH** `/api/ai/generated-cards/:cardId`

**Description:** Edits the question and/or answer of an AI-generated card before acceptance.

**Request Body:**

```json
{
  "question": "Updated question text (optional)",
  "answer": "Updated answer text (optional)"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "question": "Updated question text",
  "answer": "Updated answer text",
  "accepted": false
}
```

**Error Responses:**

- `400 Bad Request` - Invalid data (empty question/answer after trimming)
- `404 Not Found` - Card not found or doesn't belong to user
- `409 Conflict` - Card already accepted

---

#### Accept Generated Cards and Create Deck

**POST** `/api/ai/generations/:generationId/accept`

**Description:** Accepts selected AI-generated cards and creates a new deck containing them.

**Request Body:**

```json
{
  "deckName": "Biology Basics",
  "deckDescription": "Fundamental biology concepts (optional)",
  "acceptedCardIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (201 Created):**

```json
{
  "deck": {
    "id": "uuid",
    "name": "Biology Basics",
    "description": "Fundamental biology concepts",
    "cardsTotal": 3,
    "createdAt": "2025-10-19T13:40:00Z"
  },
  "acceptedCount": 3
}
```

**Error Responses:**

- `400 Bad Request` - Empty deck name or no cards selected
- `404 Not Found` - Generation or cards not found
- `409 Conflict` - Deck name already exists for user

---

### 2.2. Decks

#### List User Decks

**GET** `/api/decks`

**Description:** Returns all decks belonging to the authenticated user with statistics.

**Query Parameters:**

- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)
- `sortBy` (optional, default: "created_at") - Options: `created_at`, `name`, `due_count`
- `sortOrder` (optional, default: "desc") - Options: `asc`, `desc`

**Response (200 OK):**

```json
{
  "decks": [
    {
      "id": "uuid",
      "name": "Biology Basics",
      "description": "Fundamental biology concepts",
      "cardsTotal": 25,
      "dueCount": 8,
      "createdAt": "2025-10-19T13:40:00Z",
      "updatedAt": "2025-10-19T14:00:00Z"
    }
  ],
  "pagination": {
    "total": 10,
    "limit": 50,
    "offset": 0
  }
}
```

---

#### Get Single Deck

**GET** `/api/decks/:deckId`

**Description:** Returns detailed information about a specific deck.

**Response (200 OK):**

```json
{
  "id": "uuid",
  "name": "Biology Basics",
  "description": "Fundamental biology concepts",
  "cardsTotal": 25,
  "dueCount": 8,
  "createdAt": "2025-10-19T13:40:00Z",
  "updatedAt": "2025-10-19T14:00:00Z"
}
```

**Error Responses:**

- `404 Not Found` - Deck not found or doesn't belong to user

---

#### Create Deck

**POST** `/api/decks`

**Description:** Creates a new empty deck for manual card creation.

**Request Body:**

```json
{
  "name": "Chemistry 101",
  "description": "Introduction to chemistry (optional)"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "name": "Chemistry 101",
  "description": "Introduction to chemistry",
  "cardsTotal": 0,
  "dueCount": 0,
  "createdAt": "2025-10-19T14:00:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Empty deck name
- `409 Conflict` - Deck name already exists for user

---

#### Update Deck

**PATCH** `/api/decks/:deckId`

**Description:** Updates deck name and/or description.

**Request Body:**

```json
{
  "name": "Updated Deck Name (optional)",
  "description": "Updated description (optional)"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "name": "Updated Deck Name",
  "description": "Updated description",
  "updatedAt": "2025-10-19T14:05:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid data
- `404 Not Found` - Deck not found
- `409 Conflict` - Deck name already exists

---

#### Delete Deck

**DELETE** `/api/decks/:deckId`

**Description:** Permanently deletes a deck and all its cards (cascade delete).

**Response:** `204 No Content`

**Error Responses:**

- `404 Not Found` - Deck not found or doesn't belong to user

---

### 2.3. Cards

#### List Cards in Deck

**GET** `/api/decks/:deckId/cards`

**Description:** Returns all cards in a specific deck with pagination.

**Query Parameters:**

- `limit` (optional, default: 50, max: 100)
- `offset` (optional, default: 0)
- `sortBy` (optional, default: "created_at") - Options: `created_at`, `due_at`, `leitner_box`
- `sortOrder` (optional, default: "desc")

**Response (200 OK):**

```json
{
  "cards": [
    {
      "id": "uuid",
      "question": "What is photosynthesis?",
      "answer": "The process by which plants convert light energy...",
      "origin": "ai",
      "leitnerBox": 2,
      "dueAt": "2025-10-22T13:40:00Z",
      "lastReviewedAt": "2025-10-19T13:40:00Z",
      "createdAt": "2025-10-19T13:40:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0
  }
}
```

**Error Responses:**

- `404 Not Found` - Deck not found

---

#### Create Card in Deck

**POST** `/api/decks/:deckId/cards`

**Description:** Creates a new manual card in the specified deck.

**Request Body:**

```json
{
  "question": "What is the capital of France?",
  "answer": "Paris"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "question": "What is the capital of France?",
  "answer": "Paris",
  "origin": "manual",
  "leitnerBox": 1,
  "dueAt": "2025-10-19T14:10:00Z",
  "createdAt": "2025-10-19T14:10:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Empty question or answer
- `404 Not Found` - Deck not found
- `409 Conflict` - Duplicate question in deck (normalized)

---

#### Update Card

**PATCH** `/api/cards/:cardId`

**Description:** Updates card question and/or answer. Resets learning progress (leitner_box=1, due_at=now).

**Request Body:**

```json
{
  "question": "Updated question (optional)",
  "answer": "Updated answer (optional)"
}
```

**Response (200 OK):**

```json
{
  "id": "uuid",
  "question": "Updated question",
  "answer": "Updated answer",
  "leitnerBox": 1,
  "dueAt": "2025-10-19T14:15:00Z",
  "lastReviewedAt": null,
  "updatedAt": "2025-10-19T14:15:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Empty question or answer
- `404 Not Found` - Card not found
- `409 Conflict` - Duplicate question in deck

---

#### Delete Card

**DELETE** `/api/cards/:cardId`

**Description:** Permanently deletes a card.

**Response:** `204 No Content`

**Error Responses:**

- `404 Not Found` - Card not found or doesn't belong to user

---

### 2.4. Study Sessions

#### Start Study Session

**POST** `/api/decks/:deckId/study-sessions`

**Description:** Starts a new study session for the specified deck. Returns session details and due cards.

**Request Body:** None

**Response (201 Created):**

```json
{
  "sessionId": "uuid",
  "deckId": "uuid",
  "startedAt": "2025-10-19T14:20:00Z",
  "dueCardsCount": 8
}
```

**Error Responses:**

- `404 Not Found` - Deck not found or doesn't belong to user

---

#### Get Study Session Details

**GET** `/api/study-sessions/:sessionId`

**Description:** Returns current session state and statistics.

**Response (200 OK):**

```json
{
  "id": "uuid",
  "deckId": "uuid",
  "startedAt": "2025-10-19T14:20:00Z",
  "endedAt": null,
  "cardsReviewed": 5,
  "knowCount": 3,
  "dontKnowCount": 2
}
```

**Error Responses:**

- `404 Not Found` - Session not found or doesn't belong to user

---

#### Get Due Cards for Session

**GET** `/api/study-sessions/:sessionId/cards`

**Description:** Returns all due cards for the session that haven't been reviewed yet.

**Response (200 OK):**

```json
{
  "cards": [
    {
      "id": "uuid",
      "question": "What is photosynthesis?",
      "answer": "The process by which plants convert light energy...",
      "leitnerBox": 1,
      "dueAt": "2025-10-19T14:20:00Z"
    }
  ],
  "remaining": 3
}
```

**Error Responses:**

- `404 Not Found` - Session not found

---

#### Submit Card Review

**POST** `/api/study-sessions/:sessionId/reviews`

**Description:** Records user's review of a card (Know/Don't Know). Updates card's Leitner box and due date.

**Request Body:**

```json
{
  "cardId": "uuid",
  "result": "know",
  "responseDurationMs": 3500
}
```

**Response (201 Created):**

```json
{
  "reviewId": "uuid",
  "cardId": "uuid",
  "result": "know",
  "previousBox": 1,
  "newBox": 2,
  "newDueAt": "2025-10-22T14:25:00Z",
  "reviewedAt": "2025-10-19T14:25:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Invalid result (must be "know" or "dont_know")
- `404 Not Found` - Session or card not found
- `409 Conflict` - Card already reviewed in this session

---

#### End Study Session

**PATCH** `/api/study-sessions/:sessionId/end`

**Description:** Marks the session as ended and returns summary statistics.

**Request Body:** None

**Response (200 OK):**

```json
{
  "id": "uuid",
  "deckId": "uuid",
  "startedAt": "2025-10-19T14:20:00Z",
  "endedAt": "2025-10-19T14:30:00Z",
  "cardsReviewed": 8,
  "knowCount": 5,
  "dontKnowCount": 3,
  "durationSeconds": 600
}
```

**Error Responses:**

- `404 Not Found` - Session not found
- `409 Conflict` - Session already ended

---

### 2.5. Card Issue Reports

#### Report Card Issue

**POST** `/api/cards/:cardId/issues`

**Description:** Submits a user report about a problematic card.

**Request Body:**

```json
{
  "description": "The answer seems incorrect or outdated"
}
```

**Response (201 Created):**

```json
{
  "id": "uuid",
  "cardId": "uuid",
  "description": "The answer seems incorrect or outdated",
  "status": "open",
  "createdAt": "2025-10-19T14:35:00Z"
}
```

**Error Responses:**

- `400 Bad Request` - Empty description
- `404 Not Found` - Card not found or doesn't belong to user

---

## 3. Authentication and Authorization

### Authentication Mechanism

The API uses **Supabase Authentication** with JWT bearer tokens.

**Implementation Details:**

1. **Client-Side Authentication:**
   - Users authenticate via Supabase client SDK (email/password)
   - Supabase handles: signup, login, logout, password reset
   - No custom auth endpoints needed in the API

2. **API Request Authentication:**
   - All API requests must include: `Authorization: Bearer <supabase_jwt_token>`
   - Middleware validates token with Supabase
   - Extracts `user_id` from validated token

3. **Authorization:**
   - Row-Level Security (RLS) enforced at database level
   - All tables have RLS policies: `user_id = auth.uid()`
   - API uses authenticated Supabase client
   - No additional application-level filtering required

4. **Unauthenticated Requests:**
   - Return `401 Unauthorized`
   - Response body: `{"error": "unauthorized", "message": "Authentication required"}`

5. **Service Role:**
   - Background jobs use service role key
   - Bypasses RLS for administrative operations
   - Never exposed to client

---

## 4. Validation and Business Logic

### 4.1. Validation Rules by Resource

#### Decks

- **name**: Required, non-empty after trimming, unique per user (case-insensitive)
- **description**: Optional, text field

#### Cards

- **question**: Required, non-empty after trimming, unique per deck (normalized: lowercase, single spaces)
- **answer**: Required, non-empty after trimming
- **origin**: Must be "manual" or "ai" (set automatically)
- **leitnerBox**: Integer between 1-3 (managed by system)

#### AI Generations

- **prompt**: Required, 1-10,000 characters
- **Rate limit**: Maximum 15 generations per user per rolling 24-hour window

#### AI Generated Cards

- **question**: Required, non-empty after trimming
- **answer**: Required, non-empty after trimming
- **Cannot edit after acceptance**

#### Study Sessions

- **cardsReviewed**: Non-negative integer
- **knowCount**: Non-negative integer
- **dontKnowCount**: Non-negative integer
- **Constraint**: `cardsReviewed = knowCount + dontKnowCount`

#### Card Reviews

- **result**: Must be "know" or "dont_know" (enum)
- **previousBox**: Integer 1-3
- **newBox**: Integer 1-3
- **responseDurationMs**: Non-negative integer (optional)
- **One review per card per session**

#### Card Issue Reports

- **description**: Required, non-empty after trimming
- **status**: Must be "open", "in_review", "resolved", or "dismissed"

---

### 4.2. Business Logic Implementation

#### AI Generation Flow

1. **Quota Check:**
   - Query `ai_generation_attempts` for user in last 24 hours
   - Count attempts with status "succeeded"
   - If count >= 15, return 429 with reset timestamp

2. **Generation Process:**
   - Acquire advisory lock: `pg_advisory_xact_lock(hashtextextended(user_id::text, 0))`
   - Insert into `ai_generation_attempts` with status "pending"
   - Call AI service (OpenRouter API)
   - On success:
     - Insert into `ai_generations` with status "succeeded"
     - Insert generated cards into `ai_generated_cards`
     - Update attempt status to "succeeded"
   - On failure:
     - Update `ai_generations` status to "failed"
     - Update attempt status to "failed" or "rate_limited"
     - Return appropriate error

3. **Card Acceptance:**
   - Transaction begins
   - Create deck (if deck name doesn't exist)
   - For each accepted card:
     - Insert into `cards` table with origin="ai"
     - Update `ai_generated_cards`: set accepted=true, card_id, accepted_at
   - Trigger updates `deck_stats`
   - Transaction commits

---

#### Leitner Algorithm (3-Box System)

**Box Progression Rules:**

- **Know (Correct Answer):**
  - Box 1 → Box 2: due_at = now + 3 days
  - Box 2 → Box 3: due_at = now + 7 days
  - Box 3 → Box 3: due_at = now + 7 days

- **Don't Know (Incorrect Answer):**
  - Any Box → Box 1: due_at = now + 1 day

**Implementation:**

- Database trigger `apply_review()` on `card_reviews` INSERT
- Trigger reads `card_reviews.result` and current `cards.leitner_box`
- Updates `cards.leitner_box`, `cards.due_at`, `cards.last_reviewed_at`
- API only records review; trigger handles scheduling

**Due Card Selection:**

- Query: `SELECT * FROM cards WHERE user_id = $1 AND deck_id = $2 AND due_at <= NOW() ORDER BY RANDOM()`
- Cards are due immediately upon creation (due_at = now)
- Allows starting study session right after deck creation

---

#### Card Content Change Reset

**Trigger:** `cards_reset_schedule_on_content_change` (BEFORE UPDATE)

**Logic:**

- If `question` OR `answer` changed:
  - Set `leitner_box = 1`
  - Set `due_at = NOW()`
  - Set `last_reviewed_at = NULL`
- Rationale: Modified content requires re-learning

**API Behavior:**

- `PATCH /api/cards/:id` simply updates question/answer
- Trigger automatically resets learning progress
- Response includes updated leitner_box and due_at

---

#### Duplicate Question Prevention

**Database Constraint:** `UNIQUE (deck_id, question_normalized)`

**Normalization:**

- Generated column: `regexp_replace(lower(trim(question)), '\s+', ' ', 'g')`
- Converts to lowercase, trims whitespace, replaces multiple spaces with single space

**API Behavior:**

- On duplicate violation, catch database error
- Return `409 Conflict` with message: "A card with this question already exists in the deck"
- Applies to both manual card creation and AI card acceptance

---

#### Deck Statistics Maintenance

**Materialized Table:** `deck_stats`

**Fields:**

- `cards_total`: Total number of cards in deck
- `due_count`: Number of cards with due_at <= NOW()
- `last_calculated_at`: Timestamp of last update

**Update Trigger:** `refresh_deck_stats()` (AFTER INSERT/UPDATE/DELETE on `cards` and `card_reviews`)

**API Usage:**

- `GET /api/decks` joins with `deck_stats` for efficient listing
- No COUNT queries needed
- Stats updated automatically by triggers

---

#### Session State Management

**Session Lifecycle:**

1. **Start:** `POST /api/decks/:deckId/study-sessions`
   - Insert into `study_sessions` with started_at = NOW()
   - Return session_id

2. **Review Cards:** `POST /api/study-sessions/:sessionId/reviews`
   - Insert into `card_reviews`
   - Increment `study_sessions.cards_reviewed`
   - Increment `study_sessions.know_count` or `dont_know_count`
   - Trigger updates card schedule

3. **End:** `PATCH /api/study-sessions/:sessionId/end`
   - Update `study_sessions.ended_at = NOW()`
   - Return summary statistics

**Constraint Enforcement:**

- Foreign keys ensure session and cards belong to same user
- Prevent reviewing same card twice in one session (application logic)

---

### 4.3. Error Handling Patterns

**Validation Errors (400):**

```json
{
  "error": "validation_error",
  "message": "Human-readable description",
  "fields": ["field1", "field2"]
}
```

**Authentication Errors (401):**

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

**Not Found Errors (404):**

```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

**Conflict Errors (409):**

```json
{
  "error": "duplicate_deck_name|duplicate_question|already_reviewed",
  "message": "Human-readable description"
}
```

**Rate Limit Errors (429):**

```json
{
  "error": "quota_exceeded",
  "message": "You have reached the limit of 15 generations per 24 hours",
  "resetAt": "2025-10-20T13:37:00Z"
}
```

**Server Errors (500):**

```json
{
  "error": "internal_server_error",
  "message": "An unexpected error occurred"
}
```

---

### 4.4. Rate Limiting

**AI Generation Rate Limit:**

- **Limit:** 15 successful generations per user per rolling 24-hour window
- **Enforcement:** Database function `enforce_ai_attempt_quota()` with advisory locks
- **Headers:**
  - `X-RateLimit-Limit: 15`
  - `X-RateLimit-Remaining: <count>`
  - `X-RateLimit-Reset: <unix_timestamp>`

**General API Rate Limiting:**

- Not implemented in MVP
- Can be added via middleware (e.g., 1000 requests/hour per user)

---

### 4.5. Pagination

**Standard Pagination Parameters:**

- `limit`: Number of items per page (default: 50, max: 100)
- `offset`: Number of items to skip (default: 0)

**Response Format:**

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

**Applicable Endpoints:**

- `GET /api/decks`
- `GET /api/decks/:deckId/cards`

---

## 5. Technical Implementation Notes

### 5.1. Astro API Routes

All endpoints implemented as Astro API routes in `src/pages/api/`:

```
src/pages/api/
├── ai/
│   ├── quota.ts                    # GET /api/ai/quota
│   ├── generate.ts                 # POST /api/ai/generate
│   └── generations/
│       └── [id]/
│           ├── cards.ts            # GET /api/ai/generations/:id/cards
│           └── accept.ts           # POST /api/ai/generations/:id/accept
├── decks/
│   ├── index.ts                    # GET /api/decks, POST /api/decks
│   └── [id]/
│       ├── index.ts                # GET /api/decks/:id, PATCH, DELETE
│       ├── cards.ts                # GET /api/decks/:id/cards, POST
│       └── study-sessions.ts       # POST /api/decks/:id/study-sessions
├── cards/
│   ├── [id]/
│       ├── index.ts                # PATCH /api/cards/:id, DELETE
│       └── issues.ts               # POST /api/cards/:id/issues
└── study-sessions/
    └── [id]/
        ├── index.ts                # GET /api/study-sessions/:id
        ├── cards.ts                # GET /api/study-sessions/:id/cards
        ├── reviews.ts              # POST /api/study-sessions/:id/reviews
        └── end.ts                  # PATCH /api/study-sessions/:id/end
```

### 5.2. Supabase Client Usage

**Authenticated Client:**

```typescript
import { createServerClient } from "@supabase/ssr";

export async function createAuthenticatedClient(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.substring(7);
  const supabase = createServerClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // Verify token and get user
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Unauthorized");

  return { supabase, user };
}
```

**RLS Enforcement:**

- All queries automatically filtered by `user_id = auth.uid()`
- No manual filtering needed in application code
- Service role client used only for background jobs

### 5.3. Type Safety

**Shared Types** (in `src/types.ts`):

```typescript
// Database entities
export interface Deck {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  user_id: string;
  deck_id: string;
  origin: "manual" | "ai";
  question: string;
  answer: string;
  leitner_box: number;
  due_at: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// DTOs
export interface CreateDeckRequest {
  name: string;
  description?: string;
}

export interface CreateCardRequest {
  question: string;
  answer: string;
}

export interface SubmitReviewRequest {
  cardId: string;
  result: "know" | "dont_know";
  responseDurationMs?: number;
}

// Response types
export interface DeckWithStats extends Deck {
  cardsTotal: number;
  dueCount: number;
}

export interface ApiError {
  error: string;
  message: string;
  fields?: string[];
}
```

---

## 6. Future Considerations (Post-MVP)

### 6.1. Potential Enhancements

- **Async AI Generation:** For longer processing times, implement polling pattern
- **Batch Operations:** Bulk card import/export
- **Advanced Filtering:** Search cards by content, filter by Leitner box
- **Deck Sharing:** Public/private decks, collaboration features
- **Analytics Dashboard:** Detailed learning statistics and progress tracking
- **Custom Algorithms:** Support for SM-2, SM-17, or custom spaced repetition algorithms
- **Webhooks:** Notify external systems of study events
- **GraphQL API:** Alternative to REST for complex queries

### 6.2. Performance Optimizations

- **Caching:** Redis cache for deck stats, quota checks
- **Database Indexes:** Monitor slow queries and add indexes as needed
- **CDN:** Cache static API responses (quota limits, etc.)
- **Connection Pooling:** Optimize database connection management

### 6.3. Security Enhancements

- **Request Signing:** HMAC signatures for sensitive operations
- **Audit Logging:** Track all data modifications
- **Content Moderation:** AI-powered inappropriate content detection
- **CORS Configuration:** Restrict allowed origins in production

---

## Appendix: Quick Reference

### HTTP Status Codes Used

- `200 OK` - Successful GET/PATCH request
- `201 Created` - Successful POST request
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Authentication required/failed
- `404 Not Found` - Resource not found
- `409 Conflict` - Duplicate resource or business rule violation
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Unexpected server error

### Common Headers

**Request Headers:**

- `Authorization: Bearer <token>` - Required for all endpoints
- `Content-Type: application/json` - For POST/PATCH requests

**Response Headers:**

- `Content-Type: application/json`
- `X-RateLimit-Limit: 15` - AI generation endpoints only
- `X-RateLimit-Remaining: <count>` - AI generation endpoints only
- `X-RateLimit-Reset: <timestamp>` - AI generation endpoints only
