"use client"

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
    Plus,
    Pencil,
    Trash2,
    Loader2,
    ChevronRight,
    Search,
    MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    useMainMenuCategories,
    useMainMenuItems,
    useCreateMutation,
    useUpdateMutation,
    useDeleteMutation
} from '@/hooks/useSupabase'
import { MainMenuCategory, MainMenuItem, MainMenuItemVariant } from '@/types'
import { formatCurrency, cn } from '@/lib/utils'

export function MainMenuManager() {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

    // Dialog states
    const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false)
    const [isItemDialogOpen, setIsItemDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<MainMenuCategory | null>(null)
    const [editingItem, setEditingItem] = useState<MainMenuItem | null>(null)

    // Forms
    const [categoryForm, setCategoryForm] = useState({
        name: '',
        note: ''
    })

    const [itemForm, setItemForm] = useState({
        name: '',
        description: '',
        weight: '',
        price: 0,
        price_per_100g: 0,
        min_portion_grams: 0,
        has_variants: false
    })

    // Data Hooks
    const { data: categories, loading: categoriesLoading } = useMainMenuCategories()
    const { data: items, loading: itemsLoading, refetch: refetchItems } = useMainMenuItems(selectedCategoryId || undefined)

    // Select first category by default
    useMemo(() => {
        if (!selectedCategoryId && categories.length > 0) {
            setSelectedCategoryId(categories[0].id)
        }
    }, [categories, selectedCategoryId])

    // Mutations
    const createCategory = useCreateMutation<MainMenuCategory>('main_menu_categories')
    const updateCategory = useUpdateMutation<MainMenuCategory>('main_menu_categories')
    const deleteCategory = useDeleteMutation('main_menu_categories')

    const createItem = useCreateMutation<MainMenuItem>('main_menu_items')
    const updateItem = useUpdateMutation<MainMenuItem>('main_menu_items')
    const deleteItem = useDeleteMutation('main_menu_items')

    // Handlers - Category
    const handleOpenAddCategory = () => {
        setCategoryForm({ name: '', note: '' })
        setEditingCategory(null)
        setIsCategoryDialogOpen(true)
    }

    const handleOpenEditCategory = (category: MainMenuCategory) => {
        setCategoryForm({ name: category.name, note: category.note || '' })
        setEditingCategory(category)
        setIsCategoryDialogOpen(true)
    }

    const handleSaveCategory = async () => {
        if (editingCategory) {
            await updateCategory.mutate(editingCategory.id, categoryForm)
        } else {
            await createCategory.mutate({
                ...categoryForm,
                order_index: categories.length // Simple append
            })
        }
        setIsCategoryDialogOpen(false)
    }

    const handleDeleteCategory = async (category: MainMenuCategory) => {
        if (confirm(`Удалить категорию "${category.name}" и все блюда в ней?`)) {
            await deleteCategory.mutate(category.id)
            if (selectedCategoryId === category.id) {
                setSelectedCategoryId(null)
            }
        }
    }

    // Handlers - Item
    const handleOpenAddItem = () => {
        if (!selectedCategoryId) return
        setItemForm({
            name: '',
            description: '',
            weight: '',
            price: 0,
            price_per_100g: 0,
            min_portion_grams: 0,
            has_variants: false
        })
        setEditingItem(null)
        setIsItemDialogOpen(true)
    }

    const handleOpenEditItem = (item: MainMenuItem) => {
        setItemForm({
            name: item.name,
            description: item.description || '',
            weight: item.weight || '',
            price: item.price || 0,
            price_per_100g: item.price_per_100g || 0,
            min_portion_grams: item.min_portion_grams || 0,
            has_variants: item.has_variants
        })
        setEditingItem(item)
        setIsItemDialogOpen(true)
    }

    const handleSaveItem = async () => {
        if (!selectedCategoryId) return

        const itemData = {
            ...itemForm,
            category_id: selectedCategoryId
        }

        if (editingItem) {
            await updateItem.mutate(editingItem.id, itemData)
        } else {
            await createItem.mutate({
                ...itemData,
                order_index: items.length
            })
        }

        await refetchItems()
        setIsItemDialogOpen(false)
    }

    const handleDeleteItem = async (id: string) => {
        if (confirm('Удалить эту позицию?')) {
            await deleteItem.mutate(id)
            await refetchItems()
        }
    }

    if (categoriesLoading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    return (
        <div className="flex h-[calc(100vh-200px)] min-h-[500px] border rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Sidebar - Categories */}
            <div className="w-1/3 min-w-[250px] border-r border-stone-200 bg-stone-50 flex flex-col">
                <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-white">
                    <h3 className="font-semibold text-stone-900">Категории</h3>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleOpenAddCategory}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1">
                        {categories.map(category => (
                            <div
                                key={category.id}
                                className={cn(
                                    "flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors text-sm",
                                    selectedCategoryId === category.id
                                        ? "bg-white text-amber-900 shadow-sm border border-stone-200 font-medium"
                                        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                                )}
                                onClick={() => setSelectedCategoryId(category.id)}
                            >
                                <span className="truncate">{category.name}</span>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                                selectedCategoryId === category.id && "opacity-100"
                                            )}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleOpenEditCategory(category)}>
                                            <Pencil className="h-4 w-4 mr-2" />
                                            Редактировать
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600"
                                            onClick={() => handleDeleteCategory(category)}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Удалить
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}

                        {categories.length === 0 && (
                            <div className="p-4 text-center text-sm text-stone-500">
                                Нет категорий. Создайте первую категорию.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Main Area - Items */}
            <div className="flex-1 flex flex-col bg-white">
                <div className="p-4 border-b border-stone-200 flex justify-between items-center h-[65px]">
                    <div>
                        <h3 className="font-semibold text-stone-900">
                            {categories.find(c => c.id === selectedCategoryId)?.name || 'Выберите категорию'}
                        </h3>
                        {items && (
                            <p className="text-xs text-stone-500">
                                {items.length} {items.length === 1 ? 'позиция' : 'позиций'}
                            </p>
                        )}
                    </div>
                    <Button
                        size="sm"
                        className="gap-2"
                        disabled={!selectedCategoryId}
                        onClick={handleOpenAddItem}
                    >
                        <Plus className="h-4 w-4" />
                        Добавить блюдо
                    </Button>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {itemsLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
                        </div>
                    ) : !selectedCategoryId ? (
                        <div className="flex flex-col items-center justify-center h-full text-stone-400">
                            <ChevronRight className="h-12 w-12 mb-2 opacity-20" />
                            <p>Выберите категорию слева</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-stone-400">
                            <Search className="h-12 w-12 mb-2 opacity-20" />
                            <p>В этой категории пока нет блюд</p>
                            <Button variant="link" onClick={handleOpenAddItem}>Добавить первое блюдо</Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map(item => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-between p-4 rounded-lg border border-stone-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-stone-900 truncate">{item.name}</h4>
                                            {item.has_variants && (
                                                <Badge variant="secondary" className="text-[10px] h-5">Варианты</Badge>
                                            )}
                                        </div>
                                        {item.description && (
                                            <p className="text-sm text-stone-500 line-clamp-1 mb-1">{item.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 text-xs text-stone-400">
                                            {item.weight && <span>{item.weight}</span>}
                                            {item.price ? (
                                                <span className="font-medium text-amber-700">{formatCurrency(item.price)}</span>
                                            ) : item.price_per_100g ? (
                                                <span className="font-medium text-amber-700">{formatCurrency(item.price_per_100g)} / 100г</span>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-stone-500 hover:text-stone-900"
                                            onClick={() => handleOpenEditItem(item)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-stone-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {/* Dialogs */}
            <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}</DialogTitle>
                        <DialogDescription>
                            Укажите название категории для основного меню
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Название</Label>
                            <Input
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                placeholder="Например: Горячие блюда"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Примечание (необязательно)</Label>
                            <Input
                                value={categoryForm.note}
                                onChange={(e) => setCategoryForm({ ...categoryForm, note: e.target.value })}
                                placeholder="Внутренняя заметка"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>Отмена</Button>
                        <Button onClick={handleSaveCategory} disabled={!categoryForm.name.trim()}>Сохранить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Редактировать блюдо' : 'Добавить блюдо'}</DialogTitle>
                        <DialogDescription>
                            Заполните информацию о блюде и его вариантах
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Название *</Label>
                            <Input
                                value={itemForm.name}
                                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                placeholder="Название блюда"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Описание</Label>
                            <Textarea
                                value={itemForm.description}
                                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                                placeholder="Состав, особенности..."
                                className="h-20"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Вес (текст)</Label>
                                <Input
                                    value={itemForm.weight}
                                    onChange={(e) => setItemForm({ ...itemForm, weight: e.target.value })}
                                    placeholder="250 гр."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Мин. порция (гр)</Label>
                                <Input
                                    type="number"
                                    value={itemForm.min_portion_grams || ''}
                                    onChange={(e) => setItemForm({ ...itemForm, min_portion_grams: Number(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Цена (фиксированная)</Label>
                                <Input
                                    type="number"
                                    value={itemForm.price || ''}
                                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Цена за 100г (весовое)</Label>
                                <Input
                                    type="number"
                                    value={itemForm.price_per_100g || ''}
                                    onChange={(e) => setItemForm({ ...itemForm, price_per_100g: Number(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="has-variants"
                                checked={itemForm.has_variants}
                                onCheckedChange={(checked: boolean) => setItemForm({ ...itemForm, has_variants: checked })}
                            />
                            <Label htmlFor="has-variants">Есть варианты (например, с курицей / с креветками)</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>Отмена</Button>
                        <Button onClick={handleSaveItem} disabled={!itemForm.name.trim()}>Сохранить</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
