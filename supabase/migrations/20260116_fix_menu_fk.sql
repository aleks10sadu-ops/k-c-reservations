-- Изменение внешнего ключа menu_id в таблице reservations
-- для разрешения удаления меню (устанавливает NULL при удалении меню)

DO $$ 
BEGIN
    -- Проверяем существование ограничения перед удалением
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'reservations_menu_id_fkey' 
        AND table_name = 'reservations'
    ) THEN
        ALTER TABLE reservations DROP CONSTRAINT reservations_menu_id_fkey;
    END IF;

    -- Добавляем новое ограничение с ON DELETE SET NULL
    ALTER TABLE reservations 
    ADD CONSTRAINT reservations_menu_id_fkey 
    FOREIGN KEY (menu_id) 
    REFERENCES menus(id) 
    ON DELETE SET NULL;

END $$;
