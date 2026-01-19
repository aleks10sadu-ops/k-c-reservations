-- Установка часового пояса для базы данных и ролей
-- Это гарантирует, что функции CURRENT_DATE, CURRENT_TIME и приведения типов
-- будут использовать московское время (UTC+3)

-- Для всей базы данных (может требовать прав суперпользователя)
ALTER DATABASE postgres SET timezone TO 'Europe/Moscow';

-- Для основных ролей Supabase
ALTER ROLE authenticated SET timezone TO 'Europe/Moscow';
ALTER ROLE service_role SET timezone TO 'Europe/Moscow';
ALTER ROLE anon SET timezone TO 'Europe/Moscow';
ALTER ROLE postgres SET timezone TO 'Europe/Moscow';
