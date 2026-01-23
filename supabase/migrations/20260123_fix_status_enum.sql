-- Fix Status Enum to include 'prepaid'
-- Fixes 400 Bad Request when causing status mismatch
-- Date: 2026-01-23

-- 1. Drop existing constraint
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;

-- 2. Add new constraint with 'prepaid'
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check
    CHECK (status::text = ANY (ARRAY['new', 'confirmed', 'in_progress', 'paid', 'prepaid', 'canceled', 'completed']::text[]));

-- 3. Reload schema cache
NOTIFY pgrst, 'reload schema';
