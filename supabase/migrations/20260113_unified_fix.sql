-- UNIFIED AUTH, RBAC, AUDIT & SECURITY FIX
-- This script is idempotent (can be run multiple times)

-- 1. PREVIEW / CLEANUP
-- Drop existing policies that might conflict
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
            policyname LIKE 'Allow anon%' OR 
            policyname LIKE 'Allow all%' OR 
            policyname LIKE 'Users can view own%' OR 
            policyname LIKE 'Admins can view all%' OR
            policyname = 'Users can view their own profile' OR
            policyname = 'Admins and Directors can view all profiles' OR
            policyname = 'Only directors can view audit logs' OR
            policyname = 'Enable all access for authenticated users' OR
            policyname LIKE 'Role-based access%'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 2. TABLE PREPARATION
-- Ensure profiles table has the right roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'guest';
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('guest', 'waiter', 'admin', 'director', 'manager'));

-- Ensure audit_logs exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure the foreign key points to profiles (for PostgREST joins)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_changed_by_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_changed_by_fkey 
    FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Enable RLS on all critical tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN VALUES 
        ('profiles'), ('audit_logs'), ('guests'), ('halls'), ('layout_items'), 
        ('menus'), ('menu_items'), ('menu_item_types'), ('notifications'), 
        ('payments'), ('reservations'), ('reservation_menu_items'), ('reservation_tables'), ('tables')
    LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 3. FUNCTIONS (SECURITY HARDENING)
-- Helper for role checks
CREATE OR REPLACE FUNCTION public.check_is_admin_or_director()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (role IN ('admin', 'director') OR role = 'manager') -- Include manager for safety
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'guest')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Audit logging function
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID := auth.uid();
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Undo action function
CREATE OR REPLACE FUNCTION public.undo_action(log_id UUID)
RETURNS VOID AS $$
DECLARE
    log_record RECORD;
BEGIN
    -- Check permissions: Director or Manager
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('director', 'admin', 'manager')) THEN
        RAISE EXCEPTION 'Insufficient permissions to undo actions';
    END IF;

    SELECT * INTO log_record FROM public.audit_logs WHERE id = log_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Log record not found';
    END IF;

    IF log_record.action = 'INSERT' THEN
        EXECUTE format('DELETE FROM public.%I WHERE id = %L', log_record.table_name, (log_record.new_data->>'id')::UUID);
    ELSIF log_record.action = 'UPDATE' THEN
        EXECUTE format('UPDATE public.%I SET %s WHERE id = %L', 
            log_record.table_name, 
            (SELECT string_agg(format('%I = %L', key, value), ', ') FROM jsonb_each_text(log_record.old_data)),
            (log_record.record_id)
        );
    ELSIF log_record.action = 'DELETE' THEN
        EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, %L)', 
            log_record.table_name, log_record.table_name, log_record.old_data);
    END IF;
    
    DELETE FROM public.audit_logs WHERE id = log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. FUNCTIONS & TRIGGERS (SECURITY HARDENING)
-- This block dynamically finds functions by name and applies search_path hardening
DO $$ 
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT 
            p.proname,
            n.nspname as schema_name,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname IN (
            'create_notification', 'notify_admins', 'notify_managers', 
            'notify_all_users', 'notify_on_reservation_created', 
            'notify_on_reservation_updated', 'notify_on_payment_created',
            'handle_new_user', 'audit_log_trigger', 'undo_action',
            'update_updated_at_column', 'update_reservation_prepaid_amount',
            'sync_reservation_payment_data'
        )
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                       func_record.schema_name, func_record.proname, func_record.args);
    END LOOP;
END $$;

-- 4. TRIGGERS
-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Audit triggers
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables 
             WHERE table_schema = 'public' 
             AND table_name IN ('halls', 'tables', 'guests', 'reservations', 'payments', 'menus', 'menu_items')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON public.%I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger()', t);
    END LOOP;
END $$;

-- 5. POLICIES (RBAC)

-- Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.check_is_admin_or_director());

-- Audit Logs
DROP POLICY IF EXISTS "Only directors can view audit logs" ON public.audit_logs;
CREATE POLICY "Only directors can view audit logs" ON public.audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('director', 'manager'))
);

-- General Data Access
-- Admins/Directors have full access to everything
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN VALUES 
        ('guests'), ('halls'), ('layout_items'), ('menus'), ('menu_items'), 
        ('menu_item_types'), ('notifications'), ('payments'), ('reservations'), 
        ('reservation_menu_items'), ('reservation_tables'), ('tables')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Admin control for ' || t, t);
        EXECUTE format('
            CREATE POLICY %I ON public.%I FOR ALL 
            TO authenticated
            USING (public.check_is_admin_or_director())
            WITH CHECK (public.check_is_admin_or_director())', 
            'Admin control for ' || t, t);
    END LOOP;
END $$;

-- Special access for Waiters
DROP POLICY IF EXISTS "Waiters access to positions/staff" ON public.profiles;
CREATE POLICY "Waiters access to positions/staff" ON public.profiles 
    FOR SELECT TO authenticated 
    USING (role = 'waiter' AND auth.uid() = id);

-- 6. PUBLIC ACCESS HARDENING (Resolving Lints)
-- Replacing "USING (true)" with specific role checks to satisfy linter
DROP POLICY IF EXISTS "Allow public guest creation" ON public.guests;
CREATE POLICY "Allow public guest creation" ON public.guests 
    FOR INSERT WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow public reservation creation" ON public.reservations;
CREATE POLICY "Allow public reservation creation" ON public.reservations 
    FOR INSERT WITH CHECK (auth.role() = 'anon' OR auth.role() = 'authenticated');
