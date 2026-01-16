-- Migration for Staff Management System
-- Date: 2026-01-17

-- 1. Create staff_roles table
CREATE TABLE IF NOT EXISTS public.staff_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.staff_roles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    base_rate NUMERIC(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create staff_shifts table
CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    shift_type TEXT NOT NULL CHECK (shift_type IN ('full', 'half', 'none')),
    override_rate NUMERIC(10, 2), -- Custom rate for this specific day
    bonus NUMERIC(10, 2) DEFAULT 0,
    fine NUMERIC(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

-- Enable RLS
ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- 4. Set search_path for triggers and helper functions
-- (None specific for now, using existing pattern if needed)

-- 5. Helper function for staff access check
CREATE OR REPLACE FUNCTION public.check_can_view_staff(staff_id UUID)
RETURNS boolean AS $$
BEGIN
  RETURN (
    public.check_is_admin_or_director() OR
    EXISTS (
      SELECT 1 FROM public.staff 
      WHERE id = staff_id AND profile_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS Policies

-- Staff Roles: Viewable by all authenticated, manageable by admins
DROP POLICY IF EXISTS "Anyone can view roles" ON public.staff_roles;
CREATE POLICY "Anyone can view roles" ON public.staff_roles 
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can manage roles" ON public.staff_roles;
CREATE POLICY "Admins can manage roles" ON public.staff_roles 
    FOR ALL TO authenticated USING (public.check_is_admin_or_director());

-- Staff: Admins see all, Staff members see themselves
DROP POLICY IF EXISTS "Staff visibility policy" ON public.staff;
CREATE POLICY "Staff visibility policy" ON public.staff 
    FOR SELECT TO authenticated 
    USING (public.check_is_admin_or_director() OR profile_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage staff" ON public.staff;
CREATE POLICY "Admins can manage staff" ON public.staff 
    FOR ALL TO authenticated USING (public.check_is_admin_or_director());

-- Staff Shifts: Admins see all, Staff members see their own
DROP POLICY IF EXISTS "Staff shifts visibility policy" ON public.staff_shifts;
CREATE POLICY "Staff shifts visibility policy" ON public.staff_shifts 
    FOR SELECT TO authenticated 
    USING (
        public.check_is_admin_or_director() OR 
        EXISTS (SELECT 1 FROM public.staff WHERE id = staff_id AND profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage shifts" ON public.staff_shifts;
CREATE POLICY "Admins can manage shifts" ON public.staff_shifts 
    FOR ALL TO authenticated USING (public.check_is_admin_or_director());

-- 7. Add Audit triggers
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN VALUES ('staff_roles', 'staff', 'staff_shifts')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON public.%I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger()', t);
    END LOOP;
END $$;

-- 8. Seed some initial roles
INSERT INTO public.staff_roles (name, description) VALUES 
('Официант', 'Обслуживание гостей в зале'),
('Повар', 'Работа на кухне'),
('Бармен', 'Приготовление напитков'),
('Уборщик', 'Чистота и порядок')
ON CONFLICT (name) DO NOTHING;
