-- Migration to add ON DELETE CASCADE to guest_id foreign key in reservations table
-- This allows deleting guests without foreign key constraint errors

-- First, drop the existing foreign key constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_guest_id_fkey;

-- Recreate it with ON DELETE CASCADE
ALTER TABLE reservations 
ADD CONSTRAINT reservations_guest_id_fkey 
FOREIGN KEY (guest_id) 
REFERENCES guests(id) 
ON DELETE CASCADE;

