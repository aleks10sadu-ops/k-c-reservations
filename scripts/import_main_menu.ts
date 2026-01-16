/**
 * Скрипт импорта данных основного меню из JSON в Supabase
 * 
 * Использование:
 * 1. Положите JSON файл меню в корень проекта как menu.json
 * 2. Запустите: npx ts-node --esm scripts/import_main_menu.ts
 * 
 * Или можно использовать в браузерной консоли с готовыми данными
 */

interface JsonMenuItem {
    название: string
    описание?: string | null
    вес?: string
    цена?: string | null
    цена_за_100г?: string
    варианты?: Array<{
        название: string
        вес: string
        цена: string
    }>
}

interface JsonCategory {
    название: string
    примечание?: string
    позиции: JsonMenuItem[]
}

interface JsonMenu {
    ресторан: string
    категории: JsonCategory[]
}

// Парсинг цены из строки "820 ₽" -> 820
function parsePrice(priceStr: string | null | undefined): number | null {
    if (!priceStr) return null
    const match = priceStr.match(/[\d\s]+/)
    if (!match) return null
    return parseInt(match[0].replace(/\s/g, ''), 10) || null
}

// Парсинг веса из строки "550 г" -> 550
function parseWeight(weightStr: string | undefined): number | null {
    if (!weightStr) return null
    const match = weightStr.match(/(\d+)/)
    if (!match) return null
    return parseInt(match[1], 10) || null
}

// Экспорт функции для использования в браузере или Node.js
export async function importMainMenu(
    supabase: { from: (table: string) => unknown },
    menuData: JsonMenu
) {
    const results = {
        categories: 0,
        items: 0,
        variants: 0,
        errors: [] as string[]
    }

    for (let catIndex = 0; catIndex < menuData.категории.length; catIndex++) {
        const category = menuData.категории[catIndex]

        // Вставляем категорию
        const { data: categoryData, error: categoryError } = await (supabase.from('main_menu_categories') as {
            insert: (data: object) => { select: () => { single: () => Promise<{ data: { id: string } | null, error: Error | null }> } }
        })
            .insert({
                name: category.название,
                note: category.примечание || null,
                order_index: catIndex
            })
            .select()
            .single()

        if (categoryError || !categoryData) {
            results.errors.push(`Ошибка категории "${category.название}": ${categoryError?.message}`)
            continue
        }
        results.categories++

        // Вставляем позиции
        for (let itemIndex = 0; itemIndex < category.позиции.length; itemIndex++) {
            const item = category.позиции[itemIndex]
            const hasVariants = !!item.варианты && item.варианты.length > 0

            const { data: itemData, error: itemError } = await (supabase.from('main_menu_items') as {
                insert: (data: object) => { select: () => { single: () => Promise<{ data: { id: string } | null, error: Error | null }> } }
            })
                .insert({
                    category_id: categoryData.id,
                    name: item.название,
                    description: item.описание || null,
                    weight: item.вес || null,
                    weight_grams: parseWeight(item.вес),
                    price: parsePrice(item.цена),
                    price_per_100g: parsePrice(item.цена_за_100г),
                    min_portion_grams: item.цена_за_100г ? 300 : null, // По умолчанию мин. порция 300г для весовых
                    has_variants: hasVariants,
                    order_index: itemIndex
                })
                .select()
                .single()

            if (itemError || !itemData) {
                results.errors.push(`Ошибка позиции "${item.название}": ${itemError?.message}`)
                continue
            }
            results.items++

            // Вставляем варианты если есть
            if (hasVariants && item.варианты) {
                for (let varIndex = 0; varIndex < item.варианты.length; varIndex++) {
                    const variant = item.варианты[varIndex]

                    const { error: variantError } = await (supabase.from('main_menu_item_variants') as {
                        insert: (data: object) => Promise<{ error: Error | null }>
                    })
                        .insert({
                            item_id: itemData.id,
                            name: variant.название,
                            weight: variant.вес,
                            weight_grams: parseWeight(variant.вес),
                            price: parsePrice(variant.цена),
                            order_index: varIndex
                        })

                    if (variantError) {
                        results.errors.push(`Ошибка варианта "${variant.название}": ${variantError.message}`)
                        continue
                    }
                    results.variants++
                }
            }
        }
    }

    return results
}

// SQL скрипт для прямой вставки (альтернативный метод)
export function generateInsertSQL(menuData: JsonMenu): string {
    const lines: string[] = []
    lines.push('-- Автоматически сгенерированный SQL для импорта меню')
    lines.push('-- Сначала очистим существующие данные')
    lines.push('TRUNCATE main_menu_item_variants, main_menu_items, main_menu_categories CASCADE;')
    lines.push('')

    menuData.категории.forEach((category, catIndex) => {
        const catId = `cat_${catIndex}`
        lines.push(`-- Категория: ${category.название}`)
        lines.push(`INSERT INTO main_menu_categories (id, name, note, order_index) VALUES (`)
        lines.push(`  uuid_generate_v4(),`)
        lines.push(`  '${category.название.replace(/'/g, "''")}',`)
        lines.push(`  ${category.примечание ? `'${category.примечание.replace(/'/g, "''")}'` : 'NULL'},`)
        lines.push(`  ${catIndex}`)
        lines.push(`) RETURNING id INTO ${catId};`)
        lines.push('')

        category.позиции.forEach((item, itemIndex) => {
            const price = parsePrice(item.цена)
            const pricePer100g = parsePrice(item.цена_за_100г)
            const weightGrams = parseWeight(item.вес)
            const hasVariants = !!item.варианты && item.варианты.length > 0

            lines.push(`INSERT INTO main_menu_items (category_id, name, description, weight, weight_grams, price, price_per_100g, min_portion_grams, has_variants, order_index)`)
            lines.push(`VALUES (${catId}, '${item.название.replace(/'/g, "''")}', ${item.описание ? `'${item.описание.replace(/'/g, "''")}'` : 'NULL'}, ${item.вес ? `'${item.вес}'` : 'NULL'}, ${weightGrams || 'NULL'}, ${price || 'NULL'}, ${pricePer100g || 'NULL'}, ${pricePer100g ? 300 : 'NULL'}, ${hasVariants}, ${itemIndex});`)
        })
        lines.push('')
    })

    return lines.join('\n')
}

// Если запускается напрямую в Node.js
// import { createClient } from '@supabase/supabase-js'
// import fs from 'fs'
//
// const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)
// const menuData = JSON.parse(fs.readFileSync('./menu.json', 'utf-8'))
// importMainMenu(supabase, menuData).then(console.log)
