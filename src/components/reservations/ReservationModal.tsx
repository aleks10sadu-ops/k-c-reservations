"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Phone, 
  Mail,
  Pencil,
  Save,
  Trash2,
  Plus,
  CreditCard,
  MessageSquare,
  ChefHat,
  User,
  Baby
} from 'lucide-react'
import { Reservation, ReservationStatus, RESERVATION_STATUS_CONFIG, MENU_ITEM_TYPE_CONFIG, MenuItemType } from '@/types'
import { cn, formatCurrency, formatDate, calculatePlates, calculateTotalWeight } from '@/lib/utils'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { mockMenus, mockHalls, mockMenuItems } from '@/store/mockData'

interface ReservationModalProps {
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onSave?: (reservation: Reservation) => void
  onDelete?: (id: string) => void
  mode?: 'view' | 'edit' | 'create'
}

export function ReservationModal({ 
  reservation, 
  isOpen, 
  onClose,
  onSave,
  onDelete,
  mode: initialMode = 'view'
}: ReservationModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [editedReservation, setEditedReservation] = useState<Partial<Reservation>>(reservation || {})
  const [selectedSalads, setSelectedSalads] = useState<string[]>([])
  const [showMenuEdit, setShowMenuEdit] = useState(false)

  const statusOptions: ReservationStatus[] = ['new', 'in_progress', 'prepaid', 'paid']
  
  const currentMenu = useMemo(() => {
    return mockMenus.find(m => m.id === (editedReservation.menu_id || reservation?.menu_id))
  }, [editedReservation.menu_id, reservation?.menu_id])

  const menuItemsByType = useMemo(() => {
    if (!currentMenu) return {}
    const items = mockMenuItems.filter(i => i.menu_id === currentMenu.id)
    return items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = []
      acc[item.type].push(item)
      return acc
    }, {} as Record<MenuItemType, typeof items>)
  }, [currentMenu])

  const guestsCount = editedReservation.guests_count || reservation?.guests_count || 1

  const remainingAmount = (editedReservation.total_amount || reservation?.total_amount || 0) - 
                          (editedReservation.prepaid_amount || reservation?.prepaid_amount || 0)

  if (!reservation && mode !== 'create') return null

  const statusVariant = {
    new: 'new' as const,
    in_progress: 'inProgress' as const,
    prepaid: 'prepaid' as const,
    paid: 'paid' as const,
  }[editedReservation.status || reservation?.status || 'new']

  const handleStatusChange = (status: ReservationStatus) => {
    setEditedReservation(prev => ({ ...prev, status }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-stone-900">
                {mode === 'create' ? 'Новое бронирование' : 'Бронирование'}
              </DialogTitle>
              {reservation && (
                <p className="text-sm text-stone-500 mt-1">
                  {formatDate(reservation.date)} в {reservation.time}
                </p>
              )}
            </div>
            
            {mode === 'view' && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Редактировать
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 pt-4 space-y-6">
            {/* Status Selection */}
            <div className="space-y-3">
              <Label>Статус бронирования</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => {
                  const config = RESERVATION_STATUS_CONFIG[status]
                  const isSelected = (editedReservation.status || reservation?.status) === status
                  return (
                    <motion.button
                      key={status}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => mode !== 'view' && handleStatusChange(status)}
                      disabled={mode === 'view'}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                        isSelected 
                          ? "shadow-md" 
                          : "opacity-60 hover:opacity-100",
                        mode === 'view' && "cursor-default"
                      )}
                      style={{
                        backgroundColor: isSelected ? config.bgColor : 'transparent',
                        borderColor: config.borderColor,
                        color: config.color,
                      }}
                    >
                      {config.label}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Guest Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Информация о госте
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <Label>ФИО</Label>
                    {mode === 'view' ? (
                      <p className="mt-1 font-medium">
                        {reservation?.guest?.last_name} {reservation?.guest?.first_name} {reservation?.guest?.middle_name}
                      </p>
                    ) : (
                      <Input 
                        defaultValue={`${reservation?.guest?.last_name || ''} ${reservation?.guest?.first_name || ''}`}
                        className="mt-1"
                      />
                    )}
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      Телефон
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-1">{reservation?.guest?.phone}</p>
                    ) : (
                      <Input 
                        defaultValue={reservation?.guest?.phone}
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Дата и время
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Дата</Label>
                    {mode === 'view' ? (
                      <p className="mt-1 font-medium">{formatDate(reservation?.date || '')}</p>
                    ) : (
                      <Input 
                        type="date"
                        defaultValue={reservation?.date}
                        className="mt-1"
                      />
                    )}
                  </div>
                  
                  <div>
                    <Label>Время</Label>
                    {mode === 'view' ? (
                      <p className="mt-1 font-medium">{reservation?.time}</p>
                    ) : (
                      <Input 
                        type="time"
                        defaultValue={reservation?.time}
                        className="mt-1"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Зал / Стол
                  </Label>
                  {mode === 'view' ? (
                    <p className="mt-1">{reservation?.hall?.name}</p>
                  ) : (
                    <Select defaultValue={reservation?.hall_id}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите зал" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockHalls.map(hall => (
                          <SelectItem key={hall.id} value={hall.id}>
                            {hall.name} (до {hall.capacity} чел.)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Guests Count */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Гостей
                </Label>
                {mode === 'view' ? (
                  <p className="mt-1 text-2xl font-bold text-stone-900">{reservation?.guests_count}</p>
                ) : (
                  <Input 
                    type="number"
                    min={1}
                    defaultValue={reservation?.guests_count}
                    onChange={(e) => setEditedReservation(prev => ({ 
                      ...prev, 
                      guests_count: parseInt(e.target.value) || 1 
                    }))}
                    className="mt-1"
                  />
                )}
              </div>
              
              <div>
                <Label className="flex items-center gap-2">
                  <Baby className="h-3.5 w-3.5" />
                  Детей
                </Label>
                {mode === 'view' ? (
                  <p className="mt-1 text-2xl font-bold text-stone-900">{reservation?.children_count || 0}</p>
                ) : (
                  <Input 
                    type="number"
                    min={0}
                    defaultValue={reservation?.children_count || 0}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label>Предоплата</Label>
                {mode === 'view' ? (
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {formatCurrency(reservation?.prepaid_amount || 0)}
                  </p>
                ) : (
                  <Input 
                    type="number"
                    min={0}
                    defaultValue={reservation?.prepaid_amount || 0}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label>Осталось внести</Label>
                <p className="mt-1 text-2xl font-bold text-amber-600">
                  {formatCurrency(remainingAmount)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Menu Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <ChefHat className="h-4 w-4" />
                  Меню
                </h3>
                {mode !== 'view' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMenuEdit(!showMenuEdit)}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    {showMenuEdit ? 'Скрыть' : 'Изменить позиции'}
                  </Button>
                )}
              </div>

              {/* Menu Selection */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-amber-900">
                      {currentMenu?.name || 'Меню не выбрано'}
                    </p>
                    <p className="text-sm text-amber-700">
                      {formatCurrency(currentMenu?.price_per_person || 0)}/чел. 
                      ({currentMenu?.total_weight_per_person || 0} гр./чел.)
                    </p>
                  </div>
                  {mode !== 'view' && (
                    <Select 
                      defaultValue={reservation?.menu_id}
                      onValueChange={(v) => setEditedReservation(prev => ({ ...prev, menu_id: v }))}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Выберите меню" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockMenus.map(menu => (
                          <SelectItem key={menu.id} value={menu.id}>
                            {menu.name} - {formatCurrency(menu.price_per_person)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Menu Items by Type */}
              <AnimatePresence>
                {(mode === 'view' || showMenuEdit) && currentMenu && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {(Object.keys(menuItemsByType) as MenuItemType[]).map((type) => {
                      const items = menuItemsByType[type]
                      if (!items?.length) return null
                      
                      const typeConfig = MENU_ITEM_TYPE_CONFIG[type]
                      const isSelectable = items[0]?.is_selectable
                      const maxSelections = items[0]?.max_selections || items.length
                      const platesCount = calculatePlates(guestsCount)

                      return (
                        <div key={type} className="rounded-xl border border-stone-200 overflow-hidden">
                          <div className="bg-stone-50 px-4 py-2 flex items-center justify-between">
                            <span className="font-medium text-stone-900">
                              {typeConfig.labelPlural}
                            </span>
                            <span className="text-sm text-stone-500">
                              {platesCount} тарелок
                            </span>
                          </div>
                          <div className="divide-y divide-stone-100">
                            {items.map((item, idx) => {
                              const isSelected = !isSelectable || selectedSalads.includes(item.id) || idx < maxSelections
                              const totalWeight = calculateTotalWeight(item.weight_per_person, guestsCount)
                              
                              return (
                                <div 
                                  key={item.id}
                                  className={cn(
                                    "px-4 py-3 flex items-center justify-between gap-4",
                                    !isSelected && "opacity-50"
                                  )}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    {isSelectable && showMenuEdit && (
                                      <Checkbox 
                                        checked={isSelected}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            if (selectedSalads.length < maxSelections) {
                                              setSelectedSalads([...selectedSalads, item.id])
                                            }
                                          } else {
                                            setSelectedSalads(selectedSalads.filter(id => id !== item.id))
                                          }
                                        }}
                                      />
                                    )}
                                    <span className={cn(
                                      "truncate",
                                      isSelected ? "text-stone-900" : "text-stone-400"
                                    )}>
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-stone-500 shrink-0">
                                    <span>{item.weight_per_person} гр./чел.</span>
                                    <span className="font-medium text-stone-700">
                                      {totalWeight} гр.
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {isSelectable && (
                            <div className="bg-blue-50 px-4 py-2 text-sm text-blue-700">
                              Выберите {maxSelections} из {items.length}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Total Amount */}
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Итоговая стоимость банкета</p>
                  <p className="text-3xl font-bold text-amber-900">
                    {formatCurrency(reservation?.total_amount || (currentMenu?.price_per_person || 0) * guestsCount)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-amber-700">
                    {currentMenu?.name} ({formatCurrency(currentMenu?.price_per_person || 0)}/чел.)
                  </p>
                  <p className="text-sm text-amber-600">
                    {guestsCount} × {formatCurrency(currentMenu?.price_per_person || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payments */}
            {reservation?.payments && reservation.payments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Внесённые предоплаты
                </h3>
                <div className="space-y-2">
                  {reservation.payments.map((payment) => (
                    <div 
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                    >
                      <div>
                        <p className="font-medium text-green-900">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-green-700">
                          {formatDate(payment.payment_date)} • {
                            payment.payment_method === 'cash' ? 'Наличные' :
                            payment.payment_method === 'card' ? 'Картой' : 'Перевод'
                          }
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-green-600">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
                
                {mode !== 'view' && (
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Добавить оплату
                  </Button>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-3">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Комментарии к заказу
              </h3>
              {mode === 'view' ? (
                <p className="text-stone-600 p-3 rounded-lg bg-stone-50">
                  {reservation?.comments || 'Нет комментариев'}
                </p>
              ) : (
                <Textarea 
                  placeholder="Добавьте комментарии к заказу..."
                  defaultValue={reservation?.comments}
                  className="min-h-[100px]"
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {mode !== 'view' && (
          <div className="flex items-center justify-between gap-4 p-6 pt-4 border-t border-stone-200 bg-stone-50">
            <Button
              variant="destructive"
              onClick={() => reservation && onDelete?.(reservation.id)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Удалить
            </Button>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setMode('view')}>
                Отмена
              </Button>
              <Button onClick={() => {
                // Save logic
                onClose()
              }} className="gap-2">
                <Save className="h-4 w-4" />
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

