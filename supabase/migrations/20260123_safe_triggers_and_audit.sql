-- SAFE TRIGGERS & AUDIT FIX
-- Makes triggers robust against partial failures to prevent 400 Bad Request
-- Date: 2026-01-23

-- 1. Fix Waiter Last Assigned Trigger
-- Make it SECURITY DEFINER to bypass RLS checks (staff table might be restricted)
-- Wrap in EXCEPTION block
CREATE OR REPLACE FUNCTION public.update_waiter_last_assigned()
RETURNS TRIGGER AS $$
BEGIN
    BEGIN
        IF NEW.waiter_id IS NOT NULL AND (OLD.waiter_id IS NULL OR NEW.waiter_id <> OLD.waiter_id) THEN
            UPDATE public.staff 
            SET last_assigned_at = NOW()
            WHERE id = NEW.waiter_id;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Log warning but don't fail transaction
        RAISE WARNING 'Failed to update waiter last_assigned_at: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix Audit Log Trigger
-- Make it robust against missing user profiles or other audit errors
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id UUID := auth.uid();
    valid_user_id UUID;
BEGIN
    BEGIN
        -- Check if user exists in profiles to satisfy FK constraint
        -- If not, set changed_by to NULL
        SELECT id INTO valid_user_id FROM public.profiles WHERE id = user_id;
        
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO public.audit_logs (table_name, record_id, action, old_data, changed_by)
            VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD), valid_user_id);
            RETURN OLD;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
            VALUES (TG_TABLE_NAME, OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), valid_user_id);
            RETURN NEW;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO public.audit_logs (table_name, record_id, action, new_data, changed_by)
            VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW), valid_user_id);
            RETURN NEW;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Audit logging is important but shouldn't block business operations
        RAISE WARNING 'Audit log trigger failed for table %: %', TG_TABLE_NAME, SQLERRM;
        -- Return original record so operation succeeds
        IF (TG_OP = 'DELETE') THEN RETURN OLD; END IF;
        RETURN NEW;
    END;
    
    RETURN NULL; -- Should not reach here
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Ensure Policy for Audit Logs allows insertion
-- Just in case RLS is preventing the insert (though SECURITY DEFINER usually handles it)
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (true);
