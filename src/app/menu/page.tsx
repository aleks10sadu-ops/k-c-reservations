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
import { PageTransition } from '@/components/layout/PageTransition'
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
import { createMenuItemType, getMenuItemTypes, updateMenuItemType, deleteMenuItemType } from '@/lib/supabase/api'
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

export default function MenuPage() {
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null)
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null)
  
  // Состояние для управления типами в форме блюда
  const [isAddingNewType, setIsAddingNewType] = useState(false)
  const [newTypeName, setNewTypeName] = useState('')
  const [isCreatingType, setIsCreatingType] = useState(false)
  const [editingType, setEditingType] = useState<CustomMenuItemType | null>(null)

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
      console.log('[MenuPage] Loading custom types for menu:', menuIdForTypes)
      const types = await getMenuItemTypes(menuIdForTypes)
      console.log('[MenuPage] Loaded custom types:', types.length, types)
      setCustomTypes(types)
    } catch (error) {
      console.error('[MenuPage] Error loading custom types:', error)
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
  
  // Все доступные типы (стандартные + кастомные)
  const allAvailableTypes = useMemo(() => {
    const standardTypes = Object.keys(STANDARD_MENU_ITEM_TYPE_CONFIG) as StandardMenuItemType[]
    const customTypeNames = (customTypes || []).map(ct => ct.name)
    return [...standardTypes, ...customTypeNames]
  }, [customTypes])

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
    setEditingType(null)
    setEditingTypeName('')
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
    setEditingType(null)
    setEditingTypeName('')
  }

  const handleSaveItem = async () => {
    if (!selectedMenu) return
    
    console.log('[handleSaveItem] Saving item:', {
      editingItem: editingItem?.id,
      itemForm,
      selectedMenuId: selectedMenu.id
    })
    
    try {
      if (editingItem) {
        const result = await updateMenuItem.mutate(editingItem.id, itemForm)
        console.log('[handleSaveItem] Update result:', result)
        if (!result && updateMenuItem.error) {
          alert(`Ошибка при обновлении позиции: ${updateMenuItem.error}`)
          return
        }
        // Обновляем список блюд после успешного обновления
        await refetchMenuItems()
      } else {
        const result = await createMenuItem.mutate({
          ...itemForm,
          menu_id: selectedMenu.id
        })
        console.log('[handleSaveItem] Create result:', result)
        if (!result && createMenuItem.error) {
          alert(`Ошибка при создании позиции: ${createMenuItem.error}`)
          return
        }
        // Обновляем список блюд после успешного создания
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

  // Function for creating new type from item form
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
      // Создаем тип с автоматическим именем из названия
      const typeName = newTypeName.trim().toLowerCase().replace(/\s+/g, '_')
      const typeLabel = newTypeName.trim()
      
      // Простое формирование множественного числа (можно улучшить)
      const typeLabelPlural = typeLabel.endsWith('ы') || typeLabel.endsWith('и') || typeLabel.endsWith('а') 
        ? typeLabel 
        : typeLabel + 'ы'
      
      // Используем Server Action
      const newType = await createMenuItemType({
        menu_id: selectedMenu.id,
        name: typeName,
        label: typeLabel,
        label_plural: typeLabelPlural,
        order_index: (customTypes?.length || 0) + 100
      })
      
      // Обновляем список кастомных типов
      await new Promise(resolve => setTimeout(resolve, 100))
      await refetchCustomTypes()
      
      // Автоматически выбираем созданный тип в форме позиции
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

  // Function for updating type
  const handleUpdateType = async () => {
    if (!editingType || !editingTypeName.trim()) {
      alert('Введите название типа')
      return
    }

    try {
      const typeLabel = editingTypeName.trim()
      const typeLabelPlural = typeLabel.endsWith('ы') || typeLabel.endsWith('и') || typeLabel.endsWith('а') 
        ? typeLabel 
        : typeLabel + 'ы'
      
      await updateMenuItemType(editingType.id, {
        label: typeLabel,
        label_plural: typeLabelPlural
      })
      
      await refetchCustomTypes()
      setEditingType(null)
      setEditingTypeName('')
    } catch (error: any) {
      console.error('Error updating type:', error)
      alert(`Ошибка при обновлении типа: ${error?.message || 'Неизвестная ошибка'}`)
    }
  }

  // Function for deleting type
  const handleDeleteType = async (type: CustomMenuItemType) => {
    if (!confirm(`Вы уверены, что хотите удалить тип "${type.label}"? Все блюда с этим типом останутся без типа.`)) {
      return
    }

    try {
      await deleteMenuItemType(type.id)
      await refetchCustomTypes()
      
      // Если удаляемый тип был выбран в форме, сбрасываем на стандартный тип
      if (itemForm.type === type.name) {
        setItemForm({ ...itemForm, type: 'appetizer' })
      }
    } catch (error: any) {
      console.error('Error deleting type:', error)
      alert(`Ошибка при удалении типа: ${error?.message || 'Неизвестная ошибка'}`)
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
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Меню</h1>
              <p className="mt-1 text-stone-500">Управление банкетными меню и позициями</p>
            </div>
            
            <Button 
              size="lg" 
              className="gap-2 shadow-lg shadow-amber-500/25"
              onClick={handleOpenAddMenu}
            >
              <Plus className="h-5 w-5" />
              Новое меню
            </Button>
          </motion.div>
        </div>

        {/* Menu Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          {menus.map((menu) => (
            <motion.div
              key={menu.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMenuId(menu.id)}
              className={cn(
                "cursor-pointer rounded-2xl border-2 p-6 transition-all",
                selectedMenu?.id === menu.id 
                  ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10" 
                  : "border-stone-200 bg-white hover:border-amber-200"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    selectedMenu?.id === menu.id ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600"
                  )}>
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">{menu.name}</h3>
                    <p className="text-sm text-stone-500">{menu.description}</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOpenEditMenu(menu)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {formatCurrency(menu.price_per_person)}
                  </p>
                  <p className="text-sm text-stone-500">за человека</p>
                </div>
                <Badge variant={menu.is_active ? 'default' : 'secondary'}>
                  {menu.is_active ? 'Активно' : 'Неактивно'}
                </Badge>
              </div>
              
              <div className="mt-4 pt-4 border-t border-stone-200 flex items-center justify-between text-sm text-stone-500">
                <span>{menu.total_weight_per_person} гр./чел.</span>
                <span>{allMenuItems.filter(i => i.menu_id === menu.id).length} позиций</span>
              </div>
            </motion.div>
          ))}

          {menus.length === 0 && (
            <div className="col-span-3 text-center py-12 text-stone-500">
              <ChefHat className="h-12 w-12 mx-auto mb-3 text-stone-300" />
              <p>Нет меню. Создайте первое меню.</p>
            </div>
          )}
        </motion.div>

        {/* Selected Menu Details */}
        {selectedMenu && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ChefHat className="h-5 w-5 text-amber-600" />
                    {selectedMenu.name}
                  </CardTitle>
                  <CardDescription>
                    {formatCurrency(selectedMenu.price_per_person)}/чел. • {totalWeight} гр./чел.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleOpenAddItem} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить позицию
                  </Button>
                </div>
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
                        <motion.div 
                          key={type}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="rounded-xl border border-stone-200 overflow-hidden"
                        >
                          <div className="bg-stone-50 px-4 py-3 flex items-center justify-between">
                            <h3 className="font-semibold text-stone-900">{typeLabel}</h3>
                            <span className="text-sm text-stone-500">
                              {items.reduce((sum, i) => sum + i.weight_per_person, 0)} гр.
                            </span>
                          </div>
                          
                          <div className="divide-y divide-stone-100">
                            {items.map((item, index) => (
                              <motion.div 
                                key={item.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: index * 0.05 }}
                                className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-stone-50 group"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <GripVertical className="h-4 w-4 text-stone-300 opacity-0 group-hover:opacity-100 cursor-grab" />
                                  <div>
                                    <p className="font-medium text-stone-900">{item.name}</p>
                                    {item.is_selectable && (
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        Выбор {item.max_selections} из доступных
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-stone-500">{item.weight_per_person} гр.</span>
                                  
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleOpenEditItem(item)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                      onClick={() => handleDeleteItem(item.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )
                    })}

                    {menuItems.length === 0 && (
                      <div className="text-center py-12 text-stone-500">
                        <ChefHat className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                        <p>Нет позиций в меню. Добавьте первую позицию.</p>
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
                {editingMenu ? 'Измените параметры меню' : 'Создайте новое банкетное меню для ресторана'}
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
                {editingItem ? 'Измените параметры позиции меню' : 'Добавьте новую позицию в меню'}
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
                      setEditingType(null)
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

                {/* Форма редактирования типа */}
                {editingType && (
                  <div className="mb-3 p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <Label className="text-xs text-stone-700 mb-2 block">Редактировать тип: {editingType.label}</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={editingTypeName}
                        onChange={(e) => setEditingTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleUpdateType()
                          } else if (e.key === 'Escape') {
                            setEditingType(null)
                            setEditingTypeName('')
                          }
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUpdateType}
                        disabled={!editingTypeName.trim()}
                        className="h-8"
                      >
                        Сохранить
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingType(null)
                          setEditingTypeName('')
                        }}
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
                    setEditingType(null)
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

                {/* Управление кастомными типами */}
                {customTypes && customTypes.length > 0 && (
                  <div className="mt-2 p-2 rounded-lg border border-stone-200 bg-stone-50">
                    <Label className="text-xs text-stone-600 mb-2 block">Управление типами:</Label>
                    <div className="space-y-1">
                      {customTypes.map((customType) => (
                        <div key={customType.id} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-stone-100">
                          <span className="text-sm text-stone-700 flex-1">{customType.label}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingType(customType)
                                setEditingTypeName(customType.label)
                                setIsAddingNewType(false)
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-red-500 hover:text-red-600"
                              onClick={() => handleDeleteType(customType)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

      </div>
    </PageTransition>
  )
}
