-- Схема базы данных для CRM системы ресторана Kucher&Congo

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица залов
CREATE TABLE halls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица столов
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 4,
    position_x DECIMAL(10,2) NOT NULL DEFAULT 0,
    position_y DECIMAL(10,2) NOT NULL DEFAULT 0,
    width DECIMAL(10,2) NOT NULL DEFAULT 100,
    height DECIMAL(10,2) NOT NULL DEFAULT 100,
    rotation DECIMAL(10,2) NOT NULL DEFAULT 0,
    shape VARCHAR(20) NOT NULL DEFAULT 'rectangle' CHECK (shape IN ('round', 'rectangle', 'square')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hall_id, number)
);

-- Произвольные элементы схемы (надписи, блоки)
CREATE TABLE layout_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('label', 'shape')),
    text TEXT,
    position_x DECIMAL(10,2) NOT NULL DEFAULT 0,
    position_y DECIMAL(10,2) NOT NULL DEFAULT 0,
    width DECIMAL(10,2) NOT NULL DEFAULT 120,
    height DECIMAL(10,2) NOT NULL DEFAULT 40,
    rotation DECIMAL(10,2) NOT NULL DEFAULT 0,
    color VARCHAR(20),
    bg_color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица меню (наборы блюд)
CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL,
    total_weight_per_person INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица позиций меню
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('appetizer', 'salad', 'set', 'bread', 'hot', 'dessert', 'drink')),
    weight_per_person INTEGER NOT NULL DEFAULT 0,
    price DECIMAL(10,2),
    description TEXT,
    is_selectable BOOLEAN DEFAULT FALSE,
    max_selections INTEGER,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица гостей
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'regular' CHECK (status IN ('regular', 'frequent', 'vip')),
    notes TEXT,
    total_visits INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица бронирований
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    time TIME NOT NULL,
    hall_id UUID NOT NULL REFERENCES halls(id),
    table_id UUID REFERENCES tables(id),
    guest_id UUID NOT NULL REFERENCES guests(id),
    guests_count INTEGER NOT NULL DEFAULT 1,
    children_count INTEGER NOT NULL DEFAULT 0,
    menu_id UUID REFERENCES menus(id),
    status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'prepaid', 'paid', 'canceled')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    prepaid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    comments TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица выбранных позиций меню в бронировании
CREATE TABLE reservation_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
    is_selected BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(reservation_id, menu_item_id)
);

-- Таблица платежей/предоплат
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'transfer')),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для оптимизации
CREATE INDEX idx_reservations_date ON reservations(date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_guest_id ON reservations(guest_id);
CREATE INDEX idx_reservations_hall_id ON reservations(hall_id);
CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX idx_menu_items_menu_id ON menu_items(menu_id);
CREATE INDEX idx_tables_hall_id ON tables(hall_id);
CREATE INDEX idx_guests_phone ON guests(phone);

-- Триггеры для обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_halls_updated_at BEFORE UPDATE ON halls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menus_updated_at BEFORE UPDATE ON menus
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Триггер для обновления суммы предоплат в бронировании
CREATE OR REPLACE FUNCTION update_reservation_prepaid_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE reservations 
        SET prepaid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM payments 
            WHERE reservation_id = NEW.reservation_id
        )
        WHERE id = NEW.reservation_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE reservations 
        SET prepaid_amount = (
            SELECT COALESCE(SUM(amount), 0) 
            FROM payments 
            WHERE reservation_id = OLD.reservation_id
        )
        WHERE id = OLD.reservation_id;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_prepaid_on_payment_insert
    AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION update_reservation_prepaid_amount();

CREATE TRIGGER update_prepaid_on_payment_delete
    AFTER DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_reservation_prepaid_amount();

-- Вставка демо-данных

-- Залы
INSERT INTO halls (id, name, capacity, description) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Основной зал', 80, 'Главный зал ресторана с панорамными окнами'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'VIP зал', 20, 'Приватный зал для особых мероприятий'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'Терраса', 40, 'Летняя терраса с видом на город');

-- Столы для основного зала
INSERT INTO tables (hall_id, number, capacity, position_x, position_y, width, height, shape) VALUES
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 1, 4, 50, 50, 80, 80, 'round'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 2, 4, 180, 50, 80, 80, 'round'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 3, 6, 310, 50, 120, 80, 'rectangle'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 4, 8, 50, 180, 160, 80, 'rectangle'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 5, 4, 260, 180, 80, 80, 'square'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 6, 6, 50, 310, 120, 80, 'rectangle'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 7, 4, 220, 310, 80, 80, 'round'),
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 8, 8, 350, 310, 160, 80, 'rectangle');

-- Столы для VIP зала
INSERT INTO tables (hall_id, number, capacity, position_x, position_y, width, height, shape) VALUES
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 1, 10, 100, 100, 200, 100, 'rectangle'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 2, 10, 100, 250, 200, 100, 'rectangle');

-- Столы для террасы
INSERT INTO tables (hall_id, number, capacity, position_x, position_y, width, height, shape) VALUES
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 1, 4, 50, 50, 80, 80, 'round'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 2, 4, 180, 50, 80, 80, 'round'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 3, 4, 310, 50, 80, 80, 'round'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 4, 6, 50, 180, 120, 80, 'rectangle'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 5, 6, 220, 180, 120, 80, 'rectangle');

-- Меню "Кучер"
INSERT INTO menus (id, name, price_per_person, total_weight_per_person, description, is_active) VALUES
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Меню Кучер', 4500, 1340, 'Классическое банкетное меню ресторана', TRUE),
    ('e5f6a7b8-c9d0-1234-ef01-23456789abcd', 'Меню Конго', 5500, 1580, 'Премиальное меню с расширенным выбором', TRUE),
    ('f6a7b8c9-d0e1-2345-f012-3456789abcde', 'Детское меню', 2500, 850, 'Специальное меню для маленьких гостей', TRUE);

-- Позиции меню "Кучер"
INSERT INTO menu_items (menu_id, name, type, weight_per_person, is_selectable, max_selections, order_index) VALUES
    -- Закуски
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Сырная тарелка', 'appetizer', 80, FALSE, NULL, 1),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Мясная нарезка', 'appetizer', 100, FALSE, NULL, 2),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Овощная нарезка', 'appetizer', 120, FALSE, NULL, 3),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Оливки и маслины', 'appetizer', 50, FALSE, NULL, 4),
    -- Салаты (выбор 3 из 5)
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Цезарь с курицей', 'salad', 180, TRUE, 3, 5),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Греческий салат', 'salad', 180, TRUE, 3, 6),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Салат с тунцом', 'salad', 180, TRUE, 3, 7),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Оливье', 'salad', 180, TRUE, 3, 8),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Капрезе', 'salad', 180, TRUE, 3, 9),
    -- Сеты
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Сет роллов Филадельфия', 'set', 250, FALSE, NULL, 10),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Сет нигири', 'set', 200, FALSE, NULL, 11),
    -- Горячее
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Стейк рибай', 'hot', 300, FALSE, NULL, 12),
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Гарнир картофельный', 'hot', 150, FALSE, NULL, 13),
    -- Хлеб
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Хлебная корзина', 'bread', 100, FALSE, NULL, 14),
    -- Десерты
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Чизкейк', 'dessert', 120, FALSE, NULL, 15),
    -- Напитки
    ('d4e5f6a7-b8c9-0123-def0-123456789abc', 'Морс ягодный', 'drink', 300, FALSE, NULL, 16);

-- Демо гости
INSERT INTO guests (id, first_name, last_name, middle_name, phone, email, status, notes, total_visits, total_spent) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Иван', 'Петров', 'Сергеевич', '+380501234567', 'ivan@example.com', 'vip', 'Предпочитает столик у окна', 12, 156000),
    ('22222222-2222-2222-2222-222222222222', 'Мария', 'Сидорова', 'Александровна', '+380671234567', 'maria@example.com', 'frequent', 'Аллергия на морепродукты', 8, 89000),
    ('33333333-3333-3333-3333-333333333333', 'Алексей', 'Коваленко', NULL, '+380931234567', 'alex@example.com', 'regular', NULL, 2, 18000);

-- Демо бронирования
INSERT INTO reservations (id, date, time, hall_id, guest_id, guests_count, children_count, menu_id, status, total_amount, prepaid_amount, comments) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', CURRENT_DATE + INTERVAL '1 day', '18:00', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', '11111111-1111-1111-1111-111111111111', 20, 3, 'd4e5f6a7-b8c9-0123-def0-123456789abc', 'prepaid', 90000, 45000, 'День рождения, нужен торт'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', CURRENT_DATE + INTERVAL '2 days', '19:00', 'b2c3d4e5-f6a7-8901-bcde-f12345678901', '22222222-2222-2222-2222-222222222222', 15, 0, 'e5f6a7b8-c9d0-1234-ef01-23456789abcd', 'in_progress', 82500, 0, 'Корпоратив'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', CURRENT_DATE + INTERVAL '3 days', '17:00', 'c3d4e5f6-a7b8-9012-cdef-123456789012', '33333333-3333-3333-3333-333333333333', 8, 2, 'd4e5f6a7-b8c9-0123-def0-123456789abc', 'new', 36000, 0, NULL);

-- Демо платежи
INSERT INTO payments (reservation_id, amount, payment_method, notes) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 20000, 'card', 'Первый взнос'),
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 25000, 'transfer', 'Второй взнос');

-- RLS политики (Row Level Security)
ALTER TABLE halls ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Политики для аутентифицированных пользователей
CREATE POLICY "Allow all for authenticated users" ON halls FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON menus FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON guests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON reservations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON reservation_menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON payments FOR ALL USING (auth.role() = 'authenticated');

