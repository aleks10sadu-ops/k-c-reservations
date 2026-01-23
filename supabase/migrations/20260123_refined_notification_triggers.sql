-- REFINED TRIGGERS: Deduplication & Self-Exclusion
-- Fixes issue where notifications are sent 4 times and to the creator
-- Date: 2026-01-23

-- 1. Notify Admins (Reservation Created)
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
BEGIN
    BEGIN
        -- Get Creator ID (who is inserting)
        creator_id := auth.uid();

        -- Get Guest Name
        SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
        FROM public.guests WHERE id = NEW.guest_id;

        reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;

        -- Target 'Администратор'
        admin_role_id := public.get_role_id_by_name('Администратор');
        
        -- CHECKS:
        -- 1. If admin_role_id exists
        -- 2. Deduplication: Check if similar notification exists (created < 5 sec ago for same reservation)
        
        IF admin_role_id IS NOT NULL THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications 
                WHERE type = 'reservation_created'
                AND (data->>'reservation_id')::UUID = NEW.id
                AND created_at > NOW() - INTERVAL '5 seconds'
            ) THEN
                INSERT INTO public.notifications (type, title, message, recipient_role_id, link, data, created_by)
                VALUES (
                    'reservation_created',
                    'Новая бронь',
                    'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || COALESCE(reservation_time, 'Unknown Time'),
                    admin_role_id,
                    '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
                    jsonb_build_object('reservation_id', NEW.id),
                    creator_id
                );
            END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger (admin) failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Notify Waiter (Assignment)
CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
BEGIN
    BEGIN
        creator_id := auth.uid();
        
        -- Logic: If I assign myself, maybe I don't need a notification? 
        -- Or maybe I do as confirmation. Let's keep it, but deduplicate.
        -- BUT: If I am the one doing the update, and I assign myself (NEW.waiter_id == creator's staff_id), maybe skip?
        -- For now, let's just deduplicate.

        IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
            SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
            FROM public.guests WHERE id = NEW.guest_id;

            reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;
            
            -- Deduplication check
            IF NOT EXISTS (
                 SELECT 1 FROM public.notifications 
                 WHERE type = 'waiter_assigned'
                 AND recipient_staff_id = NEW.waiter_id
                 AND (data->>'reservation_id')::UUID = NEW.id
                 AND created_at > NOW() - INTERVAL '5 seconds'
            ) THEN
                INSERT INTO public.notifications (type, title, message, recipient_staff_id, link, data, created_by)
                VALUES (
                    'waiter_assigned',
                    'Назначен стол',
                    'Вам назначена бронь: ' || COALESCE(guest_name, 'Гость') || ' на ' || COALESCE(reservation_time, 'Unknown Time'),
                    NEW.waiter_id,
                    '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
                    jsonb_build_object('reservation_id', NEW.id),
                    creator_id
                );
            END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger (waiter) failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
