-- Update create_public_reservation to default to 'main_menu' instead of 'banquet'
-- Date: 2026-01-23

CREATE OR REPLACE FUNCTION public.create_public_reservation(
    p_phone TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_date DATE,
    p_time TIME,
    p_guests_count INTEGER,
    p_hall_id UUID DEFAULT NULL, -- Optional, logic can pick default
    p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as superuser/owner to bypass RLS for public users
AS $$
DECLARE
    v_guest_id UUID;
    v_reservation_id UUID;
    v_hall_id UUID;
BEGIN
    -- 1. Input Validation
    IF p_phone IS NULL OR length(p_phone) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid phone number');
    END IF;

    -- 2. Find or Create Guest
    -- Normalize phone if possible, but for now exact match or simple clean
    -- Assume p_phone is passed relatively clean
    SELECT id INTO v_guest_id FROM public.guests WHERE phone = p_phone LIMIT 1;

    IF v_guest_id IS NULL THEN
        INSERT INTO public.guests (first_name, last_name, phone, status, total_visits, total_spent)
        VALUES (p_first_name, COALESCE(p_last_name, ''), p_phone, 'regular', 0, 0)
        RETURNING id INTO v_guest_id;
    ELSE
        -- Update name if missing? Optional. For now let's just use existing ID
    END IF;

    -- 3. Determine Hall
    -- If hall_id is provided, use it. If not, pick the first available hall.
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
        guests_count,
        children_count,
        status,
        comments,
        created_via, -- Mark as website
        menu_type,   -- EXPLICITLY SET MENU TYPE
        created_at
    )
    VALUES (
        p_date,
        p_time,
        v_guest_id,
        v_hall_id,
        COALESCE(p_guests_count, 2), -- Default to 2 if missing
        0,
        'new', -- Always 'new' for website
        p_comments,
        'website',
        'main_menu', -- DEFAULT TO MAIN MENU for website reservations
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
