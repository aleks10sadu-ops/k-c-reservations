-- Add 'completed' status to reservations table
-- We assume it's a TEXT column with a CHECK constraint based on the error.

DO $$ 
BEGIN
    -- Try to drop common constraint names if they exist
    ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
    ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservation_status_check;
    
    -- Add the new constraint
    ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check 
        CHECK (status IN ('new', 'in_progress', 'prepaid', 'paid', 'canceled', 'completed'));
EXCEPTION
    WHEN undefined_column THEN
        -- Handle case where status column might not exist (shouldn't happen)
        RAISE NOTICE 'Column status does not exist in reservations table';
    WHEN OTHERS THEN
        -- Fallback: if it really was an enum after all (unlikely given the error)
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'reservation_status' AND e.enumlabel = 'completed') THEN
                ALTER TYPE reservation_status ADD VALUE 'completed';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not update status via CHECK or ENUM: %', SQLERRM;
        END;
END $$;
