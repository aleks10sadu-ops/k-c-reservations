-- Fix column name in notification triggers
-- Replaces 'reservation_date' with 'date' and 'time'
-- Created: 2026-01-23

CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    guest_name TEXT;
    reservation_time TEXT;
BEGIN
    -- Get Guest Name
    SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
    FROM public.guests WHERE id = NEW.guest_id;

    -- Format time
    reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;

    -- Target 'Администратор' (Administrator)
    admin_role_id := public.get_role_id_by_name('Администратор');
    
    IF admin_role_id IS NOT NULL THEN
        INSERT INTO public.notifications (type, title, message, recipient_role_id, link, data)
        VALUES (
            'reservation_created',
            'Новая бронь',
            'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || reservation_time,
            admin_role_id,
            '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
            jsonb_build_object('reservation_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
BEGIN
    IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
        
        -- Get guest name
        SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
        FROM public.guests WHERE id = NEW.guest_id;

        -- Format time
        reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;
        
        INSERT INTO public.notifications (type, title, message, recipient_staff_id, link, data)
        VALUES (
            'waiter_assigned',
            'Назначен стол',
            'Вам назначена бронь: ' || COALESCE(guest_name, 'Гость') || ' на ' || reservation_time,
            NEW.waiter_id,
            '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
            jsonb_build_object('reservation_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
