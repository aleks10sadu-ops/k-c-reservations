-- Применение ON DELETE CASCADE для guest_id в таблице reservations
-- Выполните эту команду в SQL Editor Supabase

-- Сначала удаляем существующий foreign key constraint
ALTER TABLE reservations 
DROP CONSTRAINT IF EXISTS reservations_guest_id_fkey;

-- Затем создаем его заново с ON DELETE CASCADE
ALTER TABLE reservations 
ADD CONSTRAINT reservations_guest_id_fkey 
FOREIGN KEY (guest_id) 
REFERENCES guests(id) 
ON DELETE CASCADE;

