-- Migration to restore lost menu items from JSON
-- Generated based on user request to add items from "new menu main.json"

DO $$ 
DECLARE 
    v_category_id UUID;
    v_item_id UUID;
BEGIN
    -- =============================================
    -- ПИЦЦА И БУРГЕРЫ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Пицца и Бургеры', 300) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Пицца «Маргарита»', NULL, 820, '550 г', 1),
    (v_category_id, 'Пицца «С грушей и горгонзолой»', NULL, 1250, '700 г', 2),
    (v_category_id, 'Пицца «Ди-Карне»', 'Сыр "Моцарелла", пицца-соус, свиная грудинка, бекон, куриная грудка, соус BBQ, руккола', 1220, '740 г', 3),
    (v_category_id, 'Пицца с черным трюфелем', 'Тонкое хрустящее тесто, сливочный соус, моцарелла, черный трюфель', 1310, '420 г', 4),
    (v_category_id, 'Пицца «Пепперони»', NULL, 1160, '650 г', 5),
    (v_category_id, 'Пицца «Кватро Формаджи»', 'Сыр "Моцарелла", пицца-соус, "Чеддер", "Пармезан", "Дор Блю"', 1230, '650 г', 6),
    (v_category_id, 'Пицца «Цезарь»', 'Соус "Цезарь", куриное филе, пармезан, микс салатов, черри', 1180, '650 г', 7),
    (v_category_id, 'Бургер "Дичь какая-то!"', 'Чёрная булочка, котлета из кабана, котлета из оленины, овощи, соус "Брусничный", чеддер + Фри', 2320, '1000 г', 8),
    (v_category_id, 'Бургер «Кучер»', 'Булочка, котлета из баранчины, овощи, соус "Горчичный", чеддер, перец "Цицак" + Фри', 1100, '430 г', 9),
    (v_category_id, 'Бургер «Цезарь»', 'Булочка, куриная котлета, овощи, соус "Цезарь", пармезан + Фри', 1100, '440 г', 10),
    (v_category_id, 'Бургер «Охотник»', 'Булочка, котлета из говядины, овощи, соус "Чесночный", чеддер + Фри', 1180, '430 г', 11);

    -- =============================================
    -- ПЕКАРНЯ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Пекарня', 310) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Имеретинский хачапури', 'Закрытая лепешка с сырной начинкой', 980, '650 г', 1),
    (v_category_id, 'Аджарский хачапури', 'Лодочка с яйцом и маслом', 740, '440 г', 2),
    (v_category_id, '«Кутаб»', 'С начинкой на выбор: мясной фарш, сыр или зелень', 310, '1 шт', 3),
    (v_category_id, 'Фокачча с соусом «Песто» и сыром «Пармезан»', NULL, 310, '180 г', 4),
    (v_category_id, 'Фокачча с орегано, розмарином и сыром «Пармезан»', NULL, 310, '180 г', 5),
    (v_category_id, 'Фокачча с вялеными томатами', NULL, 310, '180 г', 6),
    (v_category_id, 'Фокачча с оливками и маслинами', NULL, 310, '180 г', 7),
    (v_category_id, 'Хлеб «На углях»', NULL, 160, '70 г', 8),
    (v_category_id, 'Лаваш Армянский', NULL, 110, '100 г', 9),
    (v_category_id, 'Булочка «Пшеничная» (2 шт.)', NULL, 95, '80 г', 10),
    (v_category_id, 'Булочка «Ржаная с кориандром» (2 шт.)', NULL, 95, '80 г', 11);

    -- =============================================
    -- СУПЫ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Супы', 320) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Уха с лососем, палтусом и цветной капустой', 'Сливочный бульон, обожженные сферы из рыбы, печеные овощи', 880, '400 г', 1),
    (v_category_id, 'Мясной суп из лося, оленя и кабана', 'Копченый бульон, филе оленя, ребра кабана, колбаса из лося', 750, '400 г', 2),
    (v_category_id, 'Суп с телятиной, копченым сыром и перцем рамиро', 'Говяжий бульон, томленая щечка, овечий сыр, печеный картофель', 750, '450 г', 3),
    (v_category_id, 'Борщ', 'Классический борщ с говядиной, салом и хлебом', 720, '400 г', 4),
    (v_category_id, 'Лапша куриная с яйцом пашот', 'С домашней курицей и лапшой', 560, '300 г', 5);

    -- =============================================
    -- САЛАТЫ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Салаты', 330) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Салат с копченой олениной, голубикой и шишками', 'Копченый марал, голубика, кедровые орехи, соус лайм-мед', 1140, '150 г', 1),
    (v_category_id, 'Салат с телятиной, белыми грибами и обожжённым картофелем', 'Телятина су-вид, соус из белых грибов, картофель', 1110, '250 г', 2),
    (v_category_id, 'Салат с уткой, грушей и апельсином', 'Копченое филе утки, груша, апельсин, медово-горчичная заправка', 1060, '170 г', 3),
    (v_category_id, 'Салат «Кучер»', 'Теплый салат с говядиной и свининой, сладким перцем', 1100, '250 г', 4),
    (v_category_id, 'Семга с цукини и лавандовым кремом', 'Слайсы цукини, малосольная семга, лавандовый сыр', 1060, '200 г', 5),
    (v_category_id, 'Крабовый салат со сливочным кремом и яблоком', 'Снежный краб, крем, яблоко, цукини', 970, '220 г', 6),
    (v_category_id, 'Салат с авокадо, грушей и медовым киноа', 'Авокадо, киноа, груша, томаты, грибы', 940, '220 г', 7),
    (v_category_id, 'Салат «Кавказ»', 'Помидоры, огурцы, перец, лук, орехи', 820, '230 г', 8),
    (v_category_id, 'Салат «Овощной»', 'Томат, огурец, перец, лук. Заправка на выбор', 780, '230 г', 9);

    -- Цезарь с вариантами
    INSERT INTO main_menu_items (category_id, name, description, price, weight, has_variants, order_index)
    VALUES (v_category_id, 'Салат «Цезарь»', 'Классический', 810, '210 г', TRUE, 10)
    RETURNING id INTO v_item_id;

    INSERT INTO main_menu_item_variants (item_id, name, weight, price, order_index) VALUES
    (v_item_id, 'С курицей', '210 г', 810, 1),
    (v_item_id, 'С креветками', '230 г', 1100, 2),
    (v_item_id, 'С лососем', '230 г', 1310, 3);

     INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Тар-тар из гребешка', 'Гребешки, икра тобико, тобаско', 1640, '160 г', 11),
    (v_category_id, 'Семга с авокадо и апельсиновой водой', 'Тар-тар из лосося с авокадо', 1520, '180 г', 12),
    (v_category_id, 'Омуль с морским виноградом и бородинским хлебом', 'Мусс из копченого омуля', 980, '190 г', 13),
    (v_category_id, 'Тар-тар из телятины с белыми грибами', 'Телятина, грибы, страчателла', 1140, '150 г', 14),
    (v_category_id, 'Воздушный паштет с клюквенным конфитюром', 'Куриный паштет', 740, '300 г', 15),
    (v_category_id, 'Жульен из лесных грибов', 'В сливочно-сметанном соусе под сыром', 560, '150 г', 16),
    (v_category_id, 'Жареный сулугуни с клюквенным соусом', 'В панировке с медом и орехами', 640, '220 г', 17),
    (v_category_id, 'Чесночные гренки', 'С чесночным соусом', 420, '170 г', 18);

    -- =============================================
    -- ЗАКУСКИ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Закуски', 340) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Перец Рамиро с домашней страчателлой', 'Обожжённый перец, страчателла, трюфель', 1140, '170 г', 1),
    (v_category_id, 'Вителло Тоннато', 'Телятина су-вид, соус из тунца', 1460, '200 г', 2),
    (v_category_id, 'Цукини с козьим сыром и мёдом из одуванчика', 'Цукини, козий сыр, мед', 960, '150 г', 3),
    (v_category_id, 'Сугудай из муксуна с копчёным луком', 'Филе муксуна, лайм, лук', 960, '130 г', 4),
    (v_category_id, 'Креветка Ботан с японским мандарином', 'Обожженные креветки, страчателла', 1240, '180 г', 5),
    (v_category_id, 'Креветки с базиликовым кремом', 'С мини-кукурузой', 1120, '200 г', 6),
    (v_category_id, 'Копченая оленина с черной смородиной', 'Филе оленя, страчателла, чернослив', 1140, '150 г', 7),
    (v_category_id, 'Подвешенная на кости оленина', 'Вырезка оленя, крем из черного чеснока', 1180, '120 г', 8);


    -- =============================================
    -- НА КОМПАНИЮ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('На компанию', 350) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Овощной букет', 'Свежие овощи, зелень, соус Блю чиз', 980, '450 г', 1),
    (v_category_id, 'Острый молодой перец «Цицак»', NULL, 450, '1 шт', 2),
    (v_category_id, 'Соленья', 'Ассорти', 450, '390 г', 3),
    (v_category_id, 'Баклажанные рулетики', 'С грецким орехом', 540, '150 г', 4),
    (v_category_id, 'Ассорти Кавказских сыров', 'Сулугуни, Чанах, Овечий, Мотал, мед', 840, '270 г', 5),
    (v_category_id, 'Ассорти фермерских сыров', 'Коровий, козий, с трюфелем и др.', 1630, '240 г', 6),
    (v_category_id, 'Деликатесное мясное ассорти', 'Балык, рулеты, вырезка, бастурма', 1460, '300 г', 7),
    (v_category_id, 'Сало домашнее', NULL, 480, '130 г', 8),
    (v_category_id, 'Сельдь с картофелем', NULL, 610, '250 г', 9),
    (v_category_id, 'Рыбное ассорти', 'Осетрина, лосось, масляная', 2460, '220 г', 10),
    (v_category_id, 'Оливки/Маслины (без косточек)', NULL, 360, '100 г', 11),
    (v_category_id, 'Оливки/Маслины (гигант)', NULL, 620, '100 г', 12),
    (v_category_id, 'Лимонная нарезка', NULL, 210, '100 г', 13);


    -- =============================================
    -- ДЕСЕРТЫ & МОРОЖЕНОЕ
    -- =============================================
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Десерты', 360) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, '«Прага»', 'Шоколадный бисквит, коньяк, ганаш', 590, '125 г', 1),
    (v_category_id, '«Млечный путь»', 'Суфле, бисквит, шоколад', 590, '120 г', 2),
    (v_category_id, 'Чизкейк «Нью-Йорк»', 'Классический сырный десерт', 590, '130 г', 3);

    INSERT INTO main_menu_categories (name, order_index) VALUES ('Домашнее мороженое', 370) RETURNING id INTO v_category_id;
    
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Мороженое с Лавандой', NULL, 220, '60 г', 1),
    (v_category_id, 'Мороженое с Личи', NULL, 220, '60 г', 2),
    (v_category_id, 'Мороженое из Черной смородины', NULL, 220, '60 г', 3),
    (v_category_id, 'Шоколадное мороженое с ржаным солодом', NULL, 220, '60 г', 4);

    INSERT INTO main_menu_categories (name, order_index) VALUES ('Десерты собственного приготовления', 380) RETURNING id INTO v_category_id;

    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Брауни с гранатовой сливой', 'С мороженым из личи', 650, '210 г', 1),
    (v_category_id, 'Пудинг из чиа с абрикосом', 'Кокосовый пудинг, голубика', 690, '210 г', 2),
    (v_category_id, 'Дикая ягода', 'Авторский десерт, сметана, мед, ягоды', 620, '180 г', 3),
    (v_category_id, 'Мусс «Три шоколада»', 'Белый, молочный, темный шоколад', 680, '120 г', 4),
    (v_category_id, '«Наполеон»', 'Слоеное тесто, сливочный крем', 590, '110 г', 5),
    (v_category_id, '«Красный бархат»', 'Красный бисквит, крем-чиз', 590, '125 г', 6),
    (v_category_id, '«Морковный торт»', 'Пряный бисквит, крем-чиз', 590, '130 г', 7),
    (v_category_id, '«Белочка»', 'Бисквит с орехом, сгущенка', 590, '120 г', 8);


    -- =============================================
    -- МЯСО И РЫБА (ПО ВЕСУ)
    -- =============================================
    
    -- БАРАНИНА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Баранина (за 100г)', 400) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Семечки', 'Мин. порция 300г', 980, 'порция (от 300г)', 1),
    (v_category_id, 'Корейка', 'Мин. порция 300г', 1070, 'порция (от 300г)', 2),
    (v_category_id, 'Мякоть', 'Мин. порция 300г', 980, 'порция (от 300г)', 3),
    (v_category_id, '«Ики-Бир»', 'Мякоть, курдюк', 980, 'порция (от 300г)', 4);

    -- КУРИЦА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Курица (за 100г)', 410) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Крылышки', 'Мин. порция 300г', 390, 'порция (от 300г)', 1),
    (v_category_id, 'Бедро', 'Мин. порция 300г', 460, 'порция (от 300г)', 2),
    (v_category_id, 'Филе', 'Мин. порция 300г', 460, 'порция (от 300г)', 3),
    (v_category_id, 'Цыпленок на углях (шт)', 'Цена за 1 шт 250г', 1200, '250 г', 4);

    -- ЛЮЛЯ-КЕБАБ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Люля-кебаб (за 100г)', 420) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Из курицы', 'Мин. порция 200г', 480, 'порция (от 200г)', 1),
    (v_category_id, 'Из говядины', 'Мин. порция 200г', 540, 'порция (от 200г)', 2),
    (v_category_id, 'Из баранины', 'Мин. порция 200г', 580, 'порция (от 200г)', 3),
    (v_category_id, 'Из мяса раков', 'Мин. порция 200г', 640, 'порция (от 200г)', 4);

    -- РЫБА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Рыба', 430) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Сибас, Форель или Дорадо (1 шт.)', 'Целая рыбка', 1690, '250-300 г', 1),
    (v_category_id, 'Стейк из семги (за 100г)', 'По весу', 1280, 'порция (от 100г)', 2),
    (v_category_id, 'Стейк из осетра (за 100г)', 'По весу', 1590, 'порция (от 100г)', 3);
    
    -- ОВОЩИ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Овощи', 440) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Овощи «Кавказ»', 'Целиковые: баклажан, перец, помидор', 1260, '350 г', 1),
    (v_category_id, 'Овощи «Европа»', 'Слайсы овощей и грибов', 660, '250 г', 2),
    (v_category_id, 'Грибы', NULL, 290, '100 г', 3),
    (v_category_id, 'Картофель «Черри»', NULL, 290, '150 г', 4);

    -- БЛЮДА НА УГЛЯХ - ДЛЯ КОМПАНИИ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Блюда на углях - Для компании', 450) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, '«Шашлычный сет 1»', 'Свиная шейка, люля из баранины, куриное бедро, картофель', 4250, '1250 г', 1),
    (v_category_id, '«Шашлычный сет 2»', 'Индейка, люля из курицы, баранина, овощи, картофель', 5250, '1450 г', 2),
    (v_category_id, '«Шашлычный сет 3»', 'Большой набор мяса и овощей', 6950, '2300 г', 3);

    -- ДИЧЬ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Дичь (за 100г)', 460) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Корейка из кабана', 'Мин. порция 200г', 1280, 'порция (от 200г)', 1),
    (v_category_id, 'Корейка из оленины', 'Мин. порция 200г', 1280, 'порция (от 200г)', 2),
    (v_category_id, 'Люля-кебаб из оленины', 'Мин. порция 200г', 660, 'порция (от 200г)', 3),
    (v_category_id, 'Люля-кебаб из мяса кабана', 'Мин. порция 200г', 660, 'порция (от 200г)', 4);
    
    -- ТЕЛЯТИНА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Телятина (за 100г)', 470) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Вырезка', 'Мин. порция 200г', 1480, 'порция (от 200г)', 1),
    (v_category_id, 'Корейка', 'Мин. порция 300г', 1100, 'порция (от 300г)', 2),
    (v_category_id, 'Мякоть', 'Мин. порция 300г', 1060, 'порция (от 300г)', 3);
    
    -- СВИНИНА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Свинина (за 100г)', 480) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Ребрышки', 'Мин. порция 300г', 480, 'порция (от 300г)', 1),
    (v_category_id, 'Шейка', 'Мин. порция 300г', 520, 'порция (от 300г)', 2),
    (v_category_id, 'Корейка', 'Мин. порция 300г', 480, 'порция (от 300г)', 3);
    
    -- ИНДЕЙКА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Индейка (за 100г)', 490) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Филе бедра', 'Мин. порция 300г', 390, 'порция (от 300г)', 1);

    -- =============================================
    -- НОВЫЕ ПОЗИЦИИ (ПРОДОЛЖЕНИЕ)
    -- =============================================

    -- ГОРЯЧИЕ БЛЮДА ИЗ РЫБЫ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Горячие блюда из рыбы', 500) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Филе палтуса с кремом из сельдерея', 'С папоротником и киноа', 1860, '250 г', 1),
    (v_category_id, 'Семга с гранатом и обожжённым луком пореем', 'Семга конфи', 1720, '270 г', 2),
    (v_category_id, 'Судак с орзо и вуалью из кальмара', 'С пармезаном', 1180, '310 г', 3),
    (v_category_id, 'Сибас, запеченный с овощами', 'С цукини, баклажанами, перцем', 1590, '300 г', 4),
    (v_category_id, 'Дорадо запеченная', 'С овощами, сыром и томатами', 1590, '300 г', 5);

    -- СОУСЫ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Соусы', 510) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Сырный', 130, '30 г', 1),
    (v_category_id, 'Кетчуп', 130, '30 г', 2),
    (v_category_id, 'Майонез', 130, '30 г', 3),
    (v_category_id, 'Сметана', 130, '30 г', 4),
    (v_category_id, 'Мацони', 130, '30 г', 5),
    (v_category_id, 'Чесночный', 130, '30 г', 6),
    (v_category_id, 'Аджика', 130, '30 г', 7),
    (v_category_id, 'Горчица', 130, '30 г', 8),
    (v_category_id, 'Хрен', 130, '30 г', 9),
    (v_category_id, 'Ткемали', 130, '30 г', 10),
    (v_category_id, 'Сацебели', 130, '30 г', 11),
    (v_category_id, 'Кисло-сладкий', 130, '30 г', 12),
    (v_category_id, 'Розовый острый', 130, '30 г', 13),
    (v_category_id, 'Наршараб', 130, '30 г', 14),
    (v_category_id, 'Шашлычный', 130, '30 г', 15),
    (v_category_id, 'Соевый', 130, '30 г', 16),
    (v_category_id, 'Шрирача', 130, '30 г', 17);

    -- ГОРЯЧИЕ МЯСНЫЕ БЛЮДА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Горячие мясные блюда', 520) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Утиное филе с диким абрикосом и грушей', 'Су-вид, 360г', 1380, '360 г', 1),
    (v_category_id, 'Оленина с птитимом и костным мозгом', 'Томленая 24ч', 1210, '250 г', 2),
    (v_category_id, 'Телячьи щёчки с фиолетовым картофелем', 'Томленые 24ч', 1320, '350 г', 3),
    (v_category_id, 'Бефстроганов из говяжьей вырезки', 'С грибами и пюре', 1480, '350 г', 4),
    (v_category_id, 'Филе миньон с эдамаме и белыми грибами', 'В маринаде из луковой золы', 2160, '350 г', 5),
    (v_category_id, 'Стейк Рибай', 'Prime+, зерновой откорм 200 дней', 3260, '400 г', 6),
    (v_category_id, 'Свиные ребра «По-Венски»', 'Запеченные с соусом Барбекю', 1180, '350 г', 7),
    (v_category_id, 'Толма', 'Рулетики из виноградных листьев с мясом', 1100, '250 г', 8),
    (v_category_id, 'Хинкали (1 шт)', 'Телятина/баранина/оленина/кабан. Мин 5 шт', 160, '1 шт', 9);

    -- ПАСТА
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Паста', 530) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, description, price, weight, order_index) VALUES
    (v_category_id, 'Паста «Карбонара»', 'Бекон, сливки, желток, пармезан', 880, '300 г', 1),
    (v_category_id, 'Паста с диким лососем', 'В томатном соусе со сливками', 1180, '330 г', 2),
    (v_category_id, 'Паста с черным трюфелем и пармезаном', 'Сливочный соус', 1260, '340 г', 3);

    -- ГАРНИРЫ
    INSERT INTO main_menu_categories (name, order_index) VALUES ('Гарниры', 540) RETURNING id INTO v_category_id;
    INSERT INTO main_menu_items (category_id, name, price, weight, order_index) VALUES
    (v_category_id, 'Картофель «Фри»', 280, '130 г', 1),
    (v_category_id, 'Картофель «По-деревенски»', 280, '130 г', 2);

END $$;
