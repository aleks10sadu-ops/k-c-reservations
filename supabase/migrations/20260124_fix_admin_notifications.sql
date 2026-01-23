-- Fix notifications to target Profile Roles (admin/director) instead of Staff Roles
-- Date: 2026-01-23

-- 1. Add `recipient_profile_role` column to public.notifications
-- Use text to match the enum, or create a cast if needed. 
-- Since `user_role` is an enum, we can use it directly if we cast properly, 
-- but for simplicity/robustness in JSON payloads, TEXT is often easier. 
-- Let's use `public.user_role` type to be strict.

ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS recipient_profile_role public.user_role;

-- 2. Update `check_can_view_notification` to support `recipient_profile_role`

CREATE OR REPLACE FUNCTION public.check_can_view_notification(
    recipient_staff_id UUID, 
    recipient_role_id UUID,
    recipient_profile_role public.user_role
)
RETURNS boolean AS $$
DECLARE
    current_staff_id UUID;
    current_staff_role_id UUID;
    current_profile_role public.user_role;
    current_user_id UUID := auth.uid();
BEGIN
    -- Get current user's profile role
    SELECT role INTO current_profile_role
    FROM public.profiles
    WHERE id = current_user_id;

    -- Get current user's staff record (if any)
    SELECT id, role_id INTO current_staff_id, current_staff_role_id
    FROM public.staff
    WHERE profile_id = current_user_id;

    -- 1. Direct Staff Assignment
    IF recipient_staff_id IS NOT NULL THEN
        RETURN recipient_staff_id = current_staff_id;
    END IF;

    -- 2. Staff Role Assignment (Legacy/Staff-specific)
    IF recipient_role_id IS NOT NULL THEN
        RETURN recipient_role_id = current_staff_role_id;
    END IF;

    -- 3. Profile Role Assignment (Admin/Director/Manager)
    IF recipient_profile_role IS NOT NULL THEN
        -- If recipient is 'admin', allow 'admin' and 'director'
        -- If recipient is 'director', allow 'director'
        IF recipient_profile_role = 'admin' THEN
             RETURN current_profile_role IN ('admin', 'director');
        ELSIF recipient_profile_role = 'director' THEN
             RETURN current_profile_role = 'director';
        ELSIF recipient_profile_role = 'manager' THEN
             RETURN current_profile_role IN ('manager', 'admin', 'director');
        ELSE
             RETURN recipient_profile_role = current_profile_role;
        END IF;
    END IF;

    -- Fallback
    RETURN FALSE; 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Policy to use the new signature
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (
        public.check_can_view_notification(recipient_staff_id, recipient_role_id, recipient_profile_role) OR
        public.check_is_admin_or_director() -- Keep this for safety/debug
    );

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (
        public.check_can_view_notification(recipient_staff_id, recipient_role_id, recipient_profile_role) OR
        public.check_is_admin_or_director()
    );

-- 4. Update the Trigger Function `notify_admins_on_new_reservation` to use `recipient_profile_role`

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
    -- This handles the missing 'Администратор' staff role issue
    INSERT INTO public.notifications (
        type, 
        title, 
        message, 
        recipient_profile_role, -- NEW COLUMN
        link, 
        data, 
        created_by
    )
    VALUES (
        'reservation_created',
        'Новая бронь',
        'Гость ' || COALESCE(guest_name, 'Неизвестный') || ' создал бронь на ' || COALESCE(reservation_time, 'Unknown Time'),
        'admin'::public.user_role, -- Target Admin profile role
        '/reservations?date=' || to_char(NEW.date, 'YYYY-MM-DD'),
        jsonb_build_object('reservation_id', NEW.id),
        creator_id
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Notification trigger failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. No need to recreate trigger, as we only replaced the function body.
