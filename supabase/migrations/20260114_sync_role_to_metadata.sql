-- 1. Create function to sync profile role to auth.users metadata
-- This allows instant access to role on client via session.user.app_metadata.role
-- Bypassing the need for a separate DB query and RLS checks.

CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the auth.users table with the new role in app_metadata
    UPDATE auth.users
    SET raw_app_meta_data = 
      COALESCE(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', NEW.role)
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create the trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;

CREATE TRIGGER on_profile_role_change
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role();

-- 3. Backfill existing users
-- This ensures all current users have their role in metadata immediately
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id, role FROM public.profiles
    LOOP
        UPDATE auth.users
        SET raw_app_meta_data = 
          COALESCE(raw_app_meta_data, '{}'::jsonb) || 
          jsonb_build_object('role', user_record.role)
        WHERE id = user_record.id;
    END LOOP;
END $$;
