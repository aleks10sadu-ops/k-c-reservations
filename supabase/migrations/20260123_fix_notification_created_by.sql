-- FIX: Add missing 'created_by' column to notifications
-- Error 'column "created_by" of relation "notifications" does not exist'
-- Adding 'created_by' and 'updated_by' to be safe.
-- Date: 2026-01-23

-- 1. Add created_by
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add updated_by (proactive)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Reload schema
NOTIFY pgrst, 'reload schema';
