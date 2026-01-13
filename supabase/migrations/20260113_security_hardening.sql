-- SECURITY HARDENING & LINT FIXES
-- Date: 2026-01-13

-- 1. ENABLE RLS ON MISSING TABLES
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. FIX FUNCTION SEARCH PATHS (Prevents search_path hijacking)
-- This ensures functions always use the 'public' schema for lookups.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.audit_log_trigger() SET search_path = public;
ALTER FUNCTION public.undo_action(uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_reservation_prepaid_amount() SET search_path = public;
ALTER FUNCTION public.sync_reservation_payment_data(uuid) SET search_path = public;

-- Fix search paths for notification functions (if they exist)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_notification') THEN 
        ALTER FUNCTION public.create_notification(uuid, text, text, text) SET search_path = public; 
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_admins') THEN 
        ALTER FUNCTION public.notify_admins(text, text, text) SET search_path = public; 
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_managers') THEN 
        ALTER FUNCTION public.notify_managers(text, text, text) SET search_path = public; 
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_all_users') THEN 
        ALTER FUNCTION public.notify_all_users(text, text, text) SET search_path = public; 
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_on_reservation_created') THEN 
        ALTER FUNCTION public.notify_on_reservation_created() SET search_path = public; 
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_on_reservation_updated') THEN 
        ALTER FUNCTION public.notify_on_reservation_updated() SET search_path = public; 
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'notify_on_payment_created') THEN 
        ALTER FUNCTION public.notify_on_payment_created() SET search_path = public; 
    END IF;
END $$;

-- 3. HARDEN OVERLY PERMISSIVE POLICIES
-- Transitioning "Allow anon ..." (true) to role-based system.

-- Helper check function (optional but clarifies policies)
CREATE OR REPLACE FUNCTION public.check_is_admin_or_director()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'director')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop permissive policies identified by linter and replace them
DO $$
DECLARE
    t text;
    p text;
BEGIN
    -- List of tables and policy fragments to clean up
    FOR t, p IN VALUES 
        ('guests', 'Allow anon'), ('halls', 'Allow anon'), ('menus', 'Allow anon'), 
        ('menu_items', 'Allow anon'), ('reservations', 'Allow anon'), ('tables', 'Allow anon'),
        ('reservation_menu_items', 'Allow all for all roles'), ('reservation_tables', 'Allow all for all roles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p || ' insert', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p || ' update', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p || ' delete', t);
        
        -- Replace with authenticated + role check
        EXECUTE format('
            CREATE POLICY %I ON %I FOR ALL 
            USING (auth.role() = ''authenticated'' AND public.check_is_admin_or_director())
            WITH CHECK (auth.role() = ''authenticated'' AND public.check_is_admin_or_director())', 
            'Role-based access for ' || t, t);
    END LOOP;
END $$;

-- Fix payments specifically
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payments;
CREATE POLICY "Role-based access for payments" ON payments
    FOR ALL
    TO authenticated
    USING (public.check_is_admin_or_director())
    WITH CHECK (public.check_is_admin_or_director());

-- notifications policies cleanup
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'notifications') THEN
        DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;
        DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
        DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
        
        CREATE POLICY "Admins can view all notifications" ON notifications FOR SELECT USING (public.check_is_admin_or_director());
        CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;
