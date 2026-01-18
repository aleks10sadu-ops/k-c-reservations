-- Migration for Waiter Management and Walk-in Guests
-- Date: 2026-01-17

-- 1. Add is_walk_in and waiter_id to reservations
ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- 2. Add last_assigned_at to staff for queue logic
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMP WITH TIME ZONE;

-- 3. Create a function to auto-update last_assigned_at when a waiter is assigned
CREATE OR REPLACE FUNCTION public.update_waiter_last_assigned()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
        UPDATE public.staff 
        SET last_assigned_at = NOW()
        WHERE id = NEW.waiter_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger on reservations
DROP TRIGGER IF EXISTS tr_update_waiter_last_assigned ON public.reservations;
CREATE TRIGGER tr_update_waiter_last_assigned
AFTER INSERT OR UPDATE OF waiter_id ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.update_waiter_last_assigned();

-- 5. Comments
COMMENT ON COLUMN public.reservations.is_walk_in IS 'Whether the guest came without a prior booking';
COMMENT ON COLUMN public.reservations.waiter_id IS 'Assigned waiter for this reservation';
COMMENT ON COLUMN public.staff.last_assigned_at IS 'Last time this staff member was assigned to a table (for queue logic)';
