-- Fix missing RLS for layout_items and reservation_tables
ALTER TABLE layout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users" ON layout_items;
CREATE POLICY "Allow all for authenticated users" ON layout_items 
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for authenticated users" ON reservation_tables;
CREATE POLICY "Allow all for authenticated users" ON reservation_tables 
    FOR ALL USING (auth.role() = 'authenticated');

-- Ensure all tables have consistent RLS Policies
-- This migration helps with the issue "информация не сохраняется в Supabase сразу"
