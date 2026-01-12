-- Fix RLS policies for payments table
-- If RLS is enabled but no policy exists, all writes are blocked.

-- 1. Enable RLS (good practice, though might strictly block if no policies)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON payments;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;

-- 3. Create a permissive policy for authenticated users
CREATE POLICY "Enable all access for authenticated users" ON payments
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Grant permissions just in case
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payments TO service_role;
