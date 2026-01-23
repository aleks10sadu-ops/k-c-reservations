-- Migration for Notification System
-- Date: 2026-01-23

-- 1. Drop table if exists to ensure schema update
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 2. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'reservation_created', 'reservation_updated', 'waiter_assigned', 'table_assigned', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    recipient_role_id UUID REFERENCES public.staff_roles(id) ON DELETE SET NULL, -- If set, all staff with this role see it
    recipient_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL, -- If set, only this specific staff sees it
    link TEXT, -- Optional link to resource (e.g. /reservations?id=...)
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}'::jsonb, -- Store extra data like reservation_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can see notifications if:
-- a) It is assigned to their specific staff_id
-- b) It is assigned to their role_id
-- c) They are admins/directors (see all? Maybe not all, but for now let's stick to targeted)

CREATE OR REPLACE FUNCTION public.check_can_view_notification(recipient_staff_id UUID, recipient_role_id UUID)
RETURNS boolean AS $$
DECLARE
    current_staff_id UUID;
    current_role_id UUID;
BEGIN
    -- Get current user's staff record
    SELECT id, role_id INTO current_staff_id, current_role_id
    FROM public.staff
    WHERE profile_id = auth.uid();

    IF current_staff_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Direct assignment
    IF recipient_staff_id IS NOT NULL THEN
        RETURN recipient_staff_id = current_staff_id;
    END IF;

    -- Role assignment
    IF recipient_role_id IS NOT NULL THEN
        RETURN recipient_role_id = current_role_id;
    END IF;

    -- Fallback: If no recipient specified, maybe admins can see? 
    -- For now, require recipient.
    RETURN FALSE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy for SELECT
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        public.check_can_view_notification(recipient_staff_id, recipient_role_id) OR
        public.check_is_admin_or_director() -- Admins might want to debug/see all, or we can remove this line to be strict
    );

-- Policy for UPDATE (marking as read)
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (
        public.check_can_view_notification(recipient_staff_id, recipient_role_id) OR
        public.check_is_admin_or_director()
    );

-- 4. Enable Realtime
-- We need to add this table to the publication so the client receives events
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 5. Trigger Functions

-- Function to get role ID by name
CREATE OR REPLACE FUNCTION public.get_role_id_by_name(role_name TEXT)
RETURNS UUID AS $$
DECLARE
    ret_id UUID;
BEGIN
    SELECT id INTO ret_id FROM public.staff_roles WHERE name = role_name LIMIT 1;
    RETURN ret_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: New Reservation -> Notify Admins/Directors
CREATE OR REPLACE FUNCTION public.notify_admins_on_new_reservation()
RETURNS TRIGGER AS $$
DECLARE
    admin_role_id UUID;
    manager_role_id UUID;
    guest_name TEXT;
BEGIN
    -- We want to notify Managers and maybe Admins
    -- Since we can only set one recipient_role_id per notification row, we might need multiple inserts
    -- OR we can rely on application logic. But database triggers are more robust for "created anywhere".
    
    -- Let's fetch Guest Name for the message
    SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
    FROM public.guests WHERE id = NEW.guest_id;

    -- Create notification for Manager
    -- Note: This assumes you have a 'Manager' or 'Administrator' role in staff_roles
    -- You might need to adjust role names based on your seeds
    
    -- Insert for anyone who should know about new bookings.
    -- For now, let's just insert one record targeting a generic 'Manager' role if it exists, 
    -- or maybe we don't use role-based notifications yet if roles aren't strictly defined for "Who receives alerts".
    -- A better approach might be: insert a notification with NULL recipients? No, RLS hides it.
    
    -- Let's target 'Администратор' (Administrator)
    admin_role_id := public.get_role_id_by_name('Администратор');
    
    IF admin_role_id IS NOT NULL THEN
        INSERT INTO public.notifications (type, title, message, recipient_role_id, link, data)
        VALUES (
            'reservation_created',
            'Новая бронь',
            'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || to_char(NEW.reservation_date, 'DD.MM HH:MI'),
            admin_role_id,
            '/reservations?date=' || to_char(NEW.reservation_date, 'YYYY-MM-DD'),
            jsonb_build_object('reservation_id', NEW.id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_new_reservation
AFTER INSERT ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_new_reservation();

-- Trigger: Reservation Updated -> Notify Admins (if critical changes? maybe skip for now to avoid spam)
-- Or Notify Waiter if assigned.

-- Trigger: Waiter Assigned -> Notify Waiter
CREATE OR REPLACE FUNCTION public.notify_waiter_on_assignment()
RETURNS TRIGGER AS $$
DECLARE
    guest_name TEXT;
BEGIN
    IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
        
        -- Get guest name
        SELECT first_name || ' ' || COALESCE(last_name, '') INTO guest_name
        FROM public.guests WHERE id = NEW.guest_id;
        
        INSERT INTO public.notifications (type, title, message, recipient_staff_id, link, data)
        VALUES (
            'waiter_assigned',
            'Назначен стол',
            'Вам назначена бронь: ' || COALESCE(guest_name, 'Гость') || ' на ' || to_char(NEW.reservation_date, 'HH:MI'),
            NEW.waiter_id,
            '/reservations?date=' || to_char(NEW.reservation_date, 'YYYY-MM-DD'),
            jsonb_build_object('reservation_id', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_notify_waiter_assignment
AFTER UPDATE ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.notify_waiter_on_assignment();
