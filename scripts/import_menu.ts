
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const JSON_PATH = 'c:\\Users\\potyl\\OneDrive\\Desktop\\new menu main.json';

interface MenuItemVariant {
  название: string;
  вес: string | null;
  цена: string | null;
}

interface MenuItem {
  название: string;
  описание: string | null;
  вес: string | null;
  цена: string | null;
  цена_за_100г?: string | null;
  варианты?: MenuItemVariant[];
  примечание?: string; // Sometimes items have notes too? Or just categories
}

interface MenuCategory {
  название: string;
  примечание?: string;
  позиции: MenuItem[];
}

interface MenuJson {
  ресторан: string;
  категории: MenuCategory[];
}

function parsePrice(priceStr: string | null | undefined): number | null {
  if (!priceStr) return null;
  // Remove " ₽", spaces, etc.
  const cleaned = priceStr.replace(/[^\d.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function parseWeight(weightStr: string | null | undefined): { weight: string | null, weight_grams: number | null } {
  if (!weightStr) return { weight: null, weight_grams: null };
  const gramsMatch = weightStr.match(/(\d+)\s*г/);
  let grams: number | null = null;
  if (gramsMatch) {
    grams = parseInt(gramsMatch[1], 10);
  } else if (weightStr.includes('шт')) {
     // Handle "1 шт" etc if needed, but for now just store string
  }
  return { weight: weightStr, weight_grams: grams };
}

async function importMenu() {
  console.log('Reading JSON file...');
  const fileContent = fs.readFileSync(JSON_PATH, 'utf-8');
  const data: MenuJson = JSON.parse(fileContent);

  console.log(`Found restaurant: ${data.ресторан}`);
  console.log(`Found ${data.категории.length} categories.`);

  // 1. Clear existing data (optional, but good for full sync)
  console.log('Clearing existing main menu data...');
  const { error: deleteError } = await supabase
    .from('main_menu_categories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error clearing data:', deleteError);
    return;
  }

  // 2. Import Categories
  for (let i = 0; i < data.категории.length; i++) {
    const cat = data.категории[i];
    console.log(`Importing category: ${cat.название}`);

    const { data: catData, error: catError } = await supabase
      .from('main_menu_categories')
      .insert({
        name: cat.название,
        note: cat.примечание || null,
        order_index: i
      })
      .select()
      .single();

    if (catError || !catData) {
      console.error(`Error inserting category ${cat.название}:`, catError);
      continue;
    }

    const categoryId = catData.id;

    // 3. Import Items
    if (cat.позиции && cat.позиции.length > 0) {
      for (let j = 0; j < cat.позиции.length; j++) {
        const item = cat.позиции[j];
        const { weight, weight_grams } = parseWeight(item.вес);
        const price = parsePrice(item.цена);
        const pricePer100g = parsePrice(item.цена_за_100г);
        
        // Some items description is null
        // Check variants
        const hasVariants = !!(item.варианты && item.варианты.length > 0);

        const { data: itemData, error: itemError } = await supabase
          .from('main_menu_items')
          .insert({
            category_id: categoryId,
            name: item.название,
            description: item.описание || null,
            weight: weight,
            weight_grams: weight_grams,
            price: price,
            price_per_100g: pricePer100g,
            has_variants: hasVariants,
            order_index: j
          })
          .select()
          .single();

        if (itemError || !itemData) {
          console.error(`  Error inserting item ${item.название}:`, itemError);
          continue;
        }

        // 4. Import Variants
        if (hasVariants && item.варианты) {
          for (let k = 0; k < item.варианты.length; k++) {
            const variant = item.варианты[k];
            const { weight: vWeight, weight_grams: vWeightGrams } = parseWeight(variant.вес);
            const vPrice = parsePrice(variant.цена);

            const { error: variantError } = await supabase
              .from('main_menu_item_variants')
              .insert({
                item_id: itemData.id,
                name: variant.название,
                weight: vWeight,
                weight_grams: vWeightGrams,
                price: vPrice,
                order_index: k
              });
            
            if (variantError) {
              console.error(`    Error inserting variant ${variant.название}:`, variantError);
            }
          }
        }
      }
    }
  }

  console.log('Import completed successfully!');
}

importMenu();
