-- Enable Realtime for critical tables by adding them to the supabase_realtime publication
-- We use a DO block to avoid errors if they are already added

DO $$
BEGIN
  -- reservations
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservations') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
  END IF;

  -- notifications
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  -- reservation_tables
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservation_tables') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservation_tables;
  END IF;

  -- payments
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'payments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE payments;
  END IF;

  -- reservation_menu_items
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservation_menu_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservation_menu_items;
  END IF;

  -- reservation_main_menu_items
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'reservation_main_menu_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE reservation_main_menu_items;
  END IF;

  -- guests
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'guests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE guests;
  END IF;
END $$;

-- Set Replica Identity to FULL to ensure clients receive all columns on DELETE/UPDATE events
ALTER TABLE reservations REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE reservation_tables REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE reservation_menu_items REPLICA IDENTITY FULL;
ALTER TABLE reservation_main_menu_items REPLICA IDENTITY FULL;
ALTER TABLE guests REPLICA IDENTITY FULL;
