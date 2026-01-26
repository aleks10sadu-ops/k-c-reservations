-- FIX: Make 'number' nullable on 'tables' to allow Rooms
-- Date: 2026-01-26

ALTER TABLE public.tables ALTER COLUMN number DROP NOT NULL;

-- Notify schema cache reload
NOTIFY pgrst, 'reload schema';
