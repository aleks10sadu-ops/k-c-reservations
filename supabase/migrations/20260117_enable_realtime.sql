-- Enable Realtime for all public tables
-- This allows the client to receive updates automatically via postgres_changes

BEGIN;
  -- Manage the publication for realtime
  -- Check if publication exists, if not create it
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  -- Add tables to the publication
  -- We use EXCEPT to avoid adding tables that might already be there
  -- The following tables are critical for the application's real-time functionality
  
  ALTER PUBLICATION supabase_realtime ADD TABLE halls;
  ALTER PUBLICATION supabase_realtime ADD TABLE tables;
  ALTER PUBLICATION supabase_realtime ADD TABLE layout_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE menus;
  ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE menu_item_types;
  ALTER PUBLICATION supabase_realtime ADD TABLE main_menu_categories;
  ALTER PUBLICATION supabase_realtime ADD TABLE main_menu_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE main_menu_item_variants;
  ALTER PUBLICATION supabase_realtime ADD TABLE guests;
  ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  ALTER PUBLICATION supabase_realtime ADD TABLE reservation_tables;
  ALTER PUBLICATION supabase_realtime ADD TABLE staff_roles;
  ALTER PUBLICATION supabase_realtime ADD TABLE staff;
  ALTER PUBLICATION supabase_realtime ADD TABLE staff_shifts;
  ALTER PUBLICATION supabase_realtime ADD TABLE health_books;

  -- Set REPLICA IDENTITY to FULL for tables where we need to know old values or if they are frequently updated
  -- This ensures that the whole row is sent in the 'update' event
  ALTER TABLE reservations REPLICA IDENTITY FULL;
  ALTER TABLE payments REPLICA IDENTITY FULL;
  ALTER TABLE staff_shifts REPLICA IDENTITY FULL;
  ALTER TABLE reservation_tables REPLICA IDENTITY FULL;
  ALTER TABLE reservation_menu_items REPLICA IDENTITY FULL;
  ALTER TABLE reservation_main_menu_items REPLICA IDENTITY FULL;

COMMIT;
