-- Fix notification links to point to root page with params
-- Date: 2026-01-23

-- 1. Update `notify_admins_on_new_reservation`
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
    creator_id UUID;
    existing_notif_id UUID;
BEGIN
    -- Dedup check
    SELECT id INTO existing_notif_id
    FROM public.notifications 
    WHERE type = 'reservation_created'
    AND (data->>'reservation_id')::UUID = NEW.id
    LIMIT 1;

    IF existing_notif_id IS NOT NULL THEN
        RETURN NEW; 
    END IF;

    creator_id := auth.uid();

    SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
    FROM public.guests WHERE id = NEW.guest_id;

    reservation_time := to_char(NEW.date, 'DD.MM') || ' ' || NEW.time::text;

    -- INSERT targeting 'admin' profile role
    -- LINK CHANGED: /reservations -> /
    INSERT INTO public.notifications (
        type, 
        title, 
        message, 
        recipient_profile_role, 
        link, 
        data, 
        created_by
    )
    VALUES (
        'reservation_created',
        'Новая бронь',
        'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || COALESCE(reservation_time, 'Unknown Time'),
        'admin'::public.user_role, 
        '/?date=' || to_char(NEW.date, 'YYYY-MM-DD') || '&id=' || NEW.id,
        jsonb_build_object('reservation_id', NEW.id),
        creator_id
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update `notify_waiter_on_assignment`
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
            '/?date=' || to_char(NEW.date, 'YYYY-MM-DD') || '&id=' || NEW.id, 
            jsonb_build_object('reservation_id', NEW.id),
            creator_id
         );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
