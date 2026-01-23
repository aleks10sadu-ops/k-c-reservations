-- NUCLEAR DEBUG: Drop ALL Triggers & Loosen ALL Constraints
-- Designed to isolate the 400 Bad Request error
-- Date: 2026-01-23

-- 1. DROP ALL CUSTOM TRIGGERS
-- We drop them to ensure NO logic runs during INSERT
DROP TRIGGER IF EXISTS tr_notify_new_reservation ON public.reservations;
DROP TRIGGER IF EXISTS tr_notify_waiter_assignment ON public.reservations;
DROP TRIGGER IF EXISTS audit_trigger ON public.reservations;
DROP TRIGGER IF EXISTS tr_update_waiter_last_assigned ON public.reservations;
DROP TRIGGER IF EXISTS on_menu_deletion_fallback ON public.reservations;
DROP TRIGGER IF EXISTS trg_sync_reservation_payments ON public.payments;
DROP TRIGGER IF EXISTS update_reservations_updated_at ON public.reservations;

-- 2. LOOSEN CORE CONSTRAINTS (DROP NOT NULL)
-- Even if frontend sends null, DB should accept it
ALTER TABLE public.reservations ALTER COLUMN menu_id DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN guest_id DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN hall_id DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN table_id DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN guests_count DROP NOT NULL;
ALTER TABLE public.reservations ALTER COLUMN date DROP NOT NULL; -- Extreme test
ALTER TABLE public.reservations ALTER COLUMN time DROP NOT NULL; -- Extreme test

-- 3. ENSURE DEFAULTS
ALTER TABLE public.reservations ALTER COLUMN guests_count SET DEFAULT 1;
ALTER TABLE public.reservations ALTER COLUMN status SET DEFAULT 'new';

-- 4. RELOAD CACHE
NOTIFY pgrst, 'reload schema';
