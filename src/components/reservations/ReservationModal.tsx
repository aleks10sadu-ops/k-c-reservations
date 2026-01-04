"use client"

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  Phone,
  Pencil,
  Save,
  Trash2,
  Plus,
  CreditCard,
  MessageSquare,
  ChefHat,
  User,
  Baby,
  Loader2
} from 'lucide-react'
import { Reservation, ReservationStatus, RESERVATION_STATUS_CONFIG, getMenuItemTypeLabel, MenuItemType, Guest, ReservationMenuItem } from '@/types'
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
import { useHalls, useMenus, useMenuItems, useMenuItemTypes, useGuests, useTables, useCreateMutation, useUpdateMutation, useDeleteMutation, useReservations } from '@/hooks/useSupabase'
import { format } from 'date-fns'

interface ReservationModalProps {
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onSaveSuccess?: (saved?: Reservation) => void
  mode?: 'view' | 'edit' | 'create'
  initialDate?: Date | null
}

export function ReservationModal({ 
  reservation, 
  isOpen, 
  onClose,
  onSaveSuccess,
  mode: initialMode = 'view',
  initialDate
}: ReservationModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [showMenuEdit, setShowMenuEdit] = useState(false)
  const [selectedSalads, setSelectedSalads] = useState<string[]>([])
  // Внутреннее состояние для хранения обновленного бронирования
  const [localReservation, setLocalReservation] = useState<Reservation | null>(reservation)
  
  // Используем локальное состояние, если оно есть, иначе проп
  const currentReservation = localReservation || reservation

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    time: '18:00',
    hall_id: '',
    table_id: '',
    guest_id: '',
    guests_count: 10,
    children_count: 0,
    menu_id: '',
    color: '#f59e0b',
    status: 'new' as ReservationStatus,
    total_amount: 0,
    comments: ''
  })

  // New guest form
  const [showNewGuest, setShowNewGuest] = useState(false)
  const [newGuestData, setNewGuestData] = useState({
    first_name: '',
    last_name: '',
    phone: ''
  })
  const [showSchemePicker, setShowSchemePicker] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [draftTables, setDraftTables] = useState<string[]>([])
  const [selectionBox, setSelectionBox] = useState<{
    x1: number
    y1: number
    x2: number
    y2: number
    active: boolean
    moved: boolean
  } | null>(null)
  const schemeRef = useRef<HTMLDivElement | null>(null)

  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  const COLOR_PRESETS = ['#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ec4899', '#ef4444', '#6b7280']

  // Fetch data
  const { data: halls } = useHalls()
  const { data: menus } = useMenus()
  const { data: menuItems } = useMenuItems()
  const currentMenu = useMemo(() => {
    return menus.find(m => m.id === formData.menu_id)
  }, [formData.menu_id, menus])
  const { data: customTypes } = useMenuItemTypes(formData.menu_id || undefined)
  const { data: guests } = useGuests()
  const { data: tables } = useTables(formData.hall_id)
  const { data: dayReservations } = useReservations(
    formData.date
      ? { date: formData.date, hall_id: formData.hall_id || undefined }
      : undefined
  )

  // Mutations
  const createReservation = useCreateMutation<Reservation>('reservations')
  const updateReservation = useUpdateMutation<Reservation>('reservations')
  const deleteReservation = useDeleteMutation('reservations')
  const createGuest = useCreateMutation<Guest>('guests')

  // Обновляем локальное состояние при изменении пропа reservation
  useEffect(() => {
    setLocalReservation(reservation)
  }, [reservation])

  // Reset form when modal opens or reservation changes
  useEffect(() => {
    if (!isOpen) return
    queueMicrotask(() => {
      setMode(initialMode)

      if (currentReservation && initialMode !== 'create') {
        setFormData({
          date: currentReservation.date,
          time: currentReservation.time,
          hall_id: currentReservation.hall_id,
          table_id: currentReservation.table_id || '',
          guest_id: currentReservation.guest_id,
          guests_count: currentReservation.guests_count,
          children_count: currentReservation.children_count,
          menu_id: currentReservation.menu_id || '',
          color: currentReservation.color || '#f59e0b',
          status: currentReservation.status,
          total_amount: currentReservation.total_amount,
          comments: currentReservation.comments || ''
        })
        const initialTables =
          currentReservation.tables?.length
            ? currentReservation.tables.map((t) => t.id)
            : currentReservation.table_id
              ? [currentReservation.table_id]
              : []
        setSelectedTables(initialTables)
        setDraftTables(initialTables)
        
        // Инициализируем выбранные салаты из сохраненных данных
        if (currentReservation.selected_menu_items?.length) {
          const selectedIds = currentReservation.selected_menu_items
            .filter(rmi => rmi.is_selected)
            .map(rmi => rmi.menu_item_id)
          setSelectedSalads(selectedIds)
        } else {
          setSelectedSalads([])
        }
      } else if (initialMode === 'create') {
        setFormData({
          date: initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
          time: '18:00',
          hall_id: halls[0]?.id || '',
          table_id: '',
          guest_id: '',
          guests_count: 10,
          children_count: 0,
          menu_id: menus[0]?.id || '',
        color: '#f59e0b',
          status: 'new',
          total_amount: 0,
          comments: ''
        })
        setSelectedTables([])
        setDraftTables([])
        setSelectedSalads([])
      }
      setShowSchemePicker(false)
      setSelectionBox(null)
      // Reset new guest form when modal opens/closes
      setShowNewGuest(false)
      setNewGuestData({ first_name: '', last_name: '', phone: '' })
    })
  }, [currentReservation, initialMode, isOpen, initialDate, halls, menus])

  const statusOptions: ReservationStatus[] = ['new', 'in_progress', 'prepaid', 'paid', 'canceled']
  
  // Инициализируем selectedSalads при переходе в режим редактирования
  useEffect(() => {
    if (mode === 'edit' && currentMenu && selectedSalads.length === 0) {
      const items = menuItems.filter(i => i.menu_id === currentMenu.id)
      const selectableItems = items.filter(item => item.is_selectable)
      
      // Если есть сохраненные данные, используем их
      if (currentReservation?.selected_menu_items?.length) {
        const savedSelectableIds = currentReservation.selected_menu_items
          .filter(rmi => rmi.is_selected && selectableItems.some(si => si.id === rmi.menu_item_id))
          .map(rmi => rmi.menu_item_id)
        if (savedSelectableIds.length > 0) {
          setSelectedSalads(savedSelectableIds)
          return
        }
      }
      
      // Если нет сохраненных данных, инициализируем первые по умолчанию
      if (selectableItems.length > 0) {
        const maxSelections = selectableItems[0]?.max_selections || selectableItems.length
        const defaultSelected = selectableItems
          .slice(0, maxSelections)
          .map(item => item.id)
        setSelectedSalads(defaultSelected)
      }
    }
  }, [mode, currentMenu, menuItems, currentReservation?.selected_menu_items, selectedSalads.length])
  
  const handleToggleMenuEdit = () => {
    const newShowMenuEdit = !showMenuEdit
    
    // При открытии редактирования инициализируем выбранные салаты, если они еще не инициализированы
    if (newShowMenuEdit && currentMenu && selectedSalads.length === 0) {
      const items = menuItems.filter(i => i.menu_id === currentMenu.id)
      const selectableItems = items.filter(item => item.is_selectable)
      
      // Если есть сохраненные данные, используем их
      if (currentReservation?.selected_menu_items?.length) {
        const savedSelectableIds = currentReservation.selected_menu_items
          .filter(rmi => rmi.is_selected && selectableItems.some(si => si.id === rmi.menu_item_id))
          .map(rmi => rmi.menu_item_id)
        if (savedSelectableIds.length > 0) {
          setSelectedSalads(savedSelectableIds)
        } else if (selectableItems.length > 0) {
          // Если нет сохраненных, инициализируем первые по умолчанию
          const maxSelections = selectableItems[0]?.max_selections || selectableItems.length
          const defaultSelected = selectableItems
            .slice(0, maxSelections)
            .map(item => item.id)
          setSelectedSalads(defaultSelected)
        }
      } else if (selectableItems.length > 0) {
        // Если нет сохраненных данных, инициализируем первые по умолчанию
        const maxSelections = selectableItems[0]?.max_selections || selectableItems.length
        const defaultSelected = selectableItems
          .slice(0, maxSelections)
          .map(item => item.id)
        setSelectedSalads(defaultSelected)
      }
    }
    
    setShowMenuEdit(newShowMenuEdit)
  }

  const computedTotal = useMemo(() => {
    if (currentMenu) {
      return currentMenu.price_per_person * formData.guests_count
    }
    return formData.total_amount
  }, [currentMenu, formData.guests_count, formData.total_amount])

  const occupiedTableMap = useMemo(() => {
    const map = new Map<string, string>()
    dayReservations
      ?.filter(r => r.id !== currentReservation?.id)
      ?.forEach(r => {
        const color = r.color || '#ef4444'
        if (r.table_id) map.set(r.table_id, color)
        if (r.table_ids?.length) r.table_ids.forEach(id => map.set(id, color))
      })
    return map
  }, [dayReservations, currentReservation?.id])

  const menuItemsByType = useMemo((): Partial<Record<MenuItemType, typeof menuItems>> => {
    if (!currentMenu) return {}
    const items = menuItems.filter(i => i.menu_id === currentMenu.id)
    return items.reduce((acc, item) => {
      if (!acc[item.type]) acc[item.type] = []
      acc[item.type]!.push(item)
      return acc
    }, {} as Partial<Record<MenuItemType, typeof items>>)
  }, [currentMenu, menuItems])

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

  const getTableAABB = (table: typeof tables[number]) => {
    const rot = (table.rotation ?? 0) * (Math.PI / 180)
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const corners = [
      { x: 0, y: 0 },
      { x: table.width, y: 0 },
      { x: table.width, y: table.height },
      { x: 0, y: table.height },
    ].map((c) => ({
      x: table.position_x + c.x * cos - c.y * sin,
      y: table.position_y + c.x * sin + c.y * cos,
    }))
    const xs = corners.map((c) => c.x)
    const ys = corners.map((c) => c.y)
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    }
  }

  const handleSchemeMouseDown = (e: React.MouseEvent) => {
    if (!schemeRef.current) return
    const rect = schemeRef.current.getBoundingClientRect()
    const x = clamp(e.clientX - rect.left, 0, CANVAS_WIDTH)
    const y = clamp(e.clientY - rect.top, 0, CANVAS_HEIGHT)
    setSelectionBox({ x1: x, y1: y, x2: x, y2: y, active: true, moved: false })
  }

  const handleSchemeMouseMove = (e: React.MouseEvent) => {
    if (!schemeRef.current || !selectionBox?.active) return
    const rect = schemeRef.current.getBoundingClientRect()
    const x = clamp(e.clientX - rect.left, 0, CANVAS_WIDTH)
    const y = clamp(e.clientY - rect.top, 0, CANVAS_HEIGHT)
    setSelectionBox((prev) => {
      if (!prev) return prev
      const moved = prev.moved || Math.abs(x - prev.x1) > 3 || Math.abs(y - prev.y1) > 3
      return { ...prev, x2: x, y2: y, moved }
    })
  }

  const handleSchemeMouseUp = () => {
    if (!selectionBox || !tables.length) {
      setSelectionBox(null)
      return
    }
    if (!selectionBox.moved) {
      setSelectionBox(null)
      return
    }
    const minX = Math.min(selectionBox.x1, selectionBox.x2)
    const maxX = Math.max(selectionBox.x1, selectionBox.x2)
    const minY = Math.min(selectionBox.y1, selectionBox.y2)
    const maxY = Math.max(selectionBox.y1, selectionBox.y2)

    const nextSelected = tables
      .filter((t) => {
        const box = getTableAABB(t)
        const intersects =
          box.maxX >= minX &&
          box.minX <= maxX &&
          box.maxY >= minY &&
          box.minY <= maxY
        return intersects
      })
      .map((t) => t.id)

    setDraftTables(nextSelected)
    setSelectionBox(null)
  }

  const handleSchemeClick = (tableId: string) => {
    setDraftTables((prev) => {
      const exists = prev.includes(tableId)
      if (exists) {
        return prev.filter((id) => id !== tableId)
      }
      return [...prev, tableId]
    })
  }

  const handleStatusChange = (status: ReservationStatus) => {
    setFormData(prev => ({ ...prev, status }))
  }

  // Handle status change in view mode (click to change status directly)
  const handleStatusClickInView = async (newStatus: ReservationStatus) => {
    if (!currentReservation || mode !== 'view') return
    
    // Update status immediately
    const result = await updateReservation.mutate(currentReservation.id, {
      status: newStatus
    })
    
    if (result) {
      // Update local reservation state
      setLocalReservation({
        ...currentReservation,
        status: newStatus
      })
      // Also update formData for display
      setFormData(prev => ({ ...prev, status: newStatus }))
      onSaveSuccess?.({ ...currentReservation, status: newStatus })
    }
  }

  const handleSave = async () => {
    let guestId = formData.guest_id

    // Create new guest ONLY if we're in create mode or explicitly adding a new guest
    // Don't create guest if we're just editing an existing reservation
    if (showNewGuest && mode !== 'view' && newGuestData.first_name && newGuestData.last_name && newGuestData.phone) {
      // Check if guest with this phone already exists
      const existingGuest = guests.find(g => g.phone === newGuestData.phone)
      if (existingGuest) {
        alert(`Гость с телефоном ${newGuestData.phone} уже существует. Выберите существующего гостя.`)
        return
      }

      const newGuest = await createGuest.mutate({
        ...newGuestData,
        status: 'regular' as const // Добавляем обязательное поле status
      })
      if (newGuest) {
        guestId = newGuest.id
        // Reset new guest form after successful creation
        setShowNewGuest(false)
        setNewGuestData({ first_name: '', last_name: '', phone: '' })
      } else {
        const errorMsg = createGuest.error || 'Не удалось создать гостя. Проверьте введенные данные.'
        alert(errorMsg)
        return // Failed to create guest
      }
    }

    if (!guestId) {
      alert('Выберите гостя')
      return
    }

    // Автоматически меняем статус с "new" на "in_progress" при любом изменении
    let statusToSave = formData.status
    if (currentReservation && currentReservation.status === 'new' && formData.status === 'new') {
      // Если статус был "new" и мы что-то изменяем, автоматически переводим в "in_progress"
      statusToSave = 'in_progress'
    }

    const dataToSave = {
      date: formData.date,
      time: formData.time,
      hall_id: formData.hall_id,
      table_id: (selectedTables[0] || formData.table_id) || undefined,
      guest_id: guestId,
      guests_count: formData.guests_count,
      children_count: formData.children_count,
      menu_id: formData.menu_id,
      color: formData.color,
      status: statusToSave,
      total_amount: computedTotal,
      comments: formData.comments,
    }

    // Формируем selected_menu_items для обновления отображения
    const buildSelectedMenuItems = (reservationId: string): ReservationMenuItem[] => {
      if (!currentMenu) return []
      
      const allMenuItemsForMenu = menuItems.filter(i => i.menu_id === currentMenu.id)
      const selectableItems = allMenuItemsForMenu.filter(item => item.is_selectable)
      const nonSelectableItems = allMenuItemsForMenu.filter(item => !item.is_selectable)
      
      const result: ReservationMenuItem[] = []
      
      // Добавляем выбранные селективные позиции
      selectedSalads.forEach(menuItemId => {
        const menuItem = selectableItems.find(item => item.id === menuItemId)
        if (menuItem) {
          result.push({
            id: '', // Временный ID, будет заменен при загрузке
            reservation_id: reservationId,
            menu_item_id: menuItemId,
            is_selected: true,
            menu_item: menuItem
          })
        }
      })
      
      // Добавляем все неселективные позиции
      nonSelectableItems.forEach(menuItem => {
        result.push({
          id: '',
          reservation_id: reservationId,
          menu_item_id: menuItem.id,
          is_selected: true,
          menu_item: menuItem
        })
      })
      
      return result
    }

    if (mode === 'create') {
      const created = await createReservation.mutate(dataToSave)
      if (created) {
        await syncReservationTables(created.id, selectedTables)
        await syncReservationMenuItems(created.id, selectedSalads)
        const updatedReservation = {
          ...created,
          status: statusToSave, // Используем обновленный статус
          tables: tables.filter(t => selectedTables.includes(t.id)),
          table_ids: selectedTables,
          selected_menu_items: buildSelectedMenuItems(created.id)
        }
        // Обновляем локальное состояние для немедленного отображения
        setLocalReservation(updatedReservation as Reservation)
        setFormData(prev => ({ ...prev, status: statusToSave }))
        onSaveSuccess?.(updatedReservation)
      }
    } else if (currentReservation) {
      const result = await updateReservation.mutate(currentReservation.id, dataToSave)
      if (result) {
        await syncReservationTables(currentReservation.id, selectedTables)
        await syncReservationMenuItems(currentReservation.id, selectedSalads)
        const updatedReservation = {
          ...result,
          status: statusToSave, // Используем обновленный статус
          tables: tables.filter(t => selectedTables.includes(t.id)),
          table_ids: selectedTables,
          selected_menu_items: buildSelectedMenuItems(currentReservation.id)
        }
        // Обновляем локальное состояние для немедленного отображения
        setLocalReservation(updatedReservation as Reservation)
        setFormData(prev => ({ ...prev, status: statusToSave }))
        onSaveSuccess?.(updatedReservation)
      }
    }
  }

  const syncReservationTables = async (reservationId?: string, tableIds: string[] = []) => {
    if (!reservationId) return
    const supabase = createClient()
    // Сначала очищаем предыдущие связи
    await supabase.from('reservation_tables').delete().eq('reservation_id', reservationId)
    if (!tableIds.length) return
    const payload = tableIds.map((tableId) => ({ reservation_id: reservationId, table_id: tableId }))
    await supabase.from('reservation_tables').insert(payload)
  }

  const syncReservationMenuItems = async (reservationId?: string, selectedItemIds: string[] = []) => {
    if (!reservationId || !currentMenu) return
    const supabase = createClient()
    
    // Получаем все позиции меню для текущего меню
    const allMenuItems = menuItems.filter(i => i.menu_id === currentMenu.id)
    
    // Сначала очищаем все предыдущие связи для этого бронирования и меню
    const allMenuItemIds = allMenuItems.map(item => item.id)
    if (allMenuItemIds.length > 0) {
      await supabase
        .from('reservation_menu_items')
        .delete()
        .eq('reservation_id', reservationId)
        .in('menu_item_id', allMenuItemIds)
    }
    
    // Добавляем выбранные селективные позиции
    if (selectedItemIds.length > 0) {
      const payload = selectedItemIds.map((menuItemId) => ({
        reservation_id: reservationId,
        menu_item_id: menuItemId,
        is_selected: true
      }))
      await supabase.from('reservation_menu_items').insert(payload)
    }
    
    // Добавляем все неселективные позиции (они всегда включены)
    const nonSelectableItems = allMenuItems.filter(item => !item.is_selectable)
    if (nonSelectableItems.length > 0) {
      const payload = nonSelectableItems.map((item) => ({
        reservation_id: reservationId,
        menu_item_id: item.id,
        is_selected: true
      }))
      await supabase.from('reservation_menu_items').insert(payload)
    }
  }

  const handleDelete = async () => {
    if (currentReservation && confirm('Вы уверены что хотите удалить это бронирование?')) {
      const result = await deleteReservation.mutate(currentReservation.id)
      if (result) {
        onSaveSuccess?.()
      }
    }
  }

  const isLoading = createReservation.loading || updateReservation.loading || deleteReservation.loading || createGuest.loading

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold text-stone-900">
                {mode === 'create' ? 'Новое бронирование' : 'Бронирование'}
              </DialogTitle>
              {currentReservation && mode !== 'create' && (
                <p className="text-sm text-stone-500 mt-1">
                  {formatDate(currentReservation.date)} в {currentReservation.time}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 mr-8">
              {reservation && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-stone-400 hover:text-rose-600"
                  onClick={handleDelete}
                  disabled={isLoading}
                  title="Удалить бронь"
                >
                  {deleteReservation.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {mode === 'view' ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Редактировать
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Отмена
                  </Button>
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Сохранить
                  </Button>
                </>
              )}
            </div>
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
                  const isSelected = formData.status === status
                  return (
                    <motion.button
                      key={status}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (mode === 'view') {
                          // В режиме просмотра - сразу изменяем статус
                          handleStatusClickInView(status)
                        } else {
                          // В режиме редактирования - просто меняем в форме
                          handleStatusChange(status)
                        }
                      }}
                      className={cn(
                        "px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all",
                        isSelected 
                          ? "shadow-md" 
                          : "opacity-60 hover:opacity-100",
                        mode === 'view' && "cursor-pointer"
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

            {/* Guest Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Информация о госте
              </h3>
              
              {mode === 'view' ? (
                <div className="space-y-3">
                  <div>
                    <Label>ФИО</Label>
                    <p className="mt-1 font-medium">
                      {currentReservation?.guest?.last_name} {currentReservation?.guest?.first_name} {currentReservation?.guest?.middle_name}
                    </p>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      Телефон
                    </Label>
                    <p className="mt-1">{currentReservation?.guest?.phone}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {!showNewGuest ? (
                    <>
                      <Select 
                        value={formData.guest_id} 
                        onValueChange={(v) => setFormData({ ...formData, guest_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите гостя" />
                        </SelectTrigger>
                        <SelectContent>
                          {guests.map(guest => (
                            <SelectItem key={guest.id} value={guest.id}>
                              {guest.last_name} {guest.first_name} - {guest.phone}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => setShowNewGuest(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Новый гость
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-3 p-4 rounded-xl bg-stone-50">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Фамилия *</Label>
                          <Input 
                            value={newGuestData.last_name}
                            onChange={(e) => setNewGuestData({ ...newGuestData, last_name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Имя *</Label>
                          <Input 
                            value={newGuestData.first_name}
                            onChange={(e) => setNewGuestData({ ...newGuestData, first_name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Телефон *</Label>
                        <Input 
                          value={newGuestData.phone}
                          onChange={(e) => setNewGuestData({ ...newGuestData, phone: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setShowNewGuest(false)}>
                        Выбрать существующего
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Date, Time, Hall */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Дата
                </Label>
                {mode === 'view' ? (
                  <p className="mt-1 font-medium">{formatDate(currentReservation?.date || '')}</p>
                ) : (
                  <Input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="mt-1"
                  />
                )}
              </div>
              
              <div>
                <Label className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Время
                </Label>
                {mode === 'view' ? (
                  <p className="mt-1 font-medium">{currentReservation?.time}</p>
                ) : (
                  <Input 
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="mt-1"
                  />
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" />
                  Зал
                </Label>
                {mode === 'view' ? (
                  <p className="mt-1">{currentReservation?.hall?.name}</p>
                ) : (
                  <Select 
                    value={formData.hall_id}
                    onValueChange={(v) => {
                      setFormData({ ...formData, hall_id: v, table_id: '' })
                      setSelectedTables([])
                      setDraftTables([])
                      setShowSchemePicker(false)
                      setSelectionBox(null)
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Выберите зал" />
                    </SelectTrigger>
                    <SelectContent>
                      {halls.map(hall => (
                        <SelectItem key={hall.id} value={hall.id}>
                          {hall.name} (до {hall.capacity} чел.)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Стол
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-1">
                        {currentReservation?.tables?.length
                          ? currentReservation.tables.map((t) => t.number).join(', ')
                          : currentReservation?.table?.number
                            ? `${currentReservation.table.number}`
                            : 'Не выбраны'}
                      </p>
                    ) : (
                      <p className="text-sm text-stone-500 mt-1">
                        Выберите столы в списке или на схеме зала
                      </p>
                    )}
                  </div>
                  {mode !== 'view' && (
                    <Button
                      type="button"
                      variant={showSchemePicker ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowSchemePicker((v) => !v)}
                      className="gap-2"
                    >
                      {showSchemePicker ? 'Скрыть схему' : 'Выбрать на схеме'}
                    </Button>
                  )}
                </div>

                {mode === 'view' ? null : (
                  <div className="grid gap-2">
                    <Select 
                      value={formData.table_id || 'none'}
                      onValueChange={(v) => {
                        const id = v === 'none' ? '' : v
                        setFormData({ ...formData, table_id: id })
                        const next = id ? [id] : []
                        setSelectedTables(next)
                        if (showSchemePicker) setDraftTables(next)
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Выберите стол" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Без стола</SelectItem>
                        {tables.map(table => {
                          const occupiedColor = occupiedTableMap.get(table.id)
                          return (
                            <SelectItem key={table.id} value={table.id}>
                              <span className="inline-flex items-center gap-2">
                                {occupiedColor && (
                                  <span
                                    className="inline-block h-3 w-3 rounded-full border border-stone-300"
                                    style={{ backgroundColor: occupiedColor }}
                                  />
                                )}
                                {table.number} • {table.capacity} чел.{occupiedColor ? ' (занят)' : ''}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-3 flex-wrap">
                      <Label className="text-sm text-stone-600">Цвет бронирования</Label>
                      <div className="flex items-center gap-2">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            className={cn(
                              "h-7 w-7 rounded-full border-2",
                              formData.color === c ? "ring-2 ring-offset-2 ring-amber-500 border-stone-300" : "border-stone-200"
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => setFormData({ ...formData, color: c })}
                          />
                        ))}
                        <Input
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="h-8 w-16 p-1"
                        />
                      </div>
                    </div>

                    {showSchemePicker && (
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm text-stone-600">
                            Кликните по столу или выделите рамкой несколько. Можно выбрать несколько — бронь закрепится за всеми выбранными.
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setDraftTables([])
                                setSelectedTables([])
                                setFormData((prev) => ({ ...prev, table_id: '' }))
                              }}
                            >
                              Сбросить
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSelectedTables(draftTables)
                                setFormData((prev) => ({ ...prev, table_id: draftTables[0] ?? '' }))
                                setShowSchemePicker(false)
                              }}
                            >
                              Подтвердить
                            </Button>
                          </div>
                        </div>

                        <div
                          ref={schemeRef}
                          className="relative bg-white border border-dashed border-stone-200 overflow-hidden rounded-lg"
                          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '16px 16px' }}
                          onMouseDown={handleSchemeMouseDown}
                          onMouseMove={handleSchemeMouseMove}
                          onMouseUp={handleSchemeMouseUp}
                          onMouseLeave={handleSchemeMouseUp}
                        >
                          {tables.map((table) => {
                            const isSelected = draftTables.includes(table.id)
                            const occupiedColor = occupiedTableMap.get(table.id)
                            return (
                              <div
                                key={table.id}
                                className={cn(
                                  "absolute border-2 flex items-center justify-center text-sm font-semibold transition shadow-sm select-none",
                                  table.shape === 'round' && "rounded-full",
                                  table.shape === 'rectangle' && "rounded-xl",
                                  table.shape === 'square' && "rounded-lg",
                                  isSelected
                                    ? "border-amber-500 bg-amber-50"
                                    : occupiedColor
                                      ? "border-stone-300 bg-white"
                                      : "border-stone-300 bg-white hover:border-amber-400"
                                )}
                                style={{
                                  left: table.position_x,
                                  top: table.position_y,
                                  width: table.width,
                                  height: table.height,
                                  transform: `rotate(${table.rotation ?? 0}deg)`,
                                  transformOrigin: 'top left',
                                }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleSchemeClick(table.id)
                                }}
                                title={occupiedColor ? 'Занято другим бронированием' : undefined}
                              >
                                {table.number}
                                {occupiedColor && (
                                  <span
                                    className="absolute -top-2 -right-2 h-3.5 w-3.5 rounded-full border border-white shadow"
                                    style={{ backgroundColor: occupiedColor }}
                                  />
                                )}
                              </div>
                            )
                          })}

                          {selectionBox && (
                            <div
                              className="absolute border-2 border-amber-400 bg-amber-200/20 pointer-events-none"
                              style={{
                                left: Math.min(selectionBox.x1, selectionBox.x2),
                                top: Math.min(selectionBox.y1, selectionBox.y2),
                                width: Math.abs(selectionBox.x2 - selectionBox.x1),
                                height: Math.abs(selectionBox.y2 - selectionBox.y1),
                              }}
                            />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-stone-700">
                          {draftTables.length > 0 && (
                            <span>Выбрано: {draftTables.length}</span>
                          )}
                          {occupiedTableMap.size > 0 && (
                            <span className="text-rose-600">
                              Заняты: {tables.filter(t => occupiedTableMap.has(t.id)).map(t => t.number).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Guests Count */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  Гостей
                </Label>
                {mode === 'view' ? (
                  <p className="mt-1 text-2xl font-bold text-stone-900">{currentReservation?.guests_count}</p>
                ) : (
                  <Input
                    type="number"
                    min={1}
                    value={formData.guests_count}
                    onChange={(e) => setFormData({ ...formData, guests_count: parseInt(e.target.value) || 1 })}
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
                  <p className="mt-1 text-2xl font-bold text-stone-900">{currentReservation?.children_count || 0}</p>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    value={formData.children_count}
                    onChange={(e) => setFormData({ ...formData, children_count: parseInt(e.target.value) || 0 })}
                    className="mt-1"
                  />
                )}
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
                    onClick={handleToggleMenuEdit}
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
                      value={formData.menu_id}
                      onValueChange={(v) => setFormData({ ...formData, menu_id: v })}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Выберите меню" />
                      </SelectTrigger>
                      <SelectContent>
                        {menus.map(menu => (
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
                      
                      const typeLabelPlural = getMenuItemTypeLabel(type, customTypes, true)
                      const isSelectable = items[0]?.is_selectable
                      const maxSelections = items[0]?.max_selections || items.length
                      const platesCount = calculatePlates(formData.guests_count)

                      return (
                        <div key={type} className="rounded-xl border border-stone-200 overflow-hidden">
                          <div className="bg-stone-50 px-4 py-2 flex items-center justify-between">
                            <span className="font-medium text-stone-900">
                              {typeLabelPlural}
                            </span>
                            <span className="text-sm text-stone-500">
                              {platesCount} тарелок
                            </span>
                          </div>
                          <div className="divide-y divide-stone-100">
                            {items.map((item, idx) => {
                              // Для селективных позиций используем selectedSalads, для неселективных - всегда выбраны
                              // В режиме просмотра используем данные из reservation.selected_menu_items
                              let isSelected: boolean
                              if (!isSelectable) {
                                isSelected = true
                              } else if (showMenuEdit) {
                                // В режиме редактирования используем selectedSalads
                                isSelected = selectedSalads.includes(item.id)
                              } else if (mode === 'view' && currentReservation?.selected_menu_items?.length) {
                                // В режиме просмотра используем сохраненные данные
                                isSelected = currentReservation.selected_menu_items.some(
                                  rmi => rmi.menu_item_id === item.id && rmi.is_selected
                                )
                              } else {
                                // Fallback: используем selectedSalads или первые по умолчанию
                                isSelected = selectedSalads.includes(item.id) || (selectedSalads.length === 0 && idx < maxSelections)
                              }
                              const totalWeight = calculateTotalWeight(item.weight_per_person, formData.guests_count)
                              
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
                                            // Если элемент уже выбран, ничего не делаем
                                            if (selectedSalads.includes(item.id)) {
                                              return
                                            }
                                            // Просто добавляем новый элемент
                                            setSelectedSalads([...selectedSalads, item.id])
                                          } else {
                                            // Убираем элемент из выбранных
                                            setSelectedSalads(selectedSalads.filter(id => id !== item.id))
                                          }
                                        }}
                                      />
                                    )}
                                    <span className={cn(
                                      "break-words overflow-wrap-anywhere",
                                      isSelected ? "text-stone-900" : "text-stone-400"
                                    )}>
                                      {item.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-stone-500 shrink-0 whitespace-nowrap">
                                    <span>{item.weight_per_person} гр./чел.</span>
                                    <span className="font-medium text-stone-700">
                                      {totalWeight} гр.
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Separator />

            {/* Total Amount */}
            <div className="rounded-xl bg-linear-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Итоговая стоимость банкета</p>
                  <p className="text-3xl font-bold text-amber-900">
                    {formatCurrency(computedTotal)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-amber-700">
                    {currentMenu?.name} ({formatCurrency(currentMenu?.price_per_person || 0)}/чел.)
                  </p>
                  <p className="text-sm text-amber-600">
                    {formData.guests_count} × {formatCurrency(currentMenu?.price_per_person || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Payments */}
            {currentReservation?.payments && currentReservation.payments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Внесённые предоплаты
                </h3>
                <div className="space-y-2">
                  {currentReservation.payments.map((payment) => (
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
                  {currentReservation?.comments || 'Нет комментариев'}
                </p>
              ) : (
                <Textarea 
                  placeholder="Добавьте комментарии к заказу..."
                  value={formData.comments}
                  onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                  className="min-h-[100px]"
                />
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {mode !== 'view' && (
          <div className="flex items-center justify-between gap-4 p-6 pt-4 border-t border-stone-200 bg-stone-50">
            {mode === 'edit' && currentReservation && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                className="gap-2"
              >
                {deleteReservation.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Удалить
              </Button>
            )}
            {mode === 'create' && <div />}
            
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose}>
                Отмена
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {mode === 'create' ? 'Создать' : 'Сохранить'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
