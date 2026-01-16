"use client"

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
    Plus,
    ChefHat,
    Pencil,
    Trash2,
    GripVertical,
    Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useMenus, useMenuItems, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { createMenuItemType, getMenuItemTypes, updateMenuItemsByType } from '@/lib/supabase/api'
import { formatCurrency, cn } from '@/lib/utils'
import { Menu, MenuItem, STANDARD_MENU_ITEM_TYPE_CONFIG, getMenuItemTypeLabel, MenuItemType, StandardMenuItemType, CustomMenuItemType } from '@/types'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export function BanquetMenuManager() {
    const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
    const [isAddItemOpen, setIsAddItemOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
    const [editingMenu, setEditingMenu] = useState<Menu | null>(null)

    // Состояние для управления типами в форме блюда
    const [isAddingNewType, setIsAddingNewType] = useState(false)
    const [newTypeName, setNewTypeName] = useState('')
    const [isCreatingType, setIsCreatingType] = useState(false)

    // Состояние для редактирования типа блюда (из списка блюд)
    const [isEditTypeDialogOpen, setIsEditTypeDialogOpen] = useState(false)
    const [editingTypeFromList, setEditingTypeFromList] = useState<{ type: string; items: MenuItem[] } | null>(null)
    const [editTypeForm, setEditTypeForm] = useState({
        newType: '',
        isCreatingNew: false,
        newTypeName: ''
    })

    // Form states
    const [menuForm, setMenuForm] = useState({
        name: '',
        price_per_person: 0,
        total_weight_per_person: 0,
        description: '',
        is_active: true
    })

    const [itemForm, setItemForm] = useState({
        name: '',
        type: 'appetizer' as MenuItemType,
        weight_per_person: 0,
        is_selectable: false,
        max_selections: 3,
        order_index: 0
    })

    // Fetch data
    const { data: menus, loading: menusLoading } = useMenus()
    const { data: allMenuItems, loading: itemsLoading, refetch: refetchMenuItems } = useMenuItems()

    // Mutations
    const createMenu = useCreateMutation<Menu>('menus')
    const updateMenu = useUpdateMutation<Menu>('menus')
    const deleteMenu = useDeleteMutation('menus')
    const createMenuItem = useCreateMutation<MenuItem>('menu_items')
    const updateMenuItem = useUpdateMutation<MenuItem>('menu_items')
    const deleteMenuItem = useDeleteMutation('menu_items')

    // Set first menu as selected if none selected
    const selectedMenu = useMemo(() => {
        if (selectedMenuId) {
            return menus.find(m => m.id === selectedMenuId) || menus[0]
        }
        if (menus.length > 0 && !selectedMenuId) {
            setSelectedMenuId(menus[0].id)
            return menus[0]
        }
        return null
    }, [menus, selectedMenuId])

    // Загружаем кастомные типы для выбранного меню через Server Action
    const [customTypes, setCustomTypes] = useState<CustomMenuItemType[]>([])
    const [customTypesLoading, setCustomTypesLoading] = useState(false)

    const menuIdForTypes = selectedMenu?.id || selectedMenuId || undefined

    const loadCustomTypes = useCallback(async () => {
        if (!menuIdForTypes) {
            setCustomTypes([])
            return
        }

        setCustomTypesLoading(true)
        try {
            const types = await getMenuItemTypes(menuIdForTypes)
            setCustomTypes(types)
        } catch (error) {
            console.error('[BanquetMenuManager] Error loading custom types:', error)
            setCustomTypes([])
        } finally {
            setCustomTypesLoading(false)
        }
    }, [menuIdForTypes])

    // Загружаем типы при изменении меню
    useEffect(() => {
        loadCustomTypes()
    }, [loadCustomTypes])

    // Функция для обновления списка типов
    const refetchCustomTypes = useCallback(async () => {
        await loadCustomTypes()
    }, [loadCustomTypes])

    const menuItems = useMemo(() => {
        if (!selectedMenu) return []
        return allMenuItems.filter(item => item.menu_id === selectedMenu.id)
    }, [allMenuItems, selectedMenu])

    const itemsByType = useMemo(() => {
        return menuItems.reduce((acc, item) => {
            if (!acc[item.type]) acc[item.type] = []
            acc[item.type]!.push(item)
            return acc
        }, {} as Record<string, MenuItem[]>)
    }, [menuItems])


    const totalWeight = menuItems.reduce((sum, item) => sum + item.weight_per_person, 0)

    const resetMenuForm = () => {
        setMenuForm({
            name: '',
            price_per_person: 0,
            total_weight_per_person: 0,
            description: '',
            is_active: true
        })
        setEditingMenu(null)
    }

    const resetItemForm = () => {
        setItemForm({
            name: '',
            type: 'appetizer',
            weight_per_person: 0,
            is_selectable: false,
            max_selections: 3,
            order_index: menuItems.length
        })
        setEditingItem(null)
        setIsAddingNewType(false)
        setNewTypeName('')
    }

    const handleOpenAddMenu = () => {
        resetMenuForm()
        setIsAddMenuOpen(true)
    }

    const handleOpenEditMenu = (menu: Menu) => {
        setMenuForm({
            name: menu.name,
            price_per_person: menu.price_per_person,
            total_weight_per_person: menu.total_weight_per_person,
            description: menu.description || '',
            is_active: menu.is_active
        })
        setEditingMenu(menu)
        setIsAddMenuOpen(true)
    }

    const handleSaveMenu = async () => {
        if (editingMenu) {
            await updateMenu.mutate(editingMenu.id, menuForm)
        } else {
            await createMenu.mutate(menuForm)
        }
        setIsAddMenuOpen(false)
        resetMenuForm()
    }

    const handleDeleteMenu = async (id: string) => {
        if (confirm('Вы уверены что хотите удалить это меню?')) {
            await deleteMenu.mutate(id)
            if (selectedMenuId === id) {
                setSelectedMenuId(null)
            }
        }
    }

    const handleOpenAddItem = () => {
        resetItemForm()
        setIsAddItemOpen(true)
    }

    const handleOpenEditItem = (item: MenuItem) => {
        setItemForm({
            name: item.name,
            type: item.type,
            weight_per_person: item.weight_per_person,
            is_selectable: item.is_selectable,
            max_selections: item.max_selections || 3,
            order_index: item.order_index
        })
        setEditingItem(item)
        setIsAddItemOpen(true)
        setIsAddingNewType(false)
        setNewTypeName('')
    }

    const handleSaveItem = async () => {
        if (!selectedMenu) return

        try {
            if (editingItem) {
                const result = await updateMenuItem.mutate(editingItem.id, itemForm)
                if (!result && updateMenuItem.error) {
                    alert(`Ошибка при обновлении позиции: ${updateMenuItem.error}`)
                    return
                }
                await refetchMenuItems()
            } else {
                const result = await createMenuItem.mutate({
                    ...itemForm,
                    menu_id: selectedMenu.id
                })
                if (!result && createMenuItem.error) {
                    alert(`Ошибка при создании позиции: ${createMenuItem.error}`)
                    return
                }
                await refetchMenuItems()
            }
            setIsAddItemOpen(false)
            resetItemForm()
        } catch (error: any) {
            console.error('[handleSaveItem] Error:', error)
            alert(`Ошибка при сохранении позиции: ${error?.message || 'Неизвестная ошибка'}`)
        }
    }

    const handleDeleteItem = async (id: string) => {
        if (confirm('Вы уверены что хотите удалить эту позицию?')) {
            await deleteMenuItem.mutate(id)
        }
    }

    const handleCreateType = async () => {
        if (!selectedMenu) {
            alert('Выберите меню')
            return
        }

        if (!newTypeName.trim()) {
            alert('Введите название типа')
            return
        }

        setIsCreatingType(true)
        try {
            const typeName = newTypeName.trim().toLowerCase().replace(/\s+/g, '_')
            const typeLabel = newTypeName.trim()
            const typeLabelPlural = typeLabel

            const newType = await createMenuItemType({
                menu_id: selectedMenu.id,
                name: typeName,
                label: typeLabel,
                label_plural: typeLabelPlural,
                order_index: (customTypes?.length || 0) + 100
            })

            await new Promise(resolve => setTimeout(resolve, 100))
            await refetchCustomTypes()

            setItemForm({ ...itemForm, type: newType.name })
            setNewTypeName('')
            setIsAddingNewType(false)
        } catch (error: any) {
            console.error('Error creating type:', error)
            alert(`Ошибка при создании типа: ${error?.message || 'Неизвестная ошибка'}`)
        } finally {
            setIsCreatingType(false)
        }
    }

    const handleOpenEditTypeFromList = (type: string, items: MenuItem[]) => {
        setEditingTypeFromList({ type, items })
        setEditTypeForm({
            newType: type,
            isCreatingNew: false,
            newTypeName: ''
        })
        setIsEditTypeDialogOpen(true)
    }

    const handleSaveTypeChange = async () => {
        if (!editingTypeFromList || !selectedMenu) {
            return
        }

        const { type: oldType } = editingTypeFromList
        let newType = editTypeForm.newType

        if (editTypeForm.isCreatingNew) {
            if (!editTypeForm.newTypeName.trim()) {
                alert('Введите название нового типа')
                return
            }

            try {
                const typeName = editTypeForm.newTypeName.trim().toLowerCase().replace(/\s+/g, '_')
                const typeLabel = editTypeForm.newTypeName.trim()
                const typeLabelPlural = typeLabel

                const createdType = await createMenuItemType({
                    menu_id: selectedMenu.id,
                    name: typeName,
                    label: typeLabel,
                    label_plural: typeLabelPlural,
                    order_index: (customTypes?.length || 0) + 100
                })

                newType = createdType.name
                await refetchCustomTypes()
            } catch (error: any) {
                console.error('Error creating type:', error)
                alert(`Ошибка при создании типа: ${error?.message || 'Неизвестная ошибка'}`)
                return
            }
        }

        if (oldType === newType) {
            setIsEditTypeDialogOpen(false)
            setEditingTypeFromList(null)
            return
        }

        try {
            await updateMenuItemsByType(selectedMenu.id, oldType, newType)
            await refetchMenuItems()
            setIsEditTypeDialogOpen(false)
            setEditingTypeFromList(null)
            setEditTypeForm({
                newType: '',
                isCreatingNew: false,
                newTypeName: ''
            })
        } catch (error: any) {
            console.error('Error updating items type:', error)
            alert(`Ошибка при обновлении типа блюд: ${error?.message || 'Неизвестная ошибка'}`)
        }
    }

    if (menusLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-stone-900">Банкетные меню</h2>
                    <p className="mt-1 text-sm text-stone-500">Управление готовыми вариантами меню</p>
                </div>

                <Button
                    className="gap-2 shadow-sm"
                    onClick={handleOpenAddMenu}
                >
                    <Plus className="h-4 w-4" />
                    Новое банкетное меню
                </Button>
            </div>

            {/* Menu Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
                {menus.map((menu) => (
                    <motion.div
                        key={menu.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedMenuId(menu.id)}
                        className={cn(
                            "cursor-pointer rounded-xl border-2 p-4 transition-all touch-manipulation",
                            selectedMenu?.id === menu.id
                                ? "border-amber-500 bg-amber-50 shadow-md"
                                : "border-stone-200 bg-white hover:border-amber-200"
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
                                    selectedMenu?.id === menu.id ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600"
                                )}>
                                    <ChefHat className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-stone-900 truncate">{menu.name}</h3>
                                    <p className="text-xs text-stone-500 line-clamp-1">{menu.description}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="flex-shrink-0 ml-2 h-8 w-8"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenEditMenu(menu)
                                }}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="flex items-end justify-between gap-2">
                            <div>
                                <p className="text-lg font-bold text-stone-900">
                                    {formatCurrency(menu.price_per_person)}
                                </p>
                                <p className="text-xs text-stone-500">за человека</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-stone-900">{menu.total_weight_per_person} гр.</p>
                                <p className="text-xs text-stone-500">{allMenuItems.filter(i => i.menu_id === menu.id).length} позиций</p>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {menus.length === 0 && (
                    <div className="col-span-full text-center py-12 text-stone-500 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                        <ChefHat className="h-10 w-10 mx-auto mb-3 text-stone-300" />
                        <p>Нет банкетных меню. Создайте первое меню.</p>
                    </div>
                )}
            </motion.div>

            {/* Selected Menu Details */}
            {selectedMenu && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between py-4">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <ChefHat className="h-5 w-5 text-amber-600" />
                                    Позиции меню: {selectedMenu.name}
                                </CardTitle>
                                <CardDescription>
                                    {formatCurrency(selectedMenu.price_per_person)}/чел. • {totalWeight} гр./чел.
                                </CardDescription>
                            </div>
                            <Button onClick={handleOpenAddItem} size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Добавить позицию
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {itemsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {Object.entries(itemsByType).map(([type, items]) => {
                                        if (!items?.length) return null

                                        const typeLabel = getMenuItemTypeLabel(type, customTypes, true)

                                        return (
                                            <div key={type} className="rounded-xl border border-stone-200 overflow-hidden">
                                                <div className="bg-stone-50 px-4 py-2 flex items-center justify-between group/type">
                                                    <h3 className="font-semibold text-stone-900 text-sm">{typeLabel}</h3>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xs text-stone-500">
                                                            {items.reduce((sum, i) => sum + i.weight_per_person, 0)} гр.
                                                        </span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 opacity-0 group-hover/type:opacity-100 transition-opacity"
                                                            onClick={() => handleOpenEditTypeFromList(type, items)}
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="divide-y divide-stone-100">
                                                    {items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="px-4 py-2 flex items-center justify-between gap-4 hover:bg-stone-50 group"
                                                        >
                                                            <div className="flex items-center gap-3 flex-1">
                                                                <GripVertical className="h-4 w-4 text-stone-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                                                                <div>
                                                                    <p className="font-medium text-stone-900 text-sm">{item.name}</p>
                                                                    {item.is_selectable && (
                                                                        <Badge variant="outline" className="mt-0.5 text-[10px] px-1 py-0 h-4">
                                                                            Выбор {item.max_selections} из {items.length}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-4">
                                                                <span className="text-xs text-stone-500">{item.weight_per_person} гр.</span>

                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7"
                                                                        onClick={() => handleOpenEditItem(item)}
                                                                    >
                                                                        <Pencil className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => handleDeleteItem(item.id)}
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {menuItems.length === 0 && (
                                        <div className="text-center py-8 text-stone-500">
                                            <p className="text-sm">Нет позиций в этом меню</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Add/Edit Menu Dialog */}
            <Dialog open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingMenu ? 'Редактировать меню' : 'Новое меню'}</DialogTitle>
                        <DialogDescription>
                            {editingMenu ? 'Измените параметры меню' : 'Создайте новое банкетное меню'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Название *</Label>
                            <Input
                                placeholder="Например: Меню Премиум"
                                className="mt-1"
                                value={menuForm.name}
                                onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label>Цена за человека (₽) *</Label>
                            <Input
                                type="number"
                                placeholder="5000"
                                className="mt-1"
                                value={menuForm.price_per_person || ''}
                                onChange={(e) => setMenuForm({ ...menuForm, price_per_person: Number(e.target.value) })}
                            />
                        </div>

                        <div>
                            <Label>Грамовка на человека (гр.)</Label>
                            <Input
                                type="number"
                                placeholder="1500"
                                className="mt-1"
                                value={menuForm.total_weight_per_person || ''}
                                onChange={(e) => setMenuForm({ ...menuForm, total_weight_per_person: Number(e.target.value) })}
                            />
                        </div>

                        <div>
                            <Label>Описание</Label>
                            <Textarea
                                placeholder="Описание меню..."
                                className="mt-1"
                                value={menuForm.description}
                                onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        {editingMenu && (
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    handleDeleteMenu(editingMenu.id)
                                    setIsAddMenuOpen(false)
                                }}
                            >
                                Удалить
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsAddMenuOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSaveMenu}
                            disabled={createMenu.loading || updateMenu.loading || !menuForm.name || !menuForm.price_per_person}
                        >
                            {(createMenu.loading || updateMenu.loading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingMenu ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add/Edit Item Dialog */}
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'Редактировать позицию' : 'Новая позиция'}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem ? 'Измените параметры позиции' : 'Добавьте новую позицию в меню'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Название *</Label>
                            <Input
                                placeholder="Название блюда"
                                value={itemForm.name}
                                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                                className="mt-1"
                            />
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <Label>Тип блюда</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setIsAddingNewType(true)
                                        setNewTypeName('')
                                    }}
                                    className="h-7 text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Новый тип
                                </Button>
                            </div>

                            {/* Форма добавления нового типа */}
                            {isAddingNewType && (
                                <div className="mb-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                                    <Label className="text-xs text-stone-700 mb-2 block">Название нового типа</Label>
                                    <div className="flex gap-2 items-center">
                                        <Input
                                            placeholder="например: Супы"
                                            value={newTypeName}
                                            onChange={(e) => setNewTypeName(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault()
                                                    handleCreateType()
                                                } else if (e.key === 'Escape') {
                                                    setIsAddingNewType(false)
                                                    setNewTypeName('')
                                                }
                                            }}
                                            className="h-8 text-sm"
                                            autoFocus
                                        />
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={handleCreateType}
                                            disabled={!newTypeName.trim() || isCreatingType}
                                            className="h-8"
                                        >
                                            {isCreatingType ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Создать'}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsAddingNewType(false)
                                                setNewTypeName('')
                                            }}
                                            disabled={isCreatingType}
                                            className="h-8"
                                        >
                                            Отмена
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <Select
                                value={itemForm.type}
                                onValueChange={(v: string) => {
                                    setItemForm({ ...itemForm, type: v })
                                    setIsAddingNewType(false)
                                }}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {/* Стандартные типы */}
                                    {(Object.entries(STANDARD_MENU_ITEM_TYPE_CONFIG) as [StandardMenuItemType, typeof STANDARD_MENU_ITEM_TYPE_CONFIG[StandardMenuItemType]][]).map(([type, config]) => (
                                        <SelectItem key={type} value={type}>
                                            {config.label}
                                        </SelectItem>
                                    ))}
                                    {/* Кастомные типы */}
                                    {customTypes && customTypes.length > 0 ? (
                                        <>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-stone-500">Кастомные типы</div>
                                            {customTypes.map((customType) => (
                                                <SelectItem key={customType.id} value={customType.name}>
                                                    {customType.label}
                                                </SelectItem>
                                            ))}
                                        </>
                                    ) : (
                                        customTypesLoading ? null : (
                                            <div className="px-2 py-1.5 text-xs text-stone-400">
                                                Нет кастомных типов для этого меню
                                            </div>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label>Грамовка на человека (гр.) *</Label>
                            <Input
                                type="number"
                                placeholder="150"
                                value={itemForm.weight_per_person || ''}
                                onChange={(e) => setItemForm({ ...itemForm, weight_per_person: Number(e.target.value) })}
                                className="mt-1"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox
                                id="selectable"
                                checked={itemForm.is_selectable}
                                onCheckedChange={(checked) => setItemForm({ ...itemForm, is_selectable: !!checked })}
                            />
                            <Label htmlFor="selectable" className="cursor-pointer">
                                Можно выбирать (например, 3 из 5 салатов)
                            </Label>
                        </div>

                        {itemForm.is_selectable && (
                            <div>
                                <Label>Максимум выборов</Label>
                                <Input
                                    type="number"
                                    placeholder="3"
                                    value={itemForm.max_selections}
                                    onChange={(e) => setItemForm({ ...itemForm, max_selections: Number(e.target.value) })}
                                    className="mt-1"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSaveItem}
                            disabled={createMenuItem.loading || updateMenuItem.loading || !itemForm.name || !itemForm.weight_per_person}
                        >
                            {(createMenuItem.loading || updateMenuItem.loading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editingItem ? 'Сохранить' : 'Добавить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Type Dialog */}
            <Dialog open={isEditTypeDialogOpen} onOpenChange={setIsEditTypeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Изменить тип блюд</DialogTitle>
                        <DialogDescription>
                            Выберите новый тип для всех блюд из категории &quot;{editingTypeFromList && getMenuItemTypeLabel(editingTypeFromList.type, customTypes, true)}&quot; ({editingTypeFromList?.items.length || 0}{' '}{editingTypeFromList?.items.length === 1 ? 'блюдо' : 'блюд'})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="createNewType"
                                checked={editTypeForm.isCreatingNew}
                                onCheckedChange={(checked) => {
                                    setEditTypeForm({
                                        ...editTypeForm,
                                        isCreatingNew: !!checked,
                                        newType: editTypeForm.isCreatingNew ? editTypeForm.newType : ''
                                    })
                                }}
                            />
                            <Label htmlFor="createNewType" className="cursor-pointer">
                                Создать новый тип
                            </Label>
                        </div>

                        {editTypeForm.isCreatingNew ? (
                            <div>
                                <Label>Название нового типа *</Label>
                                <Input
                                    placeholder="например: Супы"
                                    value={editTypeForm.newTypeName}
                                    onChange={(e) => setEditTypeForm({ ...editTypeForm, newTypeName: e.target.value })}
                                    className="mt-1"
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <div>
                                <Label>Выберите тип *</Label>
                                <Select
                                    value={editTypeForm.newType}
                                    onValueChange={(v) => setEditTypeForm({ ...editTypeForm, newType: v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Выберите тип" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {/* Стандартные типы */}
                                        {(Object.entries(STANDARD_MENU_ITEM_TYPE_CONFIG) as [StandardMenuItemType, typeof STANDARD_MENU_ITEM_TYPE_CONFIG[StandardMenuItemType]][]).map(([type, config]) => (
                                            <SelectItem key={type} value={type}>
                                                {config.label}
                                            </SelectItem>
                                        ))}
                                        {/* Кастомные типы */}
                                        {customTypes && customTypes.length > 0 && (
                                            <>
                                                <div className="px-2 py-1.5 text-xs font-semibold text-stone-500">Кастомные типы</div>
                                                {customTypes.map((customType) => (
                                                    <SelectItem key={customType.id} value={customType.name}>
                                                        {customType.label}
                                                    </SelectItem>
                                                ))}
                                            </>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditTypeDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            onClick={handleSaveTypeChange}
                            disabled={
                                editTypeForm.isCreatingNew
                                    ? !editTypeForm.newTypeName.trim()
                                    : !editTypeForm.newType
                            }
                        >
                            Сохранить
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
