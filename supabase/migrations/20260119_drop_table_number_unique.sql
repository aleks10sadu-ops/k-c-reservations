-- Drop unique constraint that prevents multiple tables from having the same number in a hall
-- This is necessary to support "composite" tables (multiple elements grouped under one number)
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_hall_id_number_key;

-- Note: In some older versions it might have a different name, so we try the most common pattern
ALTER TABLE public.tables DROP CONSTRAINT IF EXISTS tables_hall_id_number_unique;
