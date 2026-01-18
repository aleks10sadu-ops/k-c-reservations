-- Migration to enhance Staff system (v2)
-- Date: 2026-01-17

-- 1. Update staff table
ALTER TABLE public.staff 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Create health_books table
CREATE TABLE IF NOT EXISTS public.health_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    issued_at DATE,
    expires_at DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.health_books ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for health_books
DROP POLICY IF EXISTS "Anyone can view health books" ON public.health_books;
CREATE POLICY "Anyone can view health books" ON public.health_books 
    FOR SELECT TO authenticated 
    USING (
        public.check_is_admin_or_director() OR 
        EXISTS (SELECT 1 FROM public.staff WHERE id = staff_id AND profile_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage health books" ON public.health_books;
CREATE POLICY "Admins can manage health books" ON public.health_books 
    FOR ALL TO authenticated USING (public.check_is_admin_or_director());

-- 4. Add Audit trigger
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON public.health_books 
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
