-- Миграция для восстановления связей в позициях бронирований
-- Пытаемся связать "осиротевшие" позиции (где main_menu_item_id IS NULL)
-- с новыми позициями меню, сопоставляя их по цене и весу.

DO $$
DECLARE
    r_item RECORD;
    matching_item_id UUID;
    matching_variant_id UUID;
    updated_count INTEGER := 0;
BEGIN
    -- 1. Попытка восстановить связи для ВАРИАНТОВ (сначала variants, т.к. они более специфичны)
    -- Ищем позиции брони, где нет variant_id, но есть unit_price
    FOR r_item IN 
        SELECT id, unit_price, weight_grams 
        FROM reservation_main_menu_items 
        WHERE variant_id IS NULL 
          AND main_menu_item_id IS NULL -- предполагаем что если вариант удален, то и item тоже
    LOOP
        -- Ищем совпадение в таблице вариантов
        -- Логика: цена совпадает, вес совпадает (или оба NULL)
        SELECT id, item_id INTO matching_variant_id, matching_item_id
        FROM main_menu_item_variants
        WHERE price = r_item.unit_price
          AND (
              (weight_grams IS NOT NULL AND weight_grams = r_item.weight_grams)
              OR 
              (weight_grams IS NULL AND r_item.weight_grams IS NULL)
              OR 
              (weight_grams IS NULL AND r_item.weight_grams = 0) -- иногда вес может быть 0 вместо NULL
          )
        LIMIT 1; -- Берем первый попавшийся, если есть дубликаты. Это риск, но лучше чем ничего.

        IF matching_variant_id IS NOT NULL THEN
            UPDATE reservation_main_menu_items
            SET variant_id = matching_variant_id,
                main_menu_item_id = matching_item_id
            WHERE id = r_item.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Restored variants links: %', updated_count;
    updated_count := 0;

    -- 2. Попытка восстановить связи для ОБЫЧНЫХ ПОЗИЦИЙ (main_menu_items)
    FOR r_item IN 
        SELECT id, unit_price, weight_grams 
        FROM reservation_main_menu_items 
        WHERE main_menu_item_id IS NULL
          AND variant_id IS NULL -- только те, что еще не восстановили как варианты
    LOOP
        -- Ищем совпадение в таблице основных блюд
        -- Исключаем те, у которых есть варианты (они должны были попасть выше, но если пользователь выбрал "базовое" блюдо, которое имеет варианты?? обычно так нельзя)
        -- Но лучше искать среди всех.
        SELECT id INTO matching_item_id
        FROM main_menu_items
        WHERE price = r_item.unit_price
          AND (
              (weight_grams IS NOT NULL AND weight_grams = r_item.weight_grams)
              OR
              (weight_grams IS NULL AND r_item.weight_grams IS NULL)
              OR
              (weight_grams IS NULL AND r_item.weight_grams = 0)
          )
          -- Желательно исключить те что имеют варианты, если мы уверены что orphans были без вариантов.
          -- Но если цена совпала, то это сильный сигнал.
        LIMIT 1;

        IF matching_item_id IS NOT NULL THEN
            UPDATE reservation_main_menu_items
            SET main_menu_item_id = matching_item_id
            WHERE id = r_item.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Restored items links: %', updated_count;

END $$;
