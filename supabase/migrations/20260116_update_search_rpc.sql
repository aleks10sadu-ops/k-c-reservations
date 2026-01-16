-- Update search_main_menu_items function to support multi-word search (fuzzy matching)
-- and include weight_grams for calculations plus better sorting.

DROP FUNCTION IF EXISTS search_main_menu_items(TEXT, INTEGER);

CREATE OR REPLACE FUNCTION search_main_menu_items(search_query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    category_id UUID,
    category_name VARCHAR(200),
    name VARCHAR(300),
    description TEXT,
    weight VARCHAR(50),
    weight_grams INTEGER,
    price DECIMAL(10,2),
    price_per_100g DECIMAL(10,2),
    min_portion_grams INTEGER,
    has_variants BOOLEAN
) AS $$
DECLARE
    search_terms TEXT[];
    term TEXT;
BEGIN
    -- Split search query by spaces and remove empty terms
    search_terms := string_to_array(trim(search_query), ' ');
    
    RETURN QUERY
    SELECT 
        mi.id,
        mi.category_id,
        mc.name as category_name,
        mi.name,
        mi.description,
        mi.weight,
        mi.weight_grams,
        mi.price,
        mi.price_per_100g,
        mi.min_portion_grams,
        mi.has_variants
    FROM main_menu_items mi
    JOIN main_menu_categories mc ON mi.category_id = mc.id
    WHERE (
        -- Match all search terms (every word must be present in either name or category)
        -- This allows 'Пицца Маргарита' to match 'Пицца «Маргарита»'
        NOT EXISTS (
            SELECT 1 
            FROM unnest(search_terms) term 
            WHERE NOT (
                mi.name ILIKE '%' || term || '%' 
                OR mc.name ILIKE '%' || term || '%'
            )
        )
    )
    ORDER BY 
        CASE WHEN mi.name ILIKE search_query || '%' THEN 0 ELSE 1 END,
        mc.order_index,
        mi.order_index
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
