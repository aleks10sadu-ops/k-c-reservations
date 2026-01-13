-- 1. Setup ENUM if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('guest', 'waiter', 'admin', 'director', 'manager');
    END IF;
END $$;

-- 2. Clean up dependencies safety
-- Drop policies FIRST (exhaustively)
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Drop functions that depend on the old column type
DROP FUNCTION IF EXISTS public.check_is_admin_or_director() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Alter the role column securely
-- Remove default and constraints first
ALTER TABLE public.profiles ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Ensure data is clean (all roles must be valid ENUM strings)
UPDATE public.profiles SET role = 'guest' WHERE role NOT IN ('guest', 'waiter', 'admin', 'director', 'manager');

-- Convert type
ALTER TABLE public.profiles 
    ALTER COLUMN role TYPE public.user_role 
    USING role::public.user_role;

-- Set new default
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'guest'::public.user_role;

-- 4. Recreate helper functions with ENUM support
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_is_admin_or_director()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin'::public.user_role, 'director'::public.user_role, 'manager'::public.user_role)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'guest'::public.user_role)
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Restore RLS Policies (OPTIMIZED)

-- Profiles: Users see themselves, Admins see all
CREATE POLICY "profiles_read_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
  public.check_is_admin_or_director()
);

-- Audit Logs
CREATE POLICY "audit_logs_director_read" ON public.audit_logs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('director'::public.user_role, 'manager'::public.user_role)
  )
);

-- General Access for other tables (Re-enable basic auth access)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN VALUES 
        ('guests'), ('halls'), ('layout_items'), 
        ('menus'), ('menu_items'), ('menu_item_types'), ('notifications'), 
        ('payments'), ('reservations'), ('reservation_menu_items'), ('reservation_tables'), ('tables')
    LOOP
        EXECUTE format('CREATE POLICY "Role-based access on %I" ON public.%I FOR ALL USING (auth.uid() IS NOT NULL)', t, t);
    END LOOP;
END $$;
