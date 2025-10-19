-- =====================================================================================
-- Migration: Create AI Generation Tables
-- =====================================================================================
-- Purpose: Track AI card generation requests, results, and rate limiting
-- Tables: ai_generations, ai_generated_cards, ai_generation_attempts
-- Features: Rate limiting (15/24h), generation tracking, card acceptance workflow
-- Author: Database Migration System
-- Date: 2025-10-18
-- =====================================================================================

-- =====================================================================================
-- TABLE: ai_generations
-- =====================================================================================
-- Purpose: Track AI card generation requests and responses
-- Stores the prompt, model used, raw response, and generation status
-- Used for debugging, analytics, and auditing AI usage

create table ai_generations (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Owner reference
  -- CASCADE: When user is deleted, all their generations are deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Generation request
  -- prompt: User's input text to generate flashcards from
  -- Limit 10,000 characters to prevent abuse and excessive API costs
  prompt text not null check (char_length(prompt) <= 10000),
  model text,  -- AI model identifier (e.g., 'gpt-4', 'claude-3-opus')
  
  -- Generation response
  -- raw_response: Full API response stored as JSONB for flexibility
  -- meta: Additional metadata (tokens used, cost, processing time, etc.)
  raw_response jsonb,
  meta jsonb,
  
  -- Generation status
  -- 'pending': Generation request created but not yet processed
  -- 'succeeded': Generation completed successfully
  -- 'failed': Generation failed (API error, invalid response, etc.)
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  error_code text,  -- Error identifier if generation failed (e.g., 'rate_limit', 'invalid_prompt')
  
  -- Timestamps
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,  -- When generation finished (success or failure)
  
  -- Constraints
  -- Composite unique constraint for foreign key references from ai_generated_cards
  constraint ai_generations_id_user_key unique (id, user_id)
);

-- Enable Row Level Security
alter table ai_generations enable row level security;

-- RLS Policy: Allow authenticated users to select their own generations
create policy ai_generations_owner_select on ai_generations
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert their own generations
create policy ai_generations_owner_insert on ai_generations
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update their own generations
create policy ai_generations_owner_update on ai_generations
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete their own generations
create policy ai_generations_owner_delete on ai_generations
  for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access
create policy ai_generations_service_role_all on ai_generations
  to service_role
  using (true)
  with check (true);

-- Index: Find recent generations for a user
-- Query: SELECT * FROM ai_generations WHERE user_id = ? ORDER BY created_at DESC
-- Used for displaying generation history
create index ai_generations_user_created_idx on ai_generations(user_id, created_at desc);

-- Optional: GIN index for JSONB queries on raw_response
-- Uncomment if you need to query inside the raw_response JSONB field
-- Example query: SELECT * FROM ai_generations WHERE raw_response @> '{"model": "gpt-4"}'
-- create index ai_generations_raw_response_idx on ai_generations using gin(raw_response);

-- =====================================================================================
-- TABLE: ai_generated_cards
-- =====================================================================================
-- Purpose: Store AI-generated flashcards before user acceptance
-- Acts as a staging area where users can review and accept/reject AI suggestions
-- Once accepted, a card is created in the cards table and linked via card_id

create table ai_generated_cards (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Owner reference
  -- CASCADE: When user is deleted, all their generated cards are deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Parent generation reference (composite FK added below)
  generation_id uuid not null,
  
  -- Reference to accepted card (null until user accepts)
  -- UNIQUE: Each generated card can only be accepted once
  -- SET NULL: If accepted card is deleted, this field becomes null (keeps history)
  card_id uuid unique references cards(id) on delete set null,
  
  -- Proposed card content
  -- These are the AI-suggested question and answer
  question text not null check (char_length(trim(question)) > 0),
  answer text not null check (char_length(trim(answer)) > 0),
  
  -- Acceptance tracking
  -- accepted: false = pending review, true = user accepted this card
  -- accepted_at: timestamp when user accepted the card
  accepted boolean not null default false,
  accepted_at timestamptz,
  
  -- Timestamps
  created_at timestamptz not null default timezone('utc', now()),
  
  -- Constraints
  -- Composite foreign key ensures generated card belongs to generation by same user
  -- CASCADE: When generation is deleted, all its generated cards are deleted
  constraint ai_generated_cards_generation_user_fkey 
    foreign key (generation_id, user_id) 
    references ai_generations(id, user_id) 
    on delete cascade
);

-- Enable Row Level Security
alter table ai_generated_cards enable row level security;

-- RLS Policy: Allow authenticated users to select their own generated cards
create policy ai_generated_cards_owner_select on ai_generated_cards
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert their own generated cards
create policy ai_generated_cards_owner_insert on ai_generated_cards
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update their own generated cards
create policy ai_generated_cards_owner_update on ai_generated_cards
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete their own generated cards
create policy ai_generated_cards_owner_delete on ai_generated_cards
  for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access
create policy ai_generated_cards_service_role_all on ai_generated_cards
  to service_role
  using (true)
  with check (true);

-- Partial index: Find pending (unaccepted) generated cards efficiently
-- This is the primary query for showing users cards awaiting review
-- WHERE clause makes this a partial index (only indexes unaccepted cards)
-- This saves space and improves performance for the most common query
create index ai_generated_cards_pending_idx 
  on ai_generated_cards(user_id, accepted) 
  where accepted = false;

-- =====================================================================================
-- TABLE: ai_generation_attempts
-- =====================================================================================
-- Purpose: Track AI generation attempts for rate limiting and monitoring
-- Used to enforce quota (e.g., 15 generations per 24 hours per user)
-- advisory_lock_key enables pessimistic locking to prevent race conditions

create table ai_generation_attempts (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Owner reference
  -- CASCADE: When user is deleted, all their attempts are deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Optional reference to successful generation
  -- SET NULL: If generation is deleted, this field becomes null (keeps history)
  generation_id uuid references ai_generations(id) on delete set null,
  
  -- Attempt outcome
  -- 'succeeded': Generation completed successfully
  -- 'failed': Generation failed (API error, invalid response, etc.)
  -- 'rate_limited': Attempt rejected due to rate limit
  status text not null check (status in ('succeeded', 'failed', 'rate_limited')),
  error_code text,  -- Error identifier if attempt failed
  
  -- Timestamps
  created_at timestamptz not null default timezone('utc', now()),
  
  -- Advisory lock key for rate limiting
  -- Calculated as hashtextextended(user_id::text, 0) to enable pg_advisory_xact_lock
  -- This allows pessimistic locking to prevent race conditions when checking quota
  advisory_lock_key bigint
);

-- Enable Row Level Security
alter table ai_generation_attempts enable row level security;

-- RLS Policy: Allow authenticated users to select their own attempts
create policy ai_generation_attempts_owner_select on ai_generation_attempts
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert their own attempts
create policy ai_generation_attempts_owner_insert on ai_generation_attempts
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update their own attempts
create policy ai_generation_attempts_owner_update on ai_generation_attempts
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete their own attempts
create policy ai_generation_attempts_owner_delete on ai_generation_attempts
  for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access
create policy ai_generation_attempts_service_role_all on ai_generation_attempts
  to service_role
  using (true)
  with check (true);

-- Index: Find recent attempts for rate limiting checks
-- Query: SELECT COUNT(*) FROM ai_generation_attempts 
--        WHERE user_id = ? AND created_at > now() - interval '24 hours'
-- Used for enforcing the 15 generations per 24 hours quota
create index ai_generation_attempts_user_created_idx 
  on ai_generation_attempts(user_id, created_at desc);

-- =====================================================================================
-- RATE LIMITING FUNCTION
-- =====================================================================================

-- Function: Enforce AI generation quota (15 per 24 hours)
-- Purpose: Check if user has exceeded their generation quota
-- Uses advisory lock to prevent race conditions in concurrent requests
-- Should be called before creating a new generation
-- Returns: true if quota allows generation, false if quota exceeded
create or replace function enforce_ai_attempt_quota(p_user_id uuid)
returns boolean as $$
declare
  v_lock_key bigint;
  v_attempt_count integer;
  v_quota_limit integer := 15;  -- Maximum generations per time window
  v_quota_window interval := interval '24 hours';  -- Time window for quota
begin
  -- Calculate advisory lock key from user_id
  -- This creates a unique lock per user
  v_lock_key := hashtextextended(p_user_id::text, 0);
  
  -- Acquire advisory lock for this user
  -- pg_advisory_xact_lock: Transaction-level lock (released at transaction end)
  -- This prevents race conditions when multiple requests check quota simultaneously
  perform pg_advisory_xact_lock(v_lock_key);
  
  -- Count attempts in the last 24 hours
  select count(*)
  into v_attempt_count
  from ai_generation_attempts
  where user_id = p_user_id
    and created_at > timezone('utc', now()) - v_quota_window;
  
  -- Check if quota exceeded
  if v_attempt_count >= v_quota_limit then
    return false;  -- Quota exceeded, reject generation
  end if;
  
  return true;  -- Quota allows generation
end;
$$ language plpgsql;
