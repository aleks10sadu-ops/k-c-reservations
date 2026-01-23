-- FIX: Add missing 'entity_type' and 'entity_id' columns to notifications
-- Error 'column "entity_type" of relation "notifications" does not exist' indicates
-- legacy triggers are trying to write polymorphism fields.
-- Date: 2026-01-23

-- 1. Add entity_type
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;

-- 2. Add entity_id (often goes with entity_type)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS entity_id UUID;

-- 3. Reload schema
NOTIFY pgrst, 'reload schema';
