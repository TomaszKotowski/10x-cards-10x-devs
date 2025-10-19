-- =====================================================================================
-- Migration: Setup Extensions and Custom Types
-- =====================================================================================
-- Purpose: Initialize required PostgreSQL extensions and custom types
-- Tables affected: None (foundation for subsequent migrations)
-- Author: Database Migration System
-- Date: 2025-10-18
-- =====================================================================================

-- =====================================================================================
-- EXTENSIONS
-- =====================================================================================

-- pgcrypto: Provides cryptographic functions including gen_random_uuid()
-- Required for generating UUIDs for primary keys across all tables
create extension if not exists pgcrypto;

-- citext: Case-insensitive text type for user-facing strings
-- Used for deck names to provide case-insensitive uniqueness
create extension if not exists citext;

-- =====================================================================================
-- CUSTOM TYPES
-- =====================================================================================

-- card_review_result: Enum type for tracking user's knowledge assessment of a card
-- Values:
--   'know': User correctly recalled the answer
--   'dont_know': User did not recall the answer correctly
-- This enum is used in card_reviews table and triggers Leitner box transitions
create type card_review_result as enum ('know', 'dont_know');

-- =====================================================================================
-- UTILITY FUNCTIONS
-- =====================================================================================

-- set_current_timestamp: Automatically updates the updated_at column to current UTC time
-- Purpose: Maintains accurate modification timestamps without application-level logic
-- Usage: Attached as BEFORE UPDATE trigger on tables with updated_at column
-- Returns: Modified NEW record with updated_at set to current UTC time
create or replace function set_current_timestamp()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;
