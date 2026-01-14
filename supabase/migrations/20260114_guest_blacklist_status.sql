-- Update guest status check constraint to include 'blacklist'
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_status_check;
ALTER TABLE public.guests ADD CONSTRAINT guests_status_check 
    CHECK (status IN ('regular', 'frequent', 'vip', 'blacklist'));

-- Ensure any existing 'blacklisted' rows (if they were somehow inserted) are updated or handled
-- But since it failed, there shouldn't be any.
