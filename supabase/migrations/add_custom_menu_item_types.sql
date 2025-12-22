-- Миграция: Добавление поддержки кастомных типов блюд

-- Проверяем, существует ли таблица menu_item_types
DO $$ 
BEGIN
    -- Если таблица не существует, создаем её с menu_id
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'menu_item_types') THEN
        CREATE TABLE menu_item_types (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
            name VARCHAR(100) NOT NULL,
            label VARCHAR(100) NOT NULL,
            label_plural VARCHAR(100) NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(menu_id, name)
        );
    ELSE
        -- Если таблица существует, проверяем наличие колонки menu_id
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'menu_item_types' 
            AND column_name = 'menu_id'
        ) THEN
            -- Удаляем старый UNIQUE constraint на name, если существует
            IF EXISTS (
                SELECT 1 FROM pg_constraint 
                WHERE conname = 'menu_item_types_name_key'
            ) THEN
                ALTER TABLE menu_item_types DROP CONSTRAINT menu_item_types_name_key;
            END IF;
            
            -- Добавляем колонку menu_id
            ALTER TABLE menu_item_types ADD COLUMN menu_id UUID;
            
            -- Устанавливаем menu_id для существующих записей (используем первый доступный menu_id)
            UPDATE menu_item_types 
            SET menu_id = (SELECT id FROM menus LIMIT 1)
            WHERE menu_id IS NULL;
            
            -- Добавляем foreign key constraint
            ALTER TABLE menu_item_types 
            ADD CONSTRAINT menu_item_types_menu_id_fkey 
            FOREIGN KEY (menu_id) REFERENCES menus(id) ON DELETE CASCADE;
            
            -- Делаем menu_id обязательным
            ALTER TABLE menu_item_types ALTER COLUMN menu_id SET NOT NULL;
            
            -- Добавляем новый UNIQUE constraint на (menu_id, name)
            ALTER TABLE menu_item_types ADD CONSTRAINT menu_item_types_menu_id_name_key UNIQUE (menu_id, name);
        END IF;
    END IF;
END $$;

-- Убираем CHECK constraint из menu_items.type, чтобы разрешить кастомные типы
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'menu_items_type_check'
    ) THEN
        ALTER TABLE menu_items DROP CONSTRAINT menu_items_type_check;
    END IF;
END $$;

-- Создаем индексы для оптимизации (если не существуют)
CREATE INDEX IF NOT EXISTS idx_menu_item_types_menu_id ON menu_item_types(menu_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_types_name ON menu_item_types(menu_id, name);
CREATE INDEX IF NOT EXISTS idx_menu_items_type ON menu_items(type);

-- Триггер для обновления updated_at (если не существует)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_menu_item_types_updated_at'
    ) THEN
        CREATE TRIGGER update_menu_item_types_updated_at BEFORE UPDATE ON menu_item_types
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Включаем RLS (если не включен)
ALTER TABLE menu_item_types ENABLE ROW LEVEL SECURITY;

-- Политика для аутентифицированных пользователей
DO $$
BEGIN
    -- Удаляем старую политику, если она существует
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'menu_item_types' 
        AND policyname = 'Allow all for authenticated users'
    ) THEN
        DROP POLICY IF EXISTS "Allow all for authenticated users" ON menu_item_types;
    END IF;
END $$;

-- Создаем политику для всех операций (SELECT, INSERT, UPDATE, DELETE)
-- Используем auth.role() = 'authenticated' как в других таблицах для консистентности
CREATE POLICY "Allow all for authenticated users" ON menu_item_types 
    FOR ALL 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
