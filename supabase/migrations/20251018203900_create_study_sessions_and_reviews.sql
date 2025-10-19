-- =====================================================================================
-- Migration: Create Study Sessions and Card Reviews Tables
-- =====================================================================================
-- Purpose: Track study sessions and individual card review events
-- Tables: study_sessions, card_reviews
-- Features: Leitner box transitions, review analytics, automatic card scheduling
-- Author: Database Migration System
-- Date: 2025-10-18
-- =====================================================================================

-- =====================================================================================
-- TABLE: study_sessions
-- =====================================================================================
-- Purpose: Track study sessions for analytics and progress monitoring
-- Each session represents a continuous period of studying a specific deck
-- Sessions track overall statistics: cards reviewed, know/don't know counts

create table study_sessions (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Owner reference
  -- CASCADE: When user is deleted, all their sessions are deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Deck being studied (composite FK added below)
  deck_id uuid not null,
  
  -- Session timing
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,  -- NULL while session is active, set when user ends session
  
  -- Session statistics
  -- Incremented as user reviews cards during the session
  cards_reviewed integer not null default 0 check (cards_reviewed >= 0),
  know_count integer not null default 0 check (know_count >= 0),
  dont_know_count integer not null default 0 check (dont_know_count >= 0),
  
  -- Constraints
  -- Composite unique constraint for foreign key references from card_reviews
  constraint study_sessions_id_user_key unique (id, user_id),
  
  -- Composite foreign key ensures session is for deck owned by same user
  -- CASCADE: When deck is deleted, all its study sessions are deleted
  constraint study_sessions_deck_user_fkey 
    foreign key (deck_id, user_id) 
    references decks(id, user_id) 
    on delete cascade
);

-- Enable Row Level Security
alter table study_sessions enable row level security;

-- RLS Policy: Allow authenticated users to select their own sessions
create policy study_sessions_owner_select on study_sessions
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert their own sessions
create policy study_sessions_owner_insert on study_sessions
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update their own sessions
create policy study_sessions_owner_update on study_sessions
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete their own sessions
create policy study_sessions_owner_delete on study_sessions
  for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access
create policy study_sessions_service_role_all on study_sessions
  to service_role
  using (true)
  with check (true);

-- Index: Find recent sessions for a user (for history/analytics)
-- Query: SELECT * FROM study_sessions WHERE user_id = ? ORDER BY started_at DESC
-- Used for displaying study history and calculating streaks
create index study_sessions_user_started_idx on study_sessions(user_id, started_at desc);

-- =====================================================================================
-- TABLE: card_reviews
-- =====================================================================================
-- Purpose: Track individual card review events within study sessions
-- Records each time a user reviews a card and their result (know/don't know)
-- Used for analytics and to trigger card scheduling updates via Leitner system

create table card_reviews (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Owner reference
  -- CASCADE: When user is deleted, all their reviews are deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Session and card references (composite FKs added below)
  session_id uuid not null,
  card_id uuid not null,
  
  -- Review outcome
  -- 'know': User correctly recalled the answer -> move card to next box
  -- 'dont_know': User failed to recall -> reset card to box 1
  result card_review_result not null,
  
  -- Leitner box transition tracking
  -- Records the box transition for analytics and debugging
  prev_box smallint not null check (prev_box between 1 and 3),
  new_box smallint not null check (new_box between 1 and 3),
  
  -- Review timing
  reviewed_at timestamptz not null default timezone('utc', now()),
  response_ms integer check (response_ms >= 0),  -- Time taken to answer (milliseconds)
  
  -- Constraints
  -- Composite foreign keys ensure all entities belong to same user
  -- This prevents cross-user data leakage and maintains referential integrity
  
  -- CASCADE: When session is deleted, all its reviews are deleted
  constraint card_reviews_session_user_fkey 
    foreign key (session_id, user_id) 
    references study_sessions(id, user_id) 
    on delete cascade,
  
  -- CASCADE: When card is deleted, all its reviews are deleted
  constraint card_reviews_card_user_fkey 
    foreign key (card_id, user_id) 
    references cards(id, user_id) 
    on delete cascade
);

-- Enable Row Level Security
alter table card_reviews enable row level security;

-- RLS Policy: Allow authenticated users to select their own reviews
create policy card_reviews_owner_select on card_reviews
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert their own reviews
create policy card_reviews_owner_insert on card_reviews
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update their own reviews
create policy card_reviews_owner_update on card_reviews
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete their own reviews
create policy card_reviews_owner_delete on card_reviews
  for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access
create policy card_reviews_service_role_all on card_reviews
  to service_role
  using (true)
  with check (true);

-- =====================================================================================
-- LEITNER SYSTEM IMPLEMENTATION
-- =====================================================================================

-- Function: Apply review result to update card scheduling
-- Purpose: Implements Leitner system logic for spaced repetition
-- Algorithm:
--   - 'know': Move card to next box (1->2, 2->3, 3->3)
--   - 'dont_know': Reset card to box 1
-- Intervals:
--   - Box 1: 1 day (new/difficult cards)
--   - Box 2: 3 days (medium difficulty)
--   - Box 3: 7 days (well-known cards)
create or replace function apply_review(
  p_card_id uuid,
  p_result card_review_result
)
returns void as $$
declare
  v_current_box smallint;
  v_new_box smallint;
  v_due_interval interval;
begin
  -- Get current box for the card
  select leitner_box into v_current_box
  from cards
  where id = p_card_id;
  
  -- Calculate new box based on review result
  if p_result = 'know' then
    -- User knows the card: move to next box (max 3)
    v_new_box = least(v_current_box + 1, 3);
  else
    -- User doesn't know the card: reset to box 1
    v_new_box = 1;
  end if;
  
  -- Calculate due date based on new box
  -- These intervals implement the Leitner spaced repetition schedule
  case v_new_box
    when 1 then v_due_interval = interval '1 day';   -- Review tomorrow
    when 2 then v_due_interval = interval '3 days';  -- Review in 3 days
    when 3 then v_due_interval = interval '7 days';  -- Review in a week
  end case;
  
  -- Update card with new box, due date, and last reviewed timestamp
  update cards
  set 
    leitner_box = v_new_box,
    due_at = timezone('utc', now()) + v_due_interval,
    last_reviewed_at = timezone('utc', now())
  where id = p_card_id;
end;
$$ language plpgsql;

-- Trigger function: Apply review and update card after review is recorded
-- Purpose: Automatically update card scheduling when a review is inserted
-- This ensures card state is always consistent with review history
create or replace function card_reviews_apply_review()
returns trigger as $$
begin
  -- Apply the review result to update card scheduling
  -- Uses the apply_review function defined above
  perform apply_review(new.card_id, new.result);
  return new;
end;
$$ language plpgsql;

-- Trigger: Automatically apply review after insert
-- AFTER INSERT: Runs after the review is committed to the database
-- This ensures the review record exists before updating the card
create trigger card_reviews_apply_review
  after insert on card_reviews
  for each row
  execute function card_reviews_apply_review();

-- =====================================================================================
-- INDEXES FOR QUERY PERFORMANCE
-- =====================================================================================

-- Index: Find reviews by user and date (for analytics)
-- Query: SELECT * FROM card_reviews WHERE user_id = ? ORDER BY reviewed_at DESC
-- Used for displaying review history and calculating statistics
create index card_reviews_user_reviewed_idx on card_reviews(user_id, reviewed_at desc);

-- Index: Find review history for a specific card
-- Query: SELECT * FROM card_reviews WHERE card_id = ? ORDER BY reviewed_at DESC
-- Used for displaying card-specific review history and performance trends
create index card_reviews_card_idx on card_reviews(card_id, reviewed_at desc);
