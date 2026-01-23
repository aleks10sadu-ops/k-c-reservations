-- Wrap notification triggers in EXCEPTION block to prevent 400 errors
-- This ensures reservation creation succeeds even if notification fails
-- Date: 2026-01-23

-- 1. Safe notify_admins_on_new_reservation
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    guest_name TEXT;
    reservation_time TEXT;
BEGIN
    BEGIN
        -- Get Guest Name
        -- We select from table directly to be safe
        SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
        FROM public.guests WHERE id = NEW.guest_id;

        -- Format time
        -- Check if columns exist (implicitly by accessing them)
        -- Accessing NEW.date and NEW.time directly
        reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;

        -- Target 'Администратор' (Administrator)
        admin_role_id := public.get_role_id_by_name('Администратор');
        
        IF admin_role_id IS NOT NULL THEN
            INSERT INTO public.notifications (type, title, message, recipient_role_id, link, data)
            VALUES (
                'reservation_created',
                'Новая бронь',
                'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || COALESCE(reservation_time, 'Unknown Time'),
                admin_role_id,
                '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
                jsonb_build_object('reservation_id', NEW.id)
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Log the error but DO NOT fail the transaction
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Safe notify_waiter_on_assignment
CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
BEGIN
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
                'Вам назначена бронь: ' || COALESCE(guest_name, 'Гость') || ' на ' || COALESCE(reservation_time, 'Unknown Time'),
                NEW.waiter_id,
                '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
                jsonb_build_object('reservation_id', NEW.id)
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        -- Log the error but DO NOT fail the transaction
        RAISE WARNING 'Waiter notification trigger failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
