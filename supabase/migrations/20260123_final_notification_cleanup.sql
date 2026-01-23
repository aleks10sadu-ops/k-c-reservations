-- FINAL CLEANUP: Aggressive Trigger Removal & Single Source of Truth
-- Fixes duplicate notifications (4x) by removing all legacy/duplicate triggers
-- Date: 2026-01-23

-- 1. DROP ALL POSSIBLE TRIGGER VARIATIONS (Aggressive)
DROP TRIGGER IF EXISTS tr_notify_new_reservation ON public.reservations;
DROP TRIGGER IF EXISTS notify_admins_on_new_reservation ON public.reservations;
DROP TRIGGER IF EXISTS tr_new_reservation_notify ON public.reservations;
DROP TRIGGER IF EXISTS on_reservation_created ON public.reservations;

DROP TRIGGER IF EXISTS tr_notify_waiter_assignment ON public.reservations;
DROP TRIGGER IF EXISTS notify_waiter_on_assignment ON public.reservations;
DROP TRIGGER IF EXISTS tr_waiter_assigned_notify ON public.reservations;
DROP TRIGGER IF EXISTS on_waiter_assigned ON public.reservations;

-- 2. DROP FUNCTIONS TO BE SAFE (We will recreate them)
DROP FUNCTION IF EXISTS public.notify_admins_on_new_reservation() CASCADE;
DROP FUNCTION IF EXISTS public.notify_waiter_on_assignment() CASCADE;

-- 3. RE-CREATE FUNCTIONS WITH STRICT DEDUPLICATION

-- Function 1: Notify Admin
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
BEGIN
    BEGIN
        creator_id := auth.uid();

        -- DEDUPLICATION: Check if this reservation ALREADY has a notification of this type
        -- This prevents multiple triggers from firing for the same event
        IF EXISTS (
            SELECT 1 FROM public.notifications 
            WHERE type = 'reservation_created'
            AND (data->>'reservation_id')::UUID = NEW.id
        ) THEN
            RETURN NEW; -- Skip, already notified for this reservation ID
        END IF;

        SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
        FROM public.guests WHERE id = NEW.guest_id;

        reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;
        admin_role_id := public.get_role_id_by_name('Администратор');
        
        IF admin_role_id IS NOT NULL THEN
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
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger (admin) failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Notify Waiter
CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
BEGIN
    BEGIN
        creator_id := auth.uid();
        
        IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
            
            -- DEDUPLICATION: Check if this waiter was already notified for this reservation recently
            IF EXISTS (
                 SELECT 1 FROM public.notifications 
                 WHERE type = 'waiter_assigned'
                 AND recipient_staff_id = NEW.waiter_id
                 AND (data->>'reservation_id')::UUID = NEW.id
                 AND created_at > NOW() - INTERVAL '30 seconds'
            ) THEN
                RETURN NEW; -- Skip duplicate
            END IF;

            SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
            FROM public.guests WHERE id = NEW.guest_id;

            reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;
            
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

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger (waiter) failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. RE-CREATE TRIGGERS (SINGLE INSTANCE)
CREATE TRIGGER tr_notify_new_reservation
    AFTER INSERT ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_reservation();

CREATE TRIGGER tr_notify_waiter_assignment
    AFTER INSERT OR UPDATE OF waiter_id ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.notify_waiter_on_assignment();
