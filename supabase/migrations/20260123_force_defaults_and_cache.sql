-- FORCE FIX: Reload Schema Cache & Loose Constraints
-- Resolves stubborn 400 Bad Request errors due to stale cache or strict constraints
-- Date: 2026-01-23

-- 1. Reload PostgREST Schema Cache
-- This forces Supabase to re-read the table definitions
NOTIFY pgrst, 'reload schema';

-- 2. Force Loose Constraints (Drop NOT NULL) on all optional fields
-- This ensures even if the frontend sends null, the DB accepts it
ALTER TABLE public.reservations ALTER COLUMN prepaid_amount DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN balance DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN surplus DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN created_via DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN is_walk_in DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN waiter_id DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN updated_by DROP NOT NULL;

-- 3. Force Defaults
-- This ensures even if the frontend sends nothing (undefined), the DB uses a default
ALTER TABLE public.reservations ALTER COLUMN prepaid_amount SET DEFAULT 0;
ALTER TABLE public.reservations ALTER COLUMN balance SET DEFAULT 0;
ALTER TABLE public.reservations ALTER COLUMN surplus SET DEFAULT 0;
ALTER TABLE public.reservations ALTER COLUMN created_via SET DEFAULT 'website';
ALTER TABLE public.reservations ALTER COLUMN is_walk_in SET DEFAULT FALSE;

-- 4. Verify Status Enum/Constraint
-- Ensure 'new' is valid
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
    CHECK (status::text = ANY (ARRAY['new', 'confirmed', 'in_progress', 'paid', 'canceled', 'completed']::text[]));

-- 5. Re-run Trigger Cleanup (Just to be safe)
DROP TRIGGER IF EXISTS tr_update_waiter_last_assigned ON public.reservations;
CREATE TRIGGER tr_update_waiter_last_assigned
    AFTER INSERT OR UPDATE OF waiter_id ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.update_waiter_last_assigned();
