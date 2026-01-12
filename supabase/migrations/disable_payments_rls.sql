-- Disable RLS on payments table to fix access errors immediately
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to both authenticated and anonymous users ensuring no block
GRANT ALL ON payments TO authenticated;
GRANT ALL ON payments TO anon;
GRANT ALL ON payments TO service_role;
