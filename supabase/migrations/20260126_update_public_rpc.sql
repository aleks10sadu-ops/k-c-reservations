-- Migration: Update Public Reservation RPC
-- Date: 2026-01-26
-- Description: Update create_public_reservation to support 'waitlist' status and optional 'table_id' (for rooms).

-- Drop the OLD signature to avoid ambiguity and "function not unique" errors
DROP FUNCTION IF EXISTS public.create_public_reservation(text, text, text, date, time without time zone, integer, uuid, text);

CREATE OR REPLACE FUNCTION public.create_public_reservation(
    p_phone TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_date DATE,
    p_time TIME,
    p_guests_count INTEGER,
    p_hall_id UUID DEFAULT NULL,
    p_comments TEXT DEFAULT NULL,
    p_status TEXT DEFAULT 'new',
    p_table_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_guest_id UUID;
    v_reservation_id UUID;
    v_hall_id UUID;
    v_status TEXT;
BEGIN
    -- 1. Input Validation
    IF p_phone IS NULL OR length(p_phone) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid phone number');
    END IF;

    -- Validate status (allow 'new' or 'waitlist')
    IF p_status NOT IN ('new', 'waitlist') THEN
         v_status := 'new';
    ELSE
         v_status := p_status;
    END IF;

    -- 2. Find or Create Guest
    SELECT id INTO v_guest_id FROM public.guests WHERE phone = p_phone LIMIT 1;

    IF v_guest_id IS NULL THEN
        INSERT INTO public.guests (first_name, last_name, phone, status, total_visits, total_spent)
        VALUES (p_first_name, COALESCE(p_last_name, ''), p_phone, 'regular', 0, 0)
        RETURNING id INTO v_guest_id;
    END IF;

    -- 3. Determine Hall
    IF p_hall_id IS NOT NULL THEN
        v_hall_id := p_hall_id;
    ELSE
        SELECT id INTO v_hall_id FROM public.halls LIMIT 1;
        IF v_hall_id IS NULL THEN
             RETURN jsonb_build_object('success', false, 'error', 'No halls available');
        END IF;
    END IF;

    -- 4. Create Reservation
    INSERT INTO public.reservations (
        date,
        time,
        guest_id,
        hall_id,
        table_id, -- New support for specific table/room
        guests_count,
        children_count,
        status, -- Supports waitlist
        comments,
        created_via,
        created_at
    )
    VALUES (
        p_date,
        p_time,
        v_guest_id,
        v_hall_id,
        p_table_id,
        COALESCE(p_guests_count, 2),
        0,
        v_status,
        p_comments,
        'website',
        NOW()
    )
    RETURNING id INTO v_reservation_id;

    -- 5. Success Response
    RETURN jsonb_build_object(
        'success', true,
        'reservation_id', v_reservation_id,
        'message', 'Reservation created successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant access
GRANT EXECUTE ON FUNCTION public.create_public_reservation TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_reservation TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_reservation TO service_role;
