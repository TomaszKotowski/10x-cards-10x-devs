-- =====================================================================================
-- Migration: Insert Mock User for Development
-- =====================================================================================
-- Purpose: Create a test user for mock authentication during development
-- This user ID matches the hardcoded mock user in the API endpoint
-- =====================================================================================

-- Insert mock user into auth.users table
-- This is required because our tables have foreign key constraints to auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'mock-user@test.local',
  -- This is a bcrypt hash of 'password123' - not used in mock auth anyway
  '$2a$10$rHzJHVU0rLZ7KqKqKqKqKOqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq',
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"name":"Mock User","role":"developer"}'::jsonb,
  false,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Note: We're not inserting into auth.identities because it's not strictly required
-- for our mock authentication to work (we're using service role which bypasses auth)
