-- Migration: Hall Capacity Logic and Waitlist Status
-- Date: 2026-01-26

-- 1. Update Reservation Statuses to include 'waitlist'
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations ADD CONSTRAINT reservations_status_check
    CHECK (status::text = ANY (ARRAY['new', 'confirmed', 'in_progress', 'paid', 'prepaid', 'canceled', 'completed', 'waitlist']::text[]));

-- 2. Update Tables to support Named Tables (Sub-halls/Rooms)
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS type text DEFAULT 'table'; -- 'table' or 'room'
-- Note: 'position_x' etc handle scheme placement. 'capacity' already exists on tables.

-- 3. RPC for checking availability
-- Returns availability for a specific hall at a specific time (or whole day sum if time is null)
CREATE OR REPLACE FUNCTION get_hall_availability(
  p_hall_id uuid,
  p_date date,
  p_time time without time zone DEFAULT NULL,
  p_duration interval DEFAULT '02:00'::interval
)
RETURNS TABLE (
  hall_id uuid,
  capacity integer,
  reserved_count bigint,
  remaining_capacity bigint,
  is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH hall_cap AS (
    SELECT h.id, h.capacity
    FROM public.halls h
    WHERE h.id = p_hall_id
  ),
  active_res AS (
    SELECT r.guests_count
    FROM public.reservations r
    WHERE r.hall_id = p_hall_id
      AND r.date = p_date
      AND r.status NOT IN ('canceled', 'completed', 'waitlist')
      AND (
        p_time IS NULL
        OR
        -- Simple overlap check assuming 2 hour default duration for existing reservations
        (r.time, r.time + '02:00'::interval) OVERLAPS (p_time, p_time + p_duration)
      )
  )
  SELECT
    hc.id,
    hc.capacity,
    COALESCE(SUM(ar.guests_count), 0)::bigint as reserved_count,
    GREATEST(0, hc.capacity - COALESCE(SUM(ar.guests_count), 0))::bigint as remaining_capacity,
    (hc.capacity - COALESCE(SUM(ar.guests_count), 0)) > 0 as is_available
  FROM hall_cap hc
  LEFT JOIN active_res ar ON true
  GROUP BY hc.id, hc.capacity;
END;
$$;

-- 4. Notify schema cache reload
NOTIFY pgrst, 'reload schema';
