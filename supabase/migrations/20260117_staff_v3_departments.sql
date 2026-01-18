-- Migration to add department to staff_roles
-- Date: 2026-01-17

ALTER TABLE public.staff_roles 
ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'hall' 
CHECK (department IN ('hall', 'kitchen'));

-- Update existing roles to be 'hall' by default (already handled by DEFAULT 'hall', 
-- but we might want to specify logic if we had kitchen roles already)

-- Add comment for documentation
COMMENT ON COLUMN public.staff_roles.department IS 'Department of the role: hall (Зал) or kitchen (Кухня)';
