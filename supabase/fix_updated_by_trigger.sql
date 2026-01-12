-- Скрипт для удаления триггера, требующего updated_by
-- Выполните этот скрипт в Supabase SQL Editor

-- Проверяем, есть ли триггеры на таблице reservations, которые используют updated_by
SELECT 
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    proname AS function_name,
    prosrc AS function_source
FROM pg_trigger 
JOIN pg_proc ON pg_trigger.tgfoid = pg_proc.oid
WHERE tgrelid = 'reservations'::regclass;

-- Если найден триггер, использующий updated_by, удалите его или модифицируйте функцию

-- Альтернативно, если колонка updated_by требуется, добавьте её:
-- ALTER TABLE reservations ADD COLUMN updated_by UUID;

-- Или удалите триггер полностью (замените trigger_name на найденное имя):
-- DROP TRIGGER IF EXISTS <trigger_name> ON reservations;
