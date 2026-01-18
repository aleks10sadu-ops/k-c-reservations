-- Таблицы для шаблонов планировок и планировок на конкретные дни

-- 1. Таблица шаблонов планировок
CREATE TABLE IF NOT EXISTS hall_layout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    -- JSONB для хранения снимка столов и элементов оформления
    tables_data JSONB NOT NULL DEFAULT '[]',
    layout_items_data JSONB NOT NULL DEFAULT '[]',
    is_standard BOOLEAN DEFAULT FALSE, -- Флаг "Стандартная"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Таблица планировок на конкретные даты
CREATE TABLE IF NOT EXISTS hall_date_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hall_id UUID NOT NULL REFERENCES halls(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    -- JSONB для хранения снимка
    tables_data JSONB NOT NULL DEFAULT '[]',
    layout_items_data JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(hall_id, date)
);

-- Включаем RLS
ALTER TABLE hall_layout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hall_date_layouts ENABLE ROW LEVEL SECURITY;

-- Политики доступа
CREATE POLICY "Allow all for authenticated users" ON hall_layout_templates FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON hall_date_layouts FOR ALL USING (auth.role() = 'authenticated');

-- Триггеры для обновления updated_at
CREATE TRIGGER update_hall_layout_templates_updated_at BEFORE UPDATE ON hall_layout_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hall_date_layouts_updated_at BEFORE UPDATE ON hall_date_layouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Индексы
CREATE INDEX idx_hall_date_layouts_hall_date ON hall_date_layouts(hall_id, date);
CREATE INDEX idx_hall_layout_templates_hall ON hall_layout_templates(hall_id);
