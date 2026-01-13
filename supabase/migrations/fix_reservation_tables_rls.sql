-- Ultra-permissive RLS for reservation_tables to ensure synchronization works regardless of session
-- This is a temporary measure to isolate the issue

ALTER TABLE reservation_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON reservation_tables;
DROP POLICY IF EXISTS "Allow all" ON reservation_tables;

CREATE POLICY "Allow all for all roles" ON reservation_tables 
    FOR ALL 
    USING (true)
    WITH CHECK (true);

-- Similar policy for reservation_menu_items
ALTER TABLE reservation_menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON reservation_menu_items;
DROP POLICY IF EXISTS "Allow all" ON reservation_menu_items;

CREATE POLICY "Allow all for all roles" ON reservation_menu_items 
    FOR ALL 
    USING (true)
    WITH CHECK (true);
