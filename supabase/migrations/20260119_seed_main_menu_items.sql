-- Migration to populate main menu items
-- Generated based on user request to add specific menu positions

-- CLEANUP first to avoid duplicates (Cascade will delete items and variants)
-- TRUNCATE removed to preserve existing data. 
-- WARNING: Running this script multiple times may create duplicates if checks are not in place.


DO $$ 
DECLARE 
    v_category_id UUID;
    v_item_id UUID;
BEGIN
    -- =============================================
    -- 1. ЧАЙ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Чай', 10) RETURNING id INTO v_category_id;

    -- Домашнее варенье (с вариантами)
    INSERT INTO main_menu_items (category_id, name, price, has_variants, order_index) 
    VALUES (v_category_id, 'Домашнее варенье', 260, TRUE, 1) 
    RETURNING id INTO v_item_id;

    INSERT INTO main_menu_item_variants (item_id, name, price, order_index) VALUES
    (v_item_id, 'Арбузное', 260, 1),
    (v_item_id, 'Кизиловое', 260, 2),
    (v_item_id, 'Абрикосовое', 260, 3),
    (v_item_id, 'Вишневое', 260, 4);

    -- Чайник чая (разбитый на отдельные позиции)
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Чайник чая (Черный)', 350, '600 мл', 2),
    (v_category_id, 'Чайник чая (Черный с бергамотом)', 350, '600 мл', 3),
    (v_category_id, 'Чайник чая (Черный с чабрецом)', 350, '600 мл', 4),
    (v_category_id, 'Чайник чая (Зеленый)', 350, '600 мл', 5),
    (v_category_id, 'Чайник чая (Зеленый с жасмином)', 350, '600 мл', 6),
    (v_category_id, 'Чайник чая (Молочный улун)', 350, '600 мл', 7);

    -- Купажированный черный чай (разбитый на отдельные позиции)
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Купажированный чай (1001 ночь)', 350, '600 мл', 8),
    (v_category_id, 'Купажированный чай (Маленькие чудеса)', 350, '600 мл', 9),
    (v_category_id, 'Купажированный чай (Красные ягоды)', 350, '600 мл', 10);

    -- Остальные чаи
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Волшебный чай', 'Каркаде, корица, гвоздика, апельсин и яблоко', 430, '600 мл', 11),
    (v_category_id, 'Марокканский мятный чай', 'Черный чай с цитрусовыми нотками, корицей, гвоздикой и мятой', 500, '600 мл', 12),
    (v_category_id, 'Яблочно-медовый чай', 'Черный чай с яблоком, медом и яблочным соком', 430, '600 мл', 13),
    (v_category_id, 'Апельсиновый чай', 'Зеленый чай с соком апельсина и слайсами апельсина', 430, '600 мл', 14),
    (v_category_id, 'Облепиховый чай', 'Согревающий напиток с ягодами облепихи и медом', 650, '600 мл', 15);


    -- =============================================
    -- 2. ЧАЙ ОСВЕЖАЮЩИЙ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Чай освежающий', 20) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Красное море', 'Освежающий напиток на основе каркаде, с добавлением клубничного и ванильного сиропов и сока лимона', 430, '600 мл', 1),
    (v_category_id, 'Ледяное яблоко', 'Черный чай с соком лимона, мятой, сахарным сиропом и соком зеленого яблока', 430, '600 мл', 2);


    -- =============================================
    -- 3. КОФЕ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Кофе', 30) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'По-восточному', NULL, 160, '60 мл', 1),
    (v_category_id, 'Эспрессо', NULL, 160, '45 мл', 2),
    (v_category_id, 'Эспрессо доппио', NULL, 240, '90 мл', 3),
    (v_category_id, 'Американо', NULL, 160, '200 мл', 4),
    (v_category_id, 'Капучино', 'Классический или с сиропом', 290, '200 мл', 5),
    (v_category_id, 'Латте', 'Классический или с сиропом', 310, '215 мл', 6),
    (v_category_id, 'Глясе', '"Американо" с шариком ванильного мороженого', 360, '215 мл', 7),
    (v_category_id, 'Раф кофе', '"Эспрессо" с ванильными сиропом и сливками', 360, '215 мл', 8),
    (v_category_id, 'Флэт уайт', 'Двойная порция "Эспрессо" со взбитым молоком', 340, '310 мл', 9);


    -- =============================================
    -- 4. ХОЛОДНЫЙ КОФЕ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Холодный кофе', 40) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Мятный шоколад', 'Эспрессо, сироп "Мята", сироп "Шоколад", молоко', 430, '450 мл', 1);

    -- Ice coffee (с вариантами)
    INSERT INTO main_menu_items (category_id, name, description, price, weight, has_variants, order_index)
    VALUES (v_category_id, 'Ice coffee', 'Эспрессо, сироп на выбор', 430, '350 мл', TRUE, 2)
    RETURNING id INTO v_item_id;

    INSERT INTO main_menu_item_variants (item_id, name, price, order_index) VALUES
    (v_item_id, 'Карамель', 430, 1),
    (v_item_id, 'Орех', 430, 2),
    (v_item_id, 'Шоколад', 430, 3),
    (v_item_id, 'Кокос', 430, 4),
    (v_item_id, 'Ваниль', 430, 5);


    -- =============================================
    -- 5. СОКИ И НАПИТКИ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Соки и напитки', 50) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Сок в ассортименте (250 мл)', 80, '250 мл', 1),
    (v_category_id, 'Сок в ассортименте (1 л)', 340, '1 л', 2);

    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Морс "Домашний" (250 мл)', 140, '250 мл', 3),
    (v_category_id, 'Морс "Домашний" (1 л)', 580, '1 л', 4);

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Лимонад "Персик-клубника"', NULL, 580, '1 л', 5),
    (v_category_id, 'Лимонад "Вишневый"', NULL, 580, '1 л', 6),
    (v_category_id, 'Лимонад "Арбуз"', 'Сезонная позиция', 580, '1 л', 7),
    (v_category_id, 'Лимонад "Дыня"', 'Сезонная позиция', 580, '1 л', 8),
    (v_category_id, 'Тоник "Rich"', 'Стекло', 300, '330 мл', 9),
    (v_category_id, 'Добрый Cola', 'Стекло', 220, '250 мл', 10),
    (v_category_id, 'Добрый Cola без сахара', 'Стекло', 220, '250 мл', 11),
    (v_category_id, 'Добрый Апельсин', 'Стекло', 220, '250 мл', 12),
    (v_category_id, 'Добрый Лимон-лайм', 'Стекло', 220, '250 мл', 13),
    (v_category_id, 'Минеральная вода "Бон Аква"', 'Стекло', 180, '330 мл', 14),
    (v_category_id, 'Джермук', 'Стекло; с газом', 280, '500 мл', 15),
    (v_category_id, 'Боржоми', 'Стекло; с газом', 280, '500 мл', 16),
    (v_category_id, 'Лимонад "Тархун" / "Дюшес"', 'Стекло', 280, '500 мл', 17),
    (v_category_id, 'Свежевыжатый сок', 'Яблоко/апельсин/грейпфрут/сельдерей/морковь/лимон', 400, '250 мл', 18),
    (v_category_id, 'Бутылочное пиво', NULL, 300, '500 мл', 19);


    -- =============================================
    -- 6. КРЕПКИЙ АЛКОГОЛЬ (ПО КАТЕГОРИЯМ)
    -- =============================================
    
    -- ВОДКА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Водка', 60) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Чавыча Премиум', 130, '30 мл', 1),
    (v_category_id, 'Царская Серебро', 140, '30 мл', 2),
    (v_category_id, 'Царская Золото', 180, '30 мл', 3),
    (v_category_id, 'Онегин', 320, '30 мл', 4),
    (v_category_id, 'Белуга', 350, '30 мл', 5),
    (v_category_id, 'Чистые Росы', 400, '30 мл', 6),
    (v_category_id, 'Абсолют', 400, '30 мл', 7),
    (v_category_id, 'Мон Блан', 540, '30 мл', 8);

    -- КОНЬЯК
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Коньяк', 70) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Арарат 3 звезды', 290, '40 мл', 1),
    (v_category_id, 'Арарат 5 звезд', 420, '40 мл', 2),
    (v_category_id, 'Курвуазье 12 лет', 1100, '40 мл', 3);

    -- ВИСКИ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Виски', 80) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Вильям Лоусонс', 290, '40 мл', 1),
    (v_category_id, 'Баллантайнс', 410, '40 мл', 2),
    (v_category_id, 'Джим Бим', 480, '40 мл', 3),
    (v_category_id, 'Джемесон', 480, '40 мл', 4),
    (v_category_id, 'Джек Дэниэлс', 500, '40 мл', 5),
    (v_category_id, 'Чивас 12 лет', 680, '40 мл', 6),
    (v_category_id, 'Макаллан 12 лет', 1790, '40 мл', 7);

    -- РОМ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Ром', 90) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Капитан Морган Уайт', 320, '40 мл', 1),
    (v_category_id, 'Капитан Морган Пряный золотой', 320, '40 мл', 2),
    (v_category_id, 'Капитан Морган Дарк', 320, '40 мл', 3);

    -- ДЖИН
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Джин', 100) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Хопперс Ориджинал Драй', 190, '40 мл', 1),
    (v_category_id, 'Хопперс Мандарин/Розмарин', 190, '40 мл', 2),
    (v_category_id, 'Хопперс Лаванда/Чабрец', 190, '40 мл', 3),
    (v_category_id, 'Бифитер', 380, '40 мл', 4);

    -- ТЕКИЛА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Текила', 110) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Антигуа Круз Сильвер', 'серебряная', 430, '40 мл', 1),
    (v_category_id, 'Антигуа Круз Репосадо', 'золотая', 520, '40 мл', 2);

    -- ВЕРМУТ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Вермут', 120) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Мартини Бьянко', 700, '100 мл', 1),
    (v_category_id, 'Мартини Экстра Драй', 700, '100 мл', 2),
    (v_category_id, 'Мартини Россо', 700, '100 мл', 3);

    -- ЛИКЕРЫ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Ликеры', 130) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Егермейстер', 310, '40 мл', 1),
    (v_category_id, 'Бейлиз', 420, '40 мл', 2),
    (v_category_id, 'Самбука', 310, '40 мл', 3);


    -- =============================================
    -- 7. КОКТЕЙЛИ
    -- =============================================

    -- БЕЗАЛКОГОЛЬНЫЕ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Безалкогольные коктейли', 140) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Зеленая миля', 'Сироп "Блю Кюрасао", лимонный фреш, ананасовый сок, персиковый сок, сироп "Ваниль", содовая, свежая мята, сахар', 360, '330 мл', 1),
    (v_category_id, 'Лето пришло!', 'Сироп "Дыня", сок апельсина, сок ананаса, сок лимона, кусочки свежей дыни', 360, '250 мл', 2),
    (v_category_id, 'Мохито', 'Классический или клубничный', 360, '250 мл', 3),
    (v_category_id, 'Пина колада', 'Ананасовый сок, сироп "Кокос", сливки', 420, '330 мл', 4),
    (v_category_id, 'Цунами', 'Пюре киви, сироп "Личи", сок лимона, сок яблока', 360, '350 мл', 5),
    (v_category_id, 'Сливочное вдохновение', 'Молоко, ананасовый сок, персиковый сок, сироп "Клубника", сироп "Кокос"', 360, '330 мл', 6),
    (v_category_id, 'Цитрусовый взрыв', 'Ананасовый сок, апельсиновый сок, лимонный фреш, сироп "Гренадин"', 420, '500 мл', 7);

    -- Молочный коктейль (с вариантами)
    INSERT INTO main_menu_items (category_id, name, price, weight, has_variants, order_index)
    VALUES (v_category_id, 'Молочный коктейль', 450, '330 мл', TRUE, 8)
    RETURNING id INTO v_item_id;

    INSERT INTO main_menu_item_variants (item_id, name, price, order_index) VALUES
    (v_item_id, 'Ванильный', 450, 1),
    (v_item_id, 'Клубничный', 450, 2),
    (v_item_id, 'Шоколадный', 450, 3);

    -- АЛКОГОЛЬНЫЕ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Алкогольные коктейли', 150) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Свободное падение', 'Hoppers original gin, сок грейпфрута, сахарный сироп, сок лимона, корица, перец, грейпфрут', 430, '350 мл', 1),
    (v_category_id, 'Жгучий мандарин', 'Hoppers mandarin gin, сироп "Мандарин", сок апельсина, сок лимона, табаско', 500, '350 мл', 2),
    (v_category_id, 'Лавандос', 'Hoppers lavander gin, сироп "Лаванда", чабрец, сахарный сироп, сок лимона', 430, '250 мл', 3),
    (v_category_id, 'Боярский', 'Водка, сироп "Гренадин", "Табаско"', 470, '60 мл', 4),
    (v_category_id, 'Ягерита', 'Ликер "Егермейстер", сок лайма, ликер "Трипл сек", сахарный сироп, веточка розмарина, цедра апельсина', 500, '310 мл', 5),
    (v_category_id, 'Выпил, закусил', 'Виски, сироп "Гренадин", сок грейпфрута, сок лайма, огурец', 500, '250 мл', 6),
    (v_category_id, 'Яблочный штрудель', 'Виски, яблочный сок, корица, сироп "Ваниль"', 500, '330 мл', 7),
    (v_category_id, 'Апероль шприц', 'Ликер "Апероль", игристое вино, содовая, апельсин', 700, '300 мл', 8),
    (v_category_id, 'Ромовый пунш', 'Золотой ром, ликер "Апероль", сок лимона, сок апельсина, сироп "Гренадин", цедра апельсина', 780, '310 мл', 9),
    (v_category_id, 'Гео', 'Водка, киви, сироп "Зеленое яблоко", сок лайма, спрайт', 500, '350 мл', 10),
    (v_category_id, 'Голубая лагуна', 'Сироп "Блю Кюрасао", водка, спрайт, лимон', 420, '330 мл', 11),
    (v_category_id, 'Секс на пляже', 'Водка, ананасовый сок, персиковый сок, морс, сироп "Гренадин"', 420, '330 мл', 12),
    (v_category_id, 'Текила санрайз', 'Текила, апельсиновый сок, сироп "Гренадин"', 500, '330 мл', 13),
    (v_category_id, 'Маргарита', 'Текила, ликер "Трипл Сек", лайм фреш, соль', 500, '110 мл', 14),
    (v_category_id, 'Мохито', 'Ром, мята, лайм, тростниковый сахар', 500, '250 мл', 15),
    (v_category_id, 'Мохито клубничный', 'Ром, мята, лайм, сироп "Клубника"', 550, '250 мл', 16),
    (v_category_id, 'Алиса в стране бокалов', 'Белый ром, клубничный сироп, спрайт, сок лимона', 420, '330 мл', 17),
    (v_category_id, 'Пина колада', 'Ром, ананасовый сок, сливки, ликер "Пина Колада"', 700, '330 мл', 18),
    (v_category_id, 'Кайпиринья', 'Ром, лайм, тростниковый сироп', 580, '310 мл', 19),
    (v_category_id, 'Белый русский', 'Кофейный ликер, водка, сливки', 470, '90 мл', 20),
    (v_category_id, 'Лонг айленд', 'Текила, водка, ром, джин, ликер "Трипл сек", кола, лайм', 700, '500 мл', 21),
    (v_category_id, 'Б-52', 'Кофейный ликер, сливочный ликер, ликер "Трипл Сек"', 470, '60 мл', 22),
    (v_category_id, 'Медуза', 'Кокосовый ликер, сливочный ликер, светлый ром, ликер "Трипл Сек", сироп "Блю Кюрасао"', 470, '60 мл', 23),
    (v_category_id, 'Рецепт от врача', 'Кофейный ликер, сливочный ликер, текила, корица', 470, '60 мл', 24);


    -- =============================================
    -- 8. ИГРИСТЫЕ ВИНА
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Игристые вина', 160) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Бруни Просекко', 'Крепость 11%, белое брют, Италия, Венето. Глера', 3900, '750 мл', 1),
    (v_category_id, 'Бруни Кюве Дольче', 'Крепость 7.5%, белое сладкое, Италия, Пьемонт. Мускат, Мальвазия', 2350, '750 мл', 2),
    (v_category_id, 'Нуволе Брют', 'Брют белое, крепость 10%, ЗГУ Кубань. Алиготе, Пино Блан, Рислинг', 1500, '750 мл', 3),
    (v_category_id, 'Нуволе Полусладкое', 'Игристое белое полусладкое, крепость 10%, ЗГУ Кубань. Цитронный Магарача, Пино Бьянко', 1500, '750 мл', 4),
    (v_category_id, 'Балаклава Мускат', 'Белое полусладкое, крепость 11.5%, ЗГУ Крым. Мускат', 2000, '750 мл', 5),
    (v_category_id, 'Армения (белое полусухое)', 'Белое полусухое, крепость 11.5%. Кангун', 1750, '750 мл', 6),
    (v_category_id, 'Армения (розовое полусухое)', 'Розовое полусухое, крепость 11.5%. Арени', 1750, '750 мл', 7),
    (v_category_id, 'Мартини Асти', 'Игристое белое сладкое, крепость 7.5%, Италия. Белый мускат', 7050, '750 мл', 8),
    (v_category_id, 'Мартини Просекко', 'Игристое белое, крепость 11.5%, Италия. Глера', 7050, '750 мл', 9),
    (v_category_id, 'Мартини Брют', 'Игристое белое, крепость 11.5%, Италия. Пино Бьянко, Глера', 7050, '750 мл', 10);


    -- =============================================
    -- 9. БЕЛЫЕ ВИНА
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Белые вина', 170) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Пино Гриджио Альма Романа', 'Белое полусухое, крепость 12%, Италия', 2200, '750 мл', 1),
    (v_category_id, 'Совиньон Блан Селлар Селекшн', 'Белое сухое, крепость 11.5%, Чили', 2000, '750 мл', 2),
    (v_category_id, 'Армения (белое полусладкое)', 'Белое полусладкое, крепость 13%', 1750, '750 мл', 3),
    (v_category_id, 'Алазанская Долина (бут.)', 'Мамико, белое полусладкое, Грузия. Ркацители, Мцване', 1500, '750 мл', 4),
    (v_category_id, 'Алазанская Долина (бокал)', 'Мамико, белое полусладкое, Грузия', 380, '125 мл', 5),
    (v_category_id, 'Ханс Баер Рислинг', 'Белое полусухое, крепость 11.5%, Германия', 3400, '750 мл', 6),
    (v_category_id, 'Шато Люби', 'Белое сухое, крепость 12.5%, Франция (Бордо)', 3200, '750 мл', 7),
    (v_category_id, 'Армения (белое сухое)', 'Белое сухое, крепость 13%', 1750, '750 мл', 8),
    (v_category_id, 'Нуволе Бьянко Ароматико (бут.)', 'Белое сухое, крепость 11%. ЗГУ Кубань', 1500, '750 мл', 9),
    (v_category_id, 'Нуволе Бьянко Ароматико (бокал)', 'Белое сухое, крепость 11%. ЗГУ Кубань', 380, '125 мл', 10);


    -- =============================================
    -- 10. КРАСНЫЕ ВИНА
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Красные вина', 180) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Санджовезе Рубиконе Альма Романа', 'Красное полусухое, крепость 12.5%, Италия', 2200, '750 мл', 1),
    (v_category_id, 'Киндзмараули', 'Мамико, красное полусладкое, крепость 11%, Грузия', 2000, '750 мл', 2),
    (v_category_id, 'Алазанская Долина (бут.)', 'Мамико, красное полусладкое, крепость 12%, Грузия', 1500, '750 мл', 3),
    (v_category_id, 'Алазанская Долина (бокал)', 'Мамико, красное полусладкое, крепость 12%, Грузия', 380, '125 мл', 4),
    (v_category_id, 'Армения (красное полусладкое)', 'Красное полусладкое, крепость 12%', 1750, '750 мл', 5),
    (v_category_id, 'Армения (красное сухое)', 'Красное сухое, крепость 13%', 1750, '750 мл', 6),
    (v_category_id, 'Бруни Монтепульчано Д''Абруццо', 'Красное сухое, крепость 12.5%, Италия', 2900, '750 мл', 7),
    (v_category_id, 'Шато Люби', 'Красное сухое, крепость 14%, Франция (Бордо)', 3200, '750 мл', 8),
    (v_category_id, 'Шираз Камден Парк', 'Красное полусухое, крепость 14%, Австралия', 2900, '750 мл', 9),
    (v_category_id, 'Мальбек Трапиче (Мнглоса)', 'Красное сухое, крепость 12.5%, Аргентина', 2900, '750 мл', 10),
    (v_category_id, 'Нуволе Каберне Мерло (бут.)', 'Красное сухое, крепость 12%, ЗГУ Кубань', 1500, '750 мл', 11),
    (v_category_id, 'Нуволе Каберне Мерло (бокал)', 'Красное сухое, крепость 12%, ЗГУ Кубань', 380, '125 мл', 12);


    -- =============================================
    -- 11. РОЗОВЫЕ ВИНА
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Розовые вина', 190) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Нуволе Розе (бут.)', 'Розовое сухое, крепость 11.5% ЗГУ Кубань', 1500, '750 мл', 1),
    (v_category_id, 'Нуволе Розе (бокал)', 'Розовое сухое, крепость 11.5% ЗГУ Кубань', 380, '125 мл', 2);


    -- =============================================
    -- 12. БЕЗАЛКОГОЛЬНОЕ ВИНО
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Безалкогольное вино', 200) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Hans Baer', 'Розовое сладкое, 0.5% Германия. Пино Нуар', 2350, '750 мл', 1),
    (v_category_id, 'Vina Albali', 'Розовое сладкое, 0.5% Испания. Гарнача', 2350, '750 мл', 2);


    -- =============================================
    -- 13. ДЕТСКОЕ МЕНЮ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Детское меню', 210) RETURNING id INTO v_category_id;

    -- Бургер (с вариантами цены и котлеты)
    -- Базовая цена - цена дешевого варианта для отображения ОТ ...
    INSERT INTO main_menu_items (category_id, name, description, price, weight, has_variants, order_index)
    VALUES (v_category_id, 'Детский бургер с фри', 'Ароматная булочка, котлета, овощи, сыр, соус + фри и кетчуп', 590, '390 гр', TRUE, 1)
    RETURNING id INTO v_item_id;

    -- Варианты с полной стоимостью (предполагаем логику замены цены)
    INSERT INTO main_menu_item_variants (item_id, name, price, order_index) VALUES
    (v_item_id, 'Котлета из курицы', 590, 1),
    (v_item_id, 'Котлета из говядины', 690, 2);

    -- Салаты
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Салатик «с голубикой и курицей»', 'Куриное филе, салат, пармезан, голубика, крем-бальзамик', 490, '150 гр', 2),
    (v_category_id, '«Цезарек с курочкой»', NULL, 280, '115 гр', 3),
    (v_category_id, '«Морковные и яблочные палочки»', NULL, 180, '150 гр', 4),
    (v_category_id, '«Овощной салатик»', 'Помидоры, огурцы, перец, маслины', 390, '180 гр', 5);

    -- Супы
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, '«Борщ со сметанкой»', 210, '270 гр', 6),
    (v_category_id, '«Лапшичка куриная»', 210, '315 гр', 7);

    -- Основные
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Куриная котлетка с пюре', 340, '200 гр', 8),
    (v_category_id, 'Паста «с томатами»', 310, '180 гр', 9),
    (v_category_id, 'Паста «с курочкой»', 510, '200 гр', 10),
    (v_category_id, 'Паста «Сырная»', 410, '180 гр', 11);

    -- Закуски
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, '«Куриные Наггетсы» с кетчупом', 350, '120/50 гр', 12),
    (v_category_id, '«Хрустящие сырные шарики»', 480, '200 гр', 13),
    (v_category_id, '«Золотистые куриные колобки»', 360, '200 гр', 14);

    -- Пицца
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, '«Пицца с сыром и курочкой»', 580, '350 гр', 15),
    (v_category_id, '«Пицца с грушей и Нутеллой»', 660, '350 гр', 16);

END $$;
