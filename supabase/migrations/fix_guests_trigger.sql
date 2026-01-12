-- Fix for "record "new" has no field "updated_by"" error on guests table
-- This mirrors the fix applied to reservations table

ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Clean up potentially broken triggers
DROP TRIGGER IF EXISTS handle_updated_at ON guests;
DROP TRIGGER IF EXISTS set_updated_by ON guests;

-- Ensure generic update_updated_at_column function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Re-create the standard updated_at trigger
DROP TRIGGER IF EXISTS update_guests_updated_at ON guests;
CREATE TRIGGER update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
