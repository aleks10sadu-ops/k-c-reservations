"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  ChefHat, 
  Pencil, 
  Trash2, 
  GripVertical,
  Check,
  X
} from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { mockMenus, mockMenuItems } from '@/store/mockData'
import { formatCurrency, cn } from '@/lib/utils'
import { Menu, MenuItem, MENU_ITEM_TYPE_CONFIG, MenuItemType } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export default function MenuPage() {
  const [selectedMenu, setSelectedMenu] = useState(mockMenus[0])
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false)
  const [isAddItemOpen, setIsAddItemOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const menuItems = mockMenuItems.filter(item => item.menu_id === selectedMenu.id)
  
  const itemsByType = menuItems.reduce((acc, item) => {
    if (!acc[item.type]) acc[item.type] = []
    acc[item.type].push(item)
    return acc
  }, {} as Record<MenuItemType, MenuItem[]>)

  const totalWeight = menuItems.reduce((sum, item) => sum + item.weight_per_person, 0)

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
              onClick={() => setIsAddMenuOpen(true)}
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
          {mockMenus.map((menu) => (
            <motion.div
              key={menu.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMenu(menu)}
              className={cn(
                "cursor-pointer rounded-2xl border-2 p-6 transition-all",
                selectedMenu.id === menu.id 
                  ? "border-amber-500 bg-amber-50 shadow-lg shadow-amber-500/10" 
                  : "border-stone-200 bg-white hover:border-amber-200"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl",
                    selectedMenu.id === menu.id ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600"
                  )}>
                    <ChefHat className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-stone-900">{menu.name}</h3>
                    <p className="text-sm text-stone-500">{menu.description}</p>
                  </div>
                </div>
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
                <span>{mockMenuItems.filter(i => i.menu_id === menu.id).length} позиций</span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Selected Menu Details */}
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
              <Button onClick={() => setIsAddItemOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Добавить позицию
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {(Object.entries(MENU_ITEM_TYPE_CONFIG) as [MenuItemType, typeof MENU_ITEM_TYPE_CONFIG[MenuItemType]][]).map(([type, config]) => {
                  const items = itemsByType[type]
                  if (!items?.length) return null

                  return (
                    <motion.div 
                      key={type}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-xl border border-stone-200 overflow-hidden"
                    >
                      <div className="bg-stone-50 px-4 py-3 flex items-center justify-between">
                        <h3 className="font-semibold text-stone-900">{config.labelPlural}</h3>
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
                                  onClick={() => setEditingItem(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
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
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Add Menu Dialog */}
        <Dialog open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новое меню</DialogTitle>
              <DialogDescription>
                Создайте новое банкетное меню для ресторана
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Название</Label>
                <Input placeholder="Например: Меню Премиум" className="mt-1" />
              </div>
              
              <div>
                <Label>Цена за человека (₽)</Label>
                <Input type="number" placeholder="5000" className="mt-1" />
              </div>
              
              <div>
                <Label>Описание</Label>
                <Textarea placeholder="Описание меню..." className="mt-1" />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddMenuOpen(false)}>
                Отмена
              </Button>
              <Button onClick={() => setIsAddMenuOpen(false)}>
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add/Edit Item Dialog */}
        <Dialog open={isAddItemOpen || !!editingItem} onOpenChange={(open) => {
          if (!open) {
            setIsAddItemOpen(false)
            setEditingItem(null)
          }
        }}>
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
                <Label>Название</Label>
                <Input 
                  placeholder="Название блюда" 
                  defaultValue={editingItem?.name}
                  className="mt-1" 
                />
              </div>
              
              <div>
                <Label>Тип блюда</Label>
                <Select defaultValue={editingItem?.type || 'appetizer'}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(MENU_ITEM_TYPE_CONFIG) as [MenuItemType, typeof MENU_ITEM_TYPE_CONFIG[MenuItemType]][]).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Грамовка на человека (гр.)</Label>
                <Input 
                  type="number" 
                  placeholder="150" 
                  defaultValue={editingItem?.weight_per_person}
                  className="mt-1" 
                />
              </div>
              
              <div className="flex items-center gap-3">
                <Checkbox 
                  id="selectable" 
                  defaultChecked={editingItem?.is_selectable}
                />
                <Label htmlFor="selectable" className="cursor-pointer">
                  Можно выбирать (например, 3 из 5 салатов)
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddItemOpen(false)
                setEditingItem(null)
              }}>
                Отмена
              </Button>
              <Button onClick={() => {
                setIsAddItemOpen(false)
                setEditingItem(null)
              }}>
                {editingItem ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}

