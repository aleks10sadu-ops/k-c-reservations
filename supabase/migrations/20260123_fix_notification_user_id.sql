-- FIX: Add missing 'user_id' column to notifications
-- Error 'column "user_id" of relation "notifications" does not exist' indicates
-- some legacy trigger is trying to write to this column.
-- We add it to prevent the error.
-- Date: 2026-01-23

-- 1. Add user_id column if it doesn't exist
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Reload schema
NOTIFY pgrst, 'reload schema';
