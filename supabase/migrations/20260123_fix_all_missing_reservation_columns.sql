-- MASTER FIX: Ensure ALL required columns and triggers exist
-- Fixes 400 Bad Request by handling missing columns and safe triggers
-- Date: 2026-01-23

-- 1. Ensure ALL potential missing columns exist (idempotent)
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS prepaid_amount NUMERIC DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS surplus DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'website';
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS is_walk_in BOOLEAN DEFAULT FALSE;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- 2. Ensure reservation_menu_items columns
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS weight_per_person INTEGER;
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS name VARCHAR(200);
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS order_index INTEGER;
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE public.reservation_menu_items ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE public.reservation_menu_items ALTER COLUMN menu_item_id DROP NOT NULL;

-- 3. Relax constraints
ALTER TABLE public.reservation_menu_items DROP CONSTRAINT IF EXISTS reservation_menu_items_res_menu_unique;
ALTER TABLE public.reservation_menu_items DROP CONSTRAINT IF EXISTS reservation_menu_items_reservation_id_menu_item_id_key;

-- 4. Safe Notification Triggers (Wrapped in EXCEPTION)
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    guest_name TEXT;
    reservation_time TEXT;
BEGIN
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
                'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || COALESCE(reservation_time, 'Unknown Time'),
                admin_role_id,
                '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
                jsonb_build_object('reservation_id', NEW.id)
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
    reservation_time TEXT;
BEGIN
    BEGIN
        IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
            SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
            FROM public.guests WHERE id = NEW.guest_id;

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
        RAISE WARNING 'Waiter notification trigger failed: %', SQLERRM;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Helper function for role ID (required for notifications)
CREATE OR REPLACE FUNCTION public.get_role_id_by_name(role_name TEXT)
RETURNS UUID AS $$
DECLARE
    ret_id UUID;
BEGIN
    SELECT id INTO ret_id FROM public.staff_roles WHERE name = role_name LIMIT 1;
    RETURN ret_id;
END;
$$ LANGUAGE plpgsql;
