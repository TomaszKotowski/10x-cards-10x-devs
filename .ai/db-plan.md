1. Lista tabel z ich kolumnami, typami danych i ograniczeniami
- `decks`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `name CITEXT NOT NULL`
  - `description TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - Ograniczenia: `UNIQUE (user_id, name)`, `UNIQUE (id, user_id)` dla spójności kluczy obcych; trigger `set_current_timestamp` aktualizujący `updated_at`.

- `cards`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `deck_id UUID NOT NULL`
  - `origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'ai'))`
  - `question TEXT NOT NULL CHECK (char_length(trim(question)) > 0)`
  - `answer TEXT NOT NULL CHECK (char_length(trim(answer)) > 0)`
  - `question_normalized TEXT GENERATED ALWAYS AS (regexp_replace(lower(trim(question)), '\s+', ' ', 'g')) STORED`
  - `leitner_box SMALLINT NOT NULL DEFAULT 1 CHECK (leitner_box BETWEEN 1 AND 3)`
  - `due_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `last_reviewed_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - Ograniczenia: `UNIQUE (deck_id, question_normalized)`, `UNIQUE (id, user_id)`, `FOREIGN KEY (deck_id, user_id) REFERENCES decks(id, user_id) ON DELETE CASCADE`, trigger `cards_reset_schedule_on_content_change`.

- `study_sessions`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `deck_id UUID NOT NULL`
  - `started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `ended_at TIMESTAMPTZ`
  - `cards_reviewed INTEGER NOT NULL DEFAULT 0 CHECK (cards_reviewed >= 0)`
  - `know_count INTEGER NOT NULL DEFAULT 0 CHECK (know_count >= 0)`
  - `dont_know_count INTEGER NOT NULL DEFAULT 0 CHECK (dont_know_count >= 0)`
  - Ograniczenia: `FOREIGN KEY (deck_id, user_id) REFERENCES decks(id, user_id) ON DELETE CASCADE`.

- `card_reviews`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `session_id UUID NOT NULL`
  - `card_id UUID NOT NULL`
  - `result card_review_result NOT NULL`
  - `prev_box SMALLINT NOT NULL CHECK (prev_box BETWEEN 1 AND 3)`
  - `new_box SMALLINT NOT NULL CHECK (new_box BETWEEN 1 AND 3)`
  - `reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `response_ms INTEGER CHECK (response_ms >= 0)`
  - Ograniczenia: `FOREIGN KEY (session_id, user_id) REFERENCES study_sessions(id, user_id) ON DELETE CASCADE`, `FOREIGN KEY (card_id, user_id) REFERENCES cards(id, user_id) ON DELETE CASCADE`.

- `ai_generations`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `prompt TEXT NOT NULL CHECK (char_length(prompt) <= 10000)`
  - `model TEXT`
  - `raw_response JSONB`
  - `meta JSONB`
  - `status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed'))`
  - `error_code TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `completed_at TIMESTAMPTZ`
  - Ograniczenia: `UNIQUE (id, user_id)`.

- `ai_generated_cards`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `generation_id UUID NOT NULL`
  - `card_id UUID UNIQUE REFERENCES cards(id)`
  - `question TEXT NOT NULL CHECK (char_length(trim(question)) > 0)`
  - `answer TEXT NOT NULL CHECK (char_length(trim(answer)) > 0)`
  - `accepted BOOLEAN NOT NULL DEFAULT false`
  - `accepted_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - Ograniczenia: `FOREIGN KEY (generation_id, user_id) REFERENCES ai_generations(id, user_id) ON DELETE CASCADE`.

- `ai_generation_attempts`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `generation_id UUID REFERENCES ai_generations(id)`
  - `status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'rate_limited'))`
  - `error_code TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `advisory_lock_key BIGINT`

- `card_issue_reports`
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `user_id UUID NOT NULL REFERENCES auth.users(id)`
  - `card_id UUID NOT NULL`
  - `description TEXT NOT NULL CHECK (char_length(trim(description)) > 0)`
  - `status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed'))`
  - `resolution_notes TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - Ograniczenia: `FOREIGN KEY (card_id, user_id) REFERENCES cards(id, user_id) ON DELETE CASCADE`.

- `deck_stats`
  - `deck_id UUID PRIMARY KEY`
  - `user_id UUID NOT NULL`
  - `cards_total INTEGER NOT NULL CHECK (cards_total >= 0)`
  - `due_count INTEGER NOT NULL CHECK (due_count >= 0)`
  - `last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`
  - Ograniczenia: `FOREIGN KEY (deck_id, user_id) REFERENCES decks(id, user_id) ON DELETE CASCADE`.

- Typy niestandardowe i pomocnicze
  - `CREATE TYPE card_review_result AS ENUM ('know', 'dont_know');`
  - Funkcja `set_current_timestamp()` aktualizująca pole `updated_at` w tabelach użytkownika.

2. Relacje między tabelami
- `decks (1) — (N) cards` przez `cards.deck_id` (kaskadowe usuwanie).
- `decks (1) — (N) study_sessions` przez `study_sessions.deck_id` (kaskadowe usuwanie).
- `cards (1) — (N) card_reviews` przez `card_reviews.card_id` (kaskadowe usuwanie).
- `study_sessions (1) — (N) card_reviews` przez `card_reviews.session_id`.
- `ai_generations (1) — (N) ai_generated_cards` przez `generation_id` (kaskadowe usuwanie).
- `ai_generated_cards (1) — (0..1) cards` przez `card_id` (po akceptacji).
- `cards (1) — (N) card_issue_reports` przez `card_issue_reports.card_id` (kaskadowe usuwanie).
- `decks (1) — (1) deck_stats` przez `deck_stats.deck_id`.
- Wszystkie relacje dodatkowo denormalizują `user_id` i są zabezpieczone przez klucze obce z parą `(id, user_id)` oraz triggery walidujące spójność własności.

3. Indeksy
- `decks_user_name_key` jako indeks unikalny na `(user_id, name)` (case-insensitive dzięki `citext`).
- `cards_user_deck_due_idx` na `cards(user_id, deck_id, due_at)` dla harmonogramu powtórek.
- `cards_due_idx` na `cards(user_id, due_at)` dla globalnych list zaległych fiszek.
- `cards_origin_idx` na `cards(user_id, origin)` wspierający raporty adopcji AI.
- `card_question_unique_idx` jako unikalny indeks na `(deck_id, question_normalized)`.
- `card_reviews_user_reviewed_idx` na `card_reviews(user_id, reviewed_at DESC)`.
- `card_reviews_card_idx` na `card_reviews(card_id, reviewed_at DESC)`.
- `study_sessions_user_started_idx` na `study_sessions(user_id, started_at DESC)`.
- `ai_generations_user_created_idx` na `ai_generations(user_id, created_at DESC)`.
- `ai_generation_attempts_user_created_idx` na `ai_generation_attempts(user_id, created_at DESC)`.
- `ai_generated_cards_pending_idx` na `ai_generated_cards(user_id, accepted) WHERE accepted = false`.
- `card_issue_reports_user_created_idx` na `card_issue_reports(user_id, created_at DESC)`.
- `deck_stats_user_idx` na `deck_stats(user_id, due_count DESC)` przydatny do sortowania talii.

4. Zasady PostgreSQL (RLS)
- Dla każdej tabeli z kolumną `user_id`:
  - `ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;`
  - Polityki użytkownika końcowego:
    - `CREATE POLICY <table>_owner_select ON <table> FOR SELECT USING (user_id = auth.uid());`
    - `CREATE POLICY <table>_owner_write ON <table> FOR INSERT WITH CHECK (user_id = auth.uid());`
    - `CREATE POLICY <table>_owner_update ON <table> FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());`
    - `CREATE POLICY <table>_owner_delete ON <table> FOR DELETE USING (user_id = auth.uid());`
  - Polityka serwisowa:
    - `CREATE POLICY <table>_service_role_all ON <table> USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');`
- Dodatkowo:
  - `deck_stats` udostępnione przez widok per użytkownik lub politykę `USING (user_id = auth.uid())`.
  - `ai_generation_attempts` używa oddzielnej funkcji (`enforce_ai_attempt_quota`) wywoływanej w transakcji przed insertem; funkcja korzysta z `pg_advisory_xact_lock(advisory_lock_key)` obliczanego z `user_id`.

5. Dodatkowe uwagi i wyjaśnienia
- Włącz rozszerzenia: `CREATE EXTENSION IF NOT EXISTS pgcrypto;` i `CREATE EXTENSION IF NOT EXISTS citext;`.
- Funkcje i triggery:
  - `set_current_timestamp()` dla pól `updated_at`.
  - `cards_reset_schedule_on_content_change` (BEFORE UPDATE) ustawia `leitner_box = 1`, `due_at = timezone('utc', now())`, `last_reviewed_at = NULL` po zmianie `question` lub `answer`.
  - `apply_review(card_id UUID, result card_review_result)` aktualizuje `cards.leitner_box`, `cards.due_at`, `cards.last_reviewed_at`; wywoływany przez trigger AFTER INSERT na `card_reviews`.
  - `ensure_child_entity_owner()` BEFORE INSERT/UPDATE na tabelach podrzędnych sprawdza zgodność `user_id` z rekordem nadrzędnym.
  - `refresh_deck_stats()` AFTER INSERT/UPDATE/DELETE na `cards` i `card_reviews` aktualizuje `deck_stats`.
- `deck_stats` może być materializowanym widokiem lub tabelą utrzymywaną triggerami; wariant tabelaryczny upraszcza RLS i natychmiastowe odczyty.
- `ai_generation_attempts.advisory_lock_key` sugerowany jako `hashtextextended(user_id::text, 0)` pozwalający na blokadę doradczą w logice limitu 15/24h.
- Dane `raw_response` przechowywane jako `JSONB`; w razie potrzeby zaawansowanego wyszukiwania można dodać indeks GIN (`ai_generations_raw_response_idx`).
- Wszystkie znaczniki czasu przechowywane są w UTC; aplikacja powinna wymuszać `SET TIME ZONE 'UTC';` lub korzystać z `timezone('utc', now())` tak jak w domyślnych wartościach.
