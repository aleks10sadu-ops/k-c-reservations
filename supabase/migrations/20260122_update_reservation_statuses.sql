-- Migration to update reservations status constraint
-- Removes 'prepaid' and adds 'confirmed'
-- Created: 2026-01-22

ALTER TABLE public.reservations
DROP CONSTRAINT IF EXISTS reservations_status_check;

ALTER TABLE public.reservations
ADD CONSTRAINT reservations_status_check
CHECK (status::text = ANY (ARRAY[
  'new'::character varying,
  'confirmed'::character varying,
  'in_progress'::character varying,
  'paid'::character varying,
  'canceled'::character varying,
  'completed'::character varying
]::text[]));
 