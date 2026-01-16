-- Trigger function to handle menu deletion fallback
CREATE OR REPLACE FUNCTION handle_menu_deletion_fallback()
RETURNS TRIGGER AS $$
BEGIN
    -- If menu_id becomes NULL (meaning the linked menu was deleted or unlinked)
    -- AND the old menu_id was not NULL
    -- THEN switch menu_type to 'main_menu'
    IF NEW.menu_id IS NULL AND OLD.menu_id IS NOT NULL THEN
        NEW.menu_type := 'main_menu';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_menu_deletion_fallback ON reservations;

-- Create trigger
CREATE TRIGGER on_menu_deletion_fallback
BEFORE UPDATE ON reservations
FOR EACH ROW
EXECUTE FUNCTION handle_menu_deletion_fallback();
