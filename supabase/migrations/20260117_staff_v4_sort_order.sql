-- Migration to add sort_order to staff_roles
-- Date: 2026-01-17

ALTER TABLE public.staff_roles 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Optional: Initial sort order based on creation time or existing name order
WITH ordered_roles AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY department ORDER BY created_at) as row_num
  FROM public.staff_roles
)
UPDATE public.staff_roles
SET sort_order = ordered_roles.row_num
FROM ordered_roles
WHERE public.staff_roles.id = ordered_roles.id;

COMMENT ON COLUMN public.staff_roles.sort_order IS 'Custom display order for roles within their department';
