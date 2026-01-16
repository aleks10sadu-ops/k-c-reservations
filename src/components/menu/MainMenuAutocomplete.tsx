"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, ChevronRight, Scale, Package } from 'lucide-react'
import { MainMenuItem, MainMenuItemVariant } from '@/types'
import { cn } from '@/lib/utils'

interface MainMenuAutocompleteProps {
    onSelect: (
        item: MainMenuItem,
        variant?: MainMenuItemVariant,
        weightGrams?: number
    ) => void
    disabled?: boolean
    className?: string
}

interface SearchResult extends MainMenuItem {
    category_name: string
}

export function MainMenuAutocomplete({
    onSelect,
    disabled = false,
    className
}: MainMenuAutocompleteProps) {
    const supabase = createClient()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null)
    const [selectedVariant, setSelectedVariant] = useState<MainMenuItemVariant | null>(null)
    const [weightInput, setWeightInput] = useState('')
    const [showWeightInput, setShowWeightInput] = useState(false)
    const [showVariants, setShowVariants] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Поиск позиций меню
    const searchItems = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([])
            return
        }

        setIsLoading(true)
        try {
            const { data, error } = await supabase
                .rpc('search_main_menu_items', {
                    search_query: searchQuery,
                    limit_count: 20
                })

            if (error) {
                console.error('Search error:', error)
                // Fallback to direct query if RPC not available
                const { data: fallbackData } = await supabase
                    .from('main_menu_items')
                    .select(`
            *,
            category:main_menu_categories(name)
          `)
                    .ilike('name', `%${searchQuery}%`)
                    .limit(20)

                if (fallbackData) {
                    setResults(fallbackData.map((item: { category?: { name: string } }) => ({
                        ...item,
                        category_name: item.category?.name || ''
                    })) as SearchResult[])
                }
            } else if (data) {
                setResults(data as SearchResult[])
            }
        } catch (err) {
            console.error('Search failed:', err)
        } finally {
            setIsLoading(false)
        }
    }, [supabase])

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current)
        }

        debounceRef.current = setTimeout(() => {
            searchItems(query)
        }, 300)

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current)
            }
        }
    }, [query, searchItems])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false)
                resetSelection()
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const resetSelection = () => {
        setSelectedItem(null)
        setSelectedVariant(null)
        setWeightInput('')
        setShowWeightInput(false)
        setShowVariants(false)
    }

    // Загрузка вариантов для позиции
    const loadVariants = async (item: SearchResult) => {
        const { data } = await supabase
            .from('main_menu_item_variants')
            .select('*')
            .eq('item_id', item.id)
            .order('order_index')

        return data as MainMenuItemVariant[] || []
    }

    // Обработка выбора позиции
    const handleItemClick = async (item: SearchResult) => {
        setSelectedItem(item)

        // Если есть варианты - показываем выбор
        if (item.has_variants) {
            const variants = await loadVariants(item)
            if (variants.length > 0) {
                setSelectedItem({ ...item, variants })
                setShowVariants(true)
                return
            }
        }

        // Если весовая позиция - показываем ввод веса
        if (item.price_per_100g && !item.price) {
            setShowWeightInput(true)
            setWeightInput(item.min_portion_grams?.toString() || '300')
            return
        }

        // Обычная позиция - сразу добавляем
        handleAdd(item)
    }

    // Обработка выбора варианта
    const handleVariantClick = (variant: MainMenuItemVariant) => {
        setSelectedVariant(variant)
        setShowVariants(false)

        // Добавляем с выбранным вариантом
        if (selectedItem) {
            handleAdd(selectedItem, variant)
        }
    }

    // Подтверждение веса для весовой позиции
    const handleWeightConfirm = () => {
        const weight = parseInt(weightInput, 10)
        if (selectedItem && weight > 0) {
            const minPortion = selectedItem.min_portion_grams || 200
            const finalWeight = Math.max(weight, minPortion)
            handleAdd(selectedItem, undefined, finalWeight)
        }
    }

    // Добавление позиции
    const handleAdd = (
        item: SearchResult,
        variant?: MainMenuItemVariant,
        weightGrams?: number
    ) => {
        onSelect(item, variant, weightGrams)
        setQuery('')
        setResults([])
        setIsOpen(false)
        resetSelection()
        inputRef.current?.focus()
    }

    // Группировка результатов по категориям
    const groupedResults = results.reduce((acc, item) => {
        const category = item.category_name || 'Без категории'
        if (!acc[category]) {
            acc[category] = []
        }
        acc[category].push(item)
        return acc
    }, {} as Record<string, SearchResult[]>)

    // Расчет примерной цены для весовой позиции
    const calculateWeightPrice = (item: SearchResult, weight: number) => {
        if (item.price_per_100g) {
            return Math.round((item.price_per_100g * weight) / 100)
        }
        return 0
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                        resetSelection()
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Поиск позиции меню..."
                    className="pl-10"
                    disabled={disabled}
                />
            </div>

            {/* Выпадающий список результатов */}
            {isOpen && (results.length > 0 || isLoading || showWeightInput || showVariants) && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg overflow-hidden">
                    {/* Ввод веса для весовой позиции */}
                    {showWeightInput && selectedItem && (
                        <div className="p-4 border-b bg-muted/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Scale className="h-4 w-4 text-amber-600" />
                                <span className="font-medium">{selectedItem.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Цена: {selectedItem.price_per_100g} ₽/100г
                                {selectedItem.min_portion_grams && (
                                    <span> • Мин. порция: {selectedItem.min_portion_grams}г</span>
                                )}
                            </p>
                            <div className="flex items-center gap-2">
                                <Input
                                    type="number"
                                    value={weightInput}
                                    onChange={(e) => setWeightInput(e.target.value)}
                                    placeholder="Вес в граммах"
                                    className="w-32"
                                    min={selectedItem.min_portion_grams || 100}
                                    step={50}
                                />
                                <span className="text-sm text-muted-foreground">г</span>
                                <span className="text-sm font-medium ml-2">
                                    = {calculateWeightPrice(selectedItem, parseInt(weightInput) || 0)} ₽
                                </span>
                                <Button
                                    size="sm"
                                    onClick={handleWeightConfirm}
                                    className="ml-auto"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Добавить
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Выбор варианта */}
                    {showVariants && selectedItem?.variants && (
                        <div className="p-4 border-b bg-muted/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Package className="h-4 w-4 text-blue-600" />
                                <span className="font-medium">{selectedItem.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">Выберите вариант:</p>
                            <div className="flex flex-wrap gap-2">
                                {selectedItem.variants.map((variant) => (
                                    <Button
                                        key={variant.id}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleVariantClick(variant)}
                                        className="flex items-center gap-2"
                                    >
                                        {variant.name}
                                        {variant.weight && (
                                            <span className="text-muted-foreground text-xs">{variant.weight}</span>
                                        )}
                                        <span className="font-medium text-primary">{variant.price} ₽</span>
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Список результатов поиска */}
                    {!showWeightInput && !showVariants && (
                        <ScrollArea className="max-h-80">
                            {isLoading ? (
                                <div className="p-4 text-center text-muted-foreground">
                                    Поиск...
                                </div>
                            ) : (
                                Object.entries(groupedResults).map(([category, items]) => (
                                    <div key={category}>
                                        <div className="px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wide sticky top-0">
                                            {category}
                                        </div>
                                        {items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleItemClick(item)}
                                                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors text-left"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">{item.name}</div>
                                                    {item.description && (
                                                        <div className="text-xs text-muted-foreground truncate">
                                                            {item.description}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 ml-3 shrink-0">
                                                    {item.weight && (
                                                        <span className="text-xs text-muted-foreground">{item.weight}</span>
                                                    )}
                                                    {item.price ? (
                                                        <Badge variant="secondary">{item.price} ₽</Badge>
                                                    ) : item.price_per_100g ? (
                                                        <Badge variant="outline" className="text-amber-600 border-amber-300">
                                                            {item.price_per_100g} ₽/100г
                                                        </Badge>
                                                    ) : null}
                                                    {item.has_variants && (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ))
                            )}
                            {!isLoading && results.length === 0 && query.length >= 2 && (
                                <div className="p-4 text-center text-muted-foreground">
                                    Ничего не найдено
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </div>
            )}
        </div>
    )
}
