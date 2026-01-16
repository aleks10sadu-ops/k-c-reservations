-- Миграция для таблиц основного меню ресторана
-- Позволяет бронирование "ПО ОСНОВНОМУ МЕНЮ" с автодополнением позиций

-- Категории основного меню
CREATE TABLE IF NOT EXISTS main_menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    note TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Позиции основного меню
CREATE TABLE IF NOT EXISTS main_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES main_menu_categories(id) ON DELETE CASCADE,
    name VARCHAR(300) NOT NULL,
    description TEXT,
    weight VARCHAR(50),
    weight_grams INTEGER,
    price DECIMAL(10,2),
    price_per_100g DECIMAL(10,2),
    min_portion_grams INTEGER,
    has_variants BOOLEAN DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Варианты позиций (напр. Цезарь с курицей/креветками/лососем)
CREATE TABLE IF NOT EXISTS main_menu_item_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id UUID NOT NULL REFERENCES main_menu_items(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    weight VARCHAR(50),
    weight_grams INTEGER,
    price DECIMAL(10,2),
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Выбранные позиции из основного меню для бронирования
CREATE TABLE IF NOT EXISTS reservation_main_menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    main_menu_item_id UUID REFERENCES main_menu_items(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES main_menu_item_variants(id) ON DELETE SET NULL,
    custom_name VARCHAR(300),
    quantity INTEGER NOT NULL DEFAULT 1,
    weight_grams INTEGER,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    notes TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавление поля типа меню в бронирования
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reservations' AND column_name = 'menu_type'
    ) THEN
        ALTER TABLE reservations 
        ADD COLUMN menu_type VARCHAR(20) DEFAULT 'banquet';
        
        ALTER TABLE reservations 
        ADD CONSTRAINT check_menu_type CHECK (menu_type IN ('banquet', 'main_menu'));
    END IF;
END $$;

-- Индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_main_menu_items_category ON main_menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_main_menu_items_name ON main_menu_items USING gin(to_tsvector('russian', name));
CREATE INDEX IF NOT EXISTS idx_main_menu_item_variants_item ON main_menu_item_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_reservation_main_menu_items_reservation ON reservation_main_menu_items(reservation_id);

-- RLS политики
ALTER TABLE main_menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE main_menu_item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_main_menu_items ENABLE ROW LEVEL SECURITY;

-- Политики доступа для аутентифицированных пользователей
DROP POLICY IF EXISTS "Allow all for authenticated main_menu_categories" ON main_menu_categories;
CREATE POLICY "Allow all for authenticated main_menu_categories" ON main_menu_categories 
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for authenticated main_menu_items" ON main_menu_items;
CREATE POLICY "Allow all for authenticated main_menu_items" ON main_menu_items 
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for authenticated main_menu_item_variants" ON main_menu_item_variants;
CREATE POLICY "Allow all for authenticated main_menu_item_variants" ON main_menu_item_variants 
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow all for authenticated reservation_main_menu_items" ON reservation_main_menu_items;
CREATE POLICY "Allow all for authenticated reservation_main_menu_items" ON reservation_main_menu_items 
    FOR ALL USING (auth.role() = 'authenticated');

-- Функция поиска позиций меню по названию
CREATE OR REPLACE FUNCTION search_main_menu_items(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    category_id UUID,
    category_name VARCHAR(200),
    name VARCHAR(300),
    description TEXT,
    weight VARCHAR(50),
    price DECIMAL(10,2),
    price_per_100g DECIMAL(10,2),
    min_portion_grams INTEGER,
    has_variants BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mi.id,
        mi.category_id,
        mc.name as category_name,
        mi.name,
        mi.description,
        mi.weight,
        mi.price,
        mi.price_per_100g,
        mi.min_portion_grams,
        mi.has_variants
    FROM main_menu_items mi
    JOIN main_menu_categories mc ON mi.category_id = mc.id
    WHERE mi.name ILIKE '%' || search_query || '%'
       OR mc.name ILIKE '%' || search_query || '%'
    ORDER BY 
        CASE WHEN mi.name ILIKE search_query || '%' THEN 0 ELSE 1 END,
        mc.order_index,
        mi.order_index
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
