-- Ensure DELETE permissions and policies for payments table

-- 1. Ensure RLS is disabled or has a proper policy for DELETE
-- Option A: Just disable RLS (broadest fix)
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;

-- Option B: If they prefer keeping RLS enabled, add explicit DELETE policy
-- CREATE POLICY "Enable delete access for authenticated users" ON payments
--     FOR DELETE TO authenticated USING (true);

-- 2. Explicitly grant DELETE permission to all relevant roles
GRANT DELETE ON payments TO authenticated;
GRANT DELETE ON payments TO anon;
GRANT DELETE ON payments TO service_role;

-- 3. Verify the sync trigger doesn't fail on delete
-- The trigger sync_reservation_payment_data uses OLD.reservation_id on DELETE, which is correct.
