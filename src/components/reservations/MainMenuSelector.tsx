
import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import { MainMenuItem, MainMenuItemVariant } from "@/types"

interface MainMenuSelectorProps {
    onSelectItem: (item: MainMenuItem, variant?: MainMenuItemVariant) => void
}

export function MainMenuSelector({ onSelectItem }: MainMenuSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")
    const [items, setItems] = React.useState<MainMenuItem[]>([])
    const [loading, setLoading] = React.useState(false)
    const [selectedItemForVariant, setSelectedItemForVariant] = React.useState<MainMenuItem | null>(null)
    const [variants, setVariants] = React.useState<MainMenuItemVariant[]>([])
    const [loadingVariants, setLoadingVariants] = React.useState(false)

    const supabase = createClient()

    // Debounced search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (search.length > 1) {
                fetchItems(search)
            } else {
                setItems([])
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [search])

    const fetchItems = async (query: string) => {
        setLoading(true)
        try {
            // Use the RPC function we created
            const { data, error } = await supabase
                .rpc('search_main_menu_items', { search_query: query, limit_count: 20 })

            if (error) {
                console.error('Error searching menu items:', error)
                return
            }

            // Cast the result to MainMenuItem, adding missing default fields if necessary
            const mappedItems: MainMenuItem[] = (data || []).map((item: any) => {
                let weightGrams = item.weight_grams || 0;
                if (!weightGrams && item.weight) {
                    const match = item.weight.match(/(\d+)/);
                    if (match) weightGrams = parseInt(match[1], 10);
                }

                return {
                    ...item,
                    weight_grams: weightGrams,
                    order_index: item.order_index || 0,
                    variants: [],
                };
            })

            setItems(mappedItems)
        } catch (err) {
            console.error('Failed to fetch items', err)
        } finally {
            setLoading(false)
        }
    }

    const fetchVariants = async (itemId: string) => {
        setLoadingVariants(true)
        try {
            const { data, error } = await supabase
                .from('main_menu_item_variants')
                .select('*')
                .eq('item_id', itemId)
                .order('order_index')

            if (error) {
                console.error('Error fetching variants:', error)
                return
            }

            setVariants(data as MainMenuItemVariant[] || [])
        } catch (err) {
            console.error('Failed to fetch variants', err)
        } finally {
            setLoadingVariants(false)
        }
    }

    const handleSelect = async (item: MainMenuItem) => {
        if (item.has_variants) {
            setSelectedItemForVariant(item)
            setSearch("") // Clear search to show variants correctly
            await fetchVariants(item.id)
        } else {
            onSelectItem(item)
            setOpen(false)
            setSearch("")
            setItems([])
        }
    }

    const handleVariantSelect = (variant: MainMenuItemVariant) => {
        if (selectedItemForVariant) {
            onSelectItem(selectedItemForVariant, variant)
            setSelectedItemForVariant(null)
            setVariants([])
            setOpen(false)
            setSearch("")
            setItems([])
        }
    }

    return (
        <Popover open={open} onOpenChange={(val) => {
            setOpen(val)
            if (!val) {
                setSelectedItemForVariant(null)
                setVariants([])
            }
        }}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                    onClick={() => setOpen(true)}
                >
                    {selectedItemForVariant ? (
                        <span className="flex items-center gap-2 truncate">
                            <span className="text-stone-400 capitalize">{selectedItemForVariant.name}:</span>
                            <span>выберите вариант</span>
                        </span>
                    ) : "Добавить блюдо..."}
                    <Plus className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] min-w-[300px] max-w-[90vw] p-0 shadow-2xl border-amber-100 rounded-2xl"
                align="start"
                onWheel={(e) => e.stopPropagation()}
            >
                <Command shouldFilter={!!selectedItemForVariant}>
                    <div className="flex items-center border-b px-3">
                        {selectedItemForVariant && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 mr-2 hover:bg-amber-50 text-amber-600"
                                onClick={() => {
                                    setSelectedItemForVariant(null)
                                    setVariants([])
                                }}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <CommandInput
                            placeholder={selectedItemForVariant ? "Поиск варианта..." : "Поиск блюда..."}
                            value={search}
                            onValueChange={setSearch}
                            className="flex-1"
                        />
                    </div>
                    <CommandList
                        className="max-h-[400px] overflow-y-auto overscroll-contain"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {loading || loadingVariants ? (
                            <div className="flex items-center justify-center p-6">
                                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>
                                    {selectedItemForVariant ? "Варианты не найдены." : "Блюдо не найдено."}
                                </CommandEmpty>

                                {selectedItemForVariant ? (
                                    <CommandGroup heading={`Варианты: ${selectedItemForVariant.name}`}>
                                        {variants.map((v) => (
                                            <CommandItem
                                                key={v.id}
                                                onSelect={() => handleVariantSelect(v)}
                                                className="flex justify-between items-center py-3 px-4 cursor-pointer hover:bg-amber-50/50"
                                            >
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-stone-900">{v.name}</span>
                                                    {(v.weight || v.weight_grams) && (
                                                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-tight">
                                                            {v.weight || `${v.weight_grams}г`}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-sm font-black text-amber-700">{v.price} ₽</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                ) : (
                                    items.length > 0 && (
                                        <CommandGroup heading="Результаты поиска">
                                            {items.map((item) => (
                                                <CommandItem
                                                    key={item.id}
                                                    onSelect={() => handleSelect(item)}
                                                    className="flex flex-col items-start gap-1 py-3 px-4 cursor-pointer hover:bg-amber-50/50"
                                                >
                                                    <div className="flex w-full justify-between items-center">
                                                        <span className="font-bold text-stone-900">{item.name}</span>
                                                        <span className="text-sm font-black text-amber-700">
                                                            {item.has_variants ? 'от ' : ''}
                                                            {item.price ? `${item.price} ₽` : 'Цена по весу'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between w-full text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                                        <span>{item.category_name}</span>
                                                        {(item.weight || item.weight_grams) && (
                                                            <span>{item.weight || `${item.weight_grams}г`}</span>
                                                        )}
                                                    </div>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )
                                )}
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
