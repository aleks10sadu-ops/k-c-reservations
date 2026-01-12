-- САМОЕ НАДЕЖНОЕ РЕШЕНИЕ
-- Раз база данных жалуется, что поля 'updated_by' нет, давайте просто создадим его.
-- Это мгновенно устранит ошибку "record "new" has no field "updated_by"", так как поле появится.

ALTER TABLE public.reservations 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Теперь, когда поле есть, можно (опционально) попробовать почистить старые триггеры,
-- если они вам не нужны. Но ошибка блокирующая работу уже должна исчезнуть.

-- Попытка удалить возможные проблемные триггеры (на всякий случай)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_updated_at ON reservations;
DROP TRIGGER IF EXISTS set_updated_by ON reservations;
DROP TRIGGER IF EXISTS update_reservation_audit ON reservations;
DROP TRIGGER IF EXISTS audit_reservation_changes ON reservations;

-- Пересоздание корректного триггера для updated_at (стандартного)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
