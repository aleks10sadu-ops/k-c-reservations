-- NUCLEAR CLEANUP OF TRIGGERS
-- Drops ALL triggers on reservations table to ensure no duplicates remain

DO $$ 
DECLARE 
    t record;
BEGIN 
    FOR t IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'reservations' 
        AND trigger_schema = 'public'
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t.trigger_name) || ' ON public.reservations CASCADE'; 
    END LOOP; 
END $$;

-- Also cleanup other related tables just in case
DO $$ 
DECLARE 
    t record;
BEGIN 
    FOR t IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'guests' 
        AND trigger_schema = 'public'
        AND trigger_name LIKE '%notify%'
    LOOP 
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t.trigger_name) || ' ON public.guests CASCADE'; 
    END LOOP; 
END $$;

-- RE-CREATE FUNCTIONS (Ensure strictly one insert)
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
    existing_notif_id UUID;
BEGIN
    -- Only proceed if we haven't created a notification for this reservation in the last 10 seconds
    -- (Safety check against race conditions or retry logic)
    SELECT id INTO existing_notif_id
    FROM public.notifications 
    WHERE type = 'reservation_created'
    AND (data->>'reservation_id')::UUID = NEW.id
    LIMIT 1;

    IF existing_notif_id IS NOT NULL THEN
        RETURN NEW; -- Already notified
    END IF;

    creator_id := auth.uid();

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

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent transaction failure if notification fails, just log warning
    RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RE-CREATE TRIGGER
CREATE TRIGGER tr_notify_new_reservation_v2
    AFTER INSERT ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_reservation();

-- Waiter trigger (re-add cleanly)
CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
BEGIN
    IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
         -- Simple dedup
         IF EXISTS (SELECT 1 FROM public.notifications 
                    WHERE type = 'waiter_assigned' 
                    AND recipient_staff_id = NEW.waiter_id 
                    AND (data->>'reservation_id')::UUID = NEW.id 
                    AND created_at > NOW() - INTERVAL '1 minute') THEN
             RETURN NEW;
         END IF;

         creator_id := auth.uid();
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
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_waiter_assignment_v2
    AFTER INSERT OR UPDATE OF waiter_id ON public.reservations
    FOR EACH ROW EXECUTE FUNCTION public.notify_waiter_on_assignment();
