-- =====================================================================================
-- Migration: Create Support Tables
-- =====================================================================================
-- Purpose: Create tables for issue reporting and deck statistics
-- Tables: card_issue_reports, deck_stats
-- Features: Issue tracking workflow, materialized deck statistics with triggers
-- Author: Database Migration System
-- Date: 2025-10-18
-- =====================================================================================

-- =====================================================================================
-- TABLE: card_issue_reports
-- =====================================================================================
-- Purpose: Allow users to report problems with flashcards
-- Supports quality improvement workflow for both manual and AI-generated cards
-- Tracks issue status through workflow: open -> in_review -> resolved/dismissed

create table card_issue_reports (
  -- Primary identifier
  id uuid primary key default gen_random_uuid(),
  
  -- Owner reference
  -- CASCADE: When user is deleted, all their reports are deleted
  user_id uuid not null references auth.users(id) on delete cascade,
  
  -- Card being reported (composite FK added below)
  card_id uuid not null,
  
  -- Issue details
  -- description: User's explanation of the problem
  description text not null check (char_length(trim(description)) > 0),
  
  -- Issue status workflow
  -- 'open': Issue reported, awaiting review
  -- 'in_review': Issue is being investigated
  -- 'resolved': Issue has been fixed
  -- 'dismissed': Issue was not valid or won't be fixed
  status text not null default 'open' 
    check (status in ('open', 'in_review', 'resolved', 'dismissed')),
  resolution_notes text,  -- Admin/user notes on how issue was resolved
  
  -- Timestamps
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  
  -- Constraints
  -- Composite foreign key ensures report is for card owned by same user
  -- CASCADE: When card is deleted, all its issue reports are deleted
  constraint card_issue_reports_card_user_fkey 
    foreign key (card_id, user_id) 
    references cards(id, user_id) 
    on delete cascade
);

-- Enable Row Level Security
alter table card_issue_reports enable row level security;

-- RLS Policy: Allow authenticated users to select their own reports
create policy card_issue_reports_owner_select on card_issue_reports
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to insert their own reports
create policy card_issue_reports_owner_insert on card_issue_reports
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to update their own reports
create policy card_issue_reports_owner_update on card_issue_reports
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policy: Allow authenticated users to delete their own reports
create policy card_issue_reports_owner_delete on card_issue_reports
  for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access
create policy card_issue_reports_service_role_all on card_issue_reports
  to service_role
  using (true)
  with check (true);

-- Trigger: Automatically update updated_at timestamp
create trigger card_issue_reports_set_updated_at
  before update on card_issue_reports
  for each row
  execute function set_current_timestamp();

-- Index: Find recent reports for a user
-- Query: SELECT * FROM card_issue_reports WHERE user_id = ? ORDER BY created_at DESC
-- Used for displaying issue history
create index card_issue_reports_user_created_idx 
  on card_issue_reports(user_id, created_at desc);

-- =====================================================================================
-- TABLE: deck_stats
-- =====================================================================================
-- Purpose: Materialized statistics for each deck
-- Maintained by triggers for real-time updates without expensive aggregations
-- Stores total card count and number of due cards for quick dashboard queries

create table deck_stats (
  -- Primary identifier (one row per deck)
  deck_id uuid primary key,
  
  -- Owner reference
  user_id uuid not null,
  
  -- Statistics
  -- cards_total: Total number of cards in the deck
  -- due_count: Number of cards currently due for review
  cards_total integer not null default 0 check (cards_total >= 0),
  due_count integer not null default 0 check (due_count >= 0),
  
  -- Timestamp
  last_calculated_at timestamptz not null default timezone('utc', now()),
  
  -- Constraints
  -- Composite foreign key ensures stats are for deck owned by same user
  -- CASCADE: When deck is deleted, its stats are deleted
  constraint deck_stats_deck_user_fkey 
    foreign key (deck_id, user_id) 
    references decks(id, user_id) 
    on delete cascade
);

-- Enable Row Level Security
alter table deck_stats enable row level security;

-- RLS Policy: Allow authenticated users to select their own deck stats
create policy deck_stats_owner_select on deck_stats
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policy: Service role has full access for trigger operations
-- Triggers need to insert/update/delete stats without user context
create policy deck_stats_service_role_all on deck_stats
  to service_role
  using (true)
  with check (true);

-- Index: Find decks sorted by due count (for prioritizing study sessions)
-- Query: SELECT * FROM deck_stats WHERE user_id = ? ORDER BY due_count DESC
-- Used for showing decks with most due cards first
create index deck_stats_user_due_idx on deck_stats(user_id, due_count desc);

-- =====================================================================================
-- DECK STATISTICS MAINTENANCE
-- =====================================================================================

-- Function: Refresh deck statistics
-- Purpose: Recalculates total cards and due count for a specific deck
-- Called by triggers when cards are added, removed, or reviewed
-- Uses UPSERT to handle both new decks and existing stats
create or replace function refresh_deck_stats(p_deck_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_cards_total integer;
  v_due_count integer;
begin
  -- Get user_id and calculate stats from cards table
  select 
    user_id,
    count(*),  -- Total cards in deck
    count(*) filter (where due_at <= timezone('utc', now()))  -- Cards due now
  into v_user_id, v_cards_total, v_due_count
  from cards
  where deck_id = p_deck_id
  group by user_id;
  
  -- Handle case where deck has no cards
  if v_user_id is null then
    -- Get user_id from decks table
    select user_id into v_user_id
    from decks
    where id = p_deck_id;
    
    -- Set counts to zero
    v_cards_total := 0;
    v_due_count := 0;
  end if;
  
  -- Upsert stats (insert or update if exists)
  insert into deck_stats (deck_id, user_id, cards_total, due_count, last_calculated_at)
  values (p_deck_id, v_user_id, v_cards_total, v_due_count, timezone('utc', now()))
  on conflict (deck_id)
  do update set
    cards_total = excluded.cards_total,
    due_count = excluded.due_count,
    last_calculated_at = excluded.last_calculated_at;
end;
$$ language plpgsql security definer;

-- Trigger function: Refresh stats after card changes
-- Purpose: Automatically update deck_stats when cards are added, removed, or modified
-- Handles INSERT, UPDATE, DELETE operations on cards table
create or replace function cards_refresh_deck_stats()
returns trigger as $$
begin
  -- Handle different trigger operations
  if tg_op = 'DELETE' then
    -- Card was deleted: refresh stats for old deck
    perform refresh_deck_stats(old.deck_id);
    return old;
  elsif tg_op = 'UPDATE' then
    -- Card was updated: refresh stats for both old and new deck (if deck changed)
    perform refresh_deck_stats(old.deck_id);
    if old.deck_id != new.deck_id then
      perform refresh_deck_stats(new.deck_id);
    end if;
    return new;
  elsif tg_op = 'INSERT' then
    -- Card was inserted: refresh stats for new deck
    perform refresh_deck_stats(new.deck_id);
    return new;
  end if;
end;
$$ language plpgsql security definer;

-- Trigger: Refresh deck stats after card changes
-- AFTER INSERT/UPDATE/DELETE: Runs after the card operation is committed
-- This ensures the card changes are visible when calculating stats
create trigger cards_refresh_deck_stats
  after insert or update or delete on cards
  for each row
  execute function cards_refresh_deck_stats();

-- Trigger function: Refresh stats after card reviews
-- Purpose: Update due_count when cards are reviewed (changes due_at)
-- Note: This is redundant with cards_refresh_deck_stats trigger on cards table
-- (card_reviews trigger updates cards.due_at, which triggers cards_refresh_deck_stats)
-- But we keep it for explicit clarity and as a safety net
create or replace function card_reviews_refresh_deck_stats()
returns trigger as $$
declare
  v_deck_id uuid;
begin
  -- Get deck_id from the reviewed card
  select deck_id into v_deck_id
  from cards
  where id = new.card_id;
  
  -- Refresh stats for that deck
  perform refresh_deck_stats(v_deck_id);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Refresh deck stats after card reviews
-- AFTER INSERT: Runs after the review is committed
-- This ensures the card's due_at has been updated by the apply_review trigger
create trigger card_reviews_refresh_deck_stats
  after insert on card_reviews
  for each row
  execute function card_reviews_refresh_deck_stats();

-- Trigger function: Initialize deck stats when deck is created
-- Purpose: Create initial stats row (0 cards, 0 due) when new deck is created
create or replace function decks_initialize_stats()
returns trigger as $$
begin
  -- Create initial stats row for new deck
  insert into deck_stats (deck_id, user_id, cards_total, due_count, last_calculated_at)
  values (new.id, new.user_id, 0, 0, timezone('utc', now()));
  return new;
end;
$$ language plpgsql security definer;

-- Trigger: Initialize stats when deck is created
-- AFTER INSERT: Runs after the deck is committed
create trigger decks_initialize_stats
  after insert on decks
  for each row
  execute function decks_initialize_stats();
