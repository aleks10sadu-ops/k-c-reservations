-- Migration: Hall Monthly Availability RPC
-- Date: 2026-01-29
-- Description: Adds a function to check daily availability for a specific hall across a date range.

CREATE OR REPLACE FUNCTION public.get_hall_month_availability(
    p_hall_id UUID,
    p_date_start DATE,
    p_date_end DATE,
    p_guests_count INTEGER DEFAULT 1
)
RETURNS TABLE (
    date DATE,
    total_capacity INTEGER,
    reserved_count BIGINT,
    remaining_capacity BIGINT,
    is_full BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to read all reservations
AS $$
BEGIN
    RETURN QUERY
    WITH hall_info AS (
        SELECT id, capacity 
        FROM public.halls 
        WHERE id = p_hall_id
    ),
    daily_stats AS (
        SELECT 
            r.date,
            SUM(r.guests_count) as total_guests
        FROM public.reservations r
        WHERE r.hall_id = p_hall_id
          AND r.date >= p_date_start
          AND r.date <= p_date_end
          -- Exclude canceled, completed (past), and waitlist (not occupying yet)
          AND r.status NOT IN ('canceled', 'completed', 'waitlist')
        GROUP BY r.date
    ),
    date_series AS (
        SELECT d::DATE as day
        FROM generate_series(p_date_start, p_date_end, '1 day'::interval) d
    )
    SELECT 
        ds.day as date,
        h.capacity as total_capacity,
        COALESCE(s.total_guests, 0)::BIGINT as reserved_count,
        GREATEST(0, h.capacity - COALESCE(s.total_guests, 0))::BIGINT as remaining_capacity,
        (h.capacity - COALESCE(s.total_guests, 0)) < p_guests_count as is_full
    FROM date_series ds
    CROSS JOIN hall_info h
    LEFT JOIN daily_stats s ON ds.day = s.date
    ORDER BY ds.day;
END;
$$;

-- Grant access to public (anon) and authenticated users
GRANT EXECUTE ON FUNCTION public.get_hall_month_availability(UUID, DATE, DATE, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.get_hall_month_availability(UUID, DATE, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_hall_month_availability(UUID, DATE, DATE, INTEGER) TO service_role;

-- Notify schema reload for Supabase clients
NOTIFY pgrst, 'reload schema';
