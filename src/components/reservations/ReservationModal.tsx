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
  Save,
  Trash2,
  Plus,
  Baby,
  Loader2,
  Settings,
  User,
  ChefHat,
  CreditCard,
  MessageSquare
} from 'lucide-react'
import { Reservation, ReservationStatus, RESERVATION_STATUS_CONFIG, getMenuItemTypeLabel, MenuItemType, Guest, ReservationMenuItem } from '@/types'
import { cn, formatCurrency, formatDate, formatTime, calculatePlates, calculateTotalWeight } from '@/lib/utils'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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

  // Status variant mapping
  const getStatusVariant = (status: ReservationStatus) => {
    const variants = {
      new: 'new' as const,
      in_progress: 'inProgress' as const,
      prepaid: 'prepaid' as const,
      paid: 'paid' as const,
      canceled: 'canceled' as const,
    }
    return variants[status]
  }
  
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

  const [isMobile, setIsMobile] = useState(false)
  const CANVAS_WIDTH = isMobile ? 600 : 800
  const CANVAS_HEIGHT = isMobile ? 450 : 600
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

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

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
      time: formatTime(formData.time),
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
      <DialogContent className={cn(
        "max-w-4xl max-h-[95vh] p-0 overflow-hidden",
        "w-[95vw] sm:w-[90vw] md:w-[85vw]", // Добавлен md breakpoint
        "mx-auto", // Центрирование
        mode !== 'view' && "pb-0"
      )}>
        <DialogHeader className="p-4 pb-2">
          {/* Compact Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-stone-900">
                {mode === 'create' ? 'Новое бронирование' : 'Бронирование'}
              </DialogTitle>
              {currentReservation && mode !== 'create' && (
                <div className="mt-1 space-y-1">
                  <p className="text-sm font-medium text-stone-700">
                    {currentReservation.guest?.last_name} {currentReservation.guest?.first_name}
                  </p>
                  <p className="text-xs text-stone-500">
                    {formatDate(currentReservation.date)} в {formatTime(currentReservation.time)}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Status Badge */}
              <div className="text-right">
                <div className="text-lg font-bold text-stone-900">
                  {formatCurrency(currentReservation?.total_amount || computedTotal)}
                </div>
                <Badge variant={getStatusVariant(currentReservation?.status || formData.status)} className="text-xs mt-1">
                  {RESERVATION_STATUS_CONFIG[currentReservation?.status || formData.status].label}
                </Badge>
              </div>

              {mode === 'view' && reservation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span className="hidden sm:inline">Изменить</span>
                </Button>
              )}

              {reservation && mode === 'view' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-stone-400 hover:text-rose-600 hover:bg-rose-50"
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
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className={cn(
          mode === 'view' ? "max-h-[calc(80vh-140px)]" : "max-h-[calc(95vh-200px)]",
          mode !== 'view' && "pb-20"
        )}>
          <div className="p-4 pr-10 space-y-4 break-anywhere">
            {/* Status Selection - Only show when editing */}
            {mode !== 'view' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Статус бронирования</Label>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => {
                    const config = RESERVATION_STATUS_CONFIG[status]
                    const isSelected = formData.status === status
                    return (
                      <motion.button
                        key={status}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStatusChange(status)}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all",
                          isSelected ? "shadow-md" : "opacity-60 hover:opacity-100"
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
            )}

            {/* Guest Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                <User className="h-4 w-4 flex-shrink-0" />
                Информация о госте
              </h3>
              {mode === 'view' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-stone-500">ФИО</Label>
                      <p className="mt-1 font-medium text-stone-900 break-anywhere">
                        {currentReservation?.guest?.last_name} {currentReservation?.guest?.first_name} {currentReservation?.guest?.middle_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                        Телефон
                      </Label>
                      <p className="mt-1 text-stone-900 break-anywhere">{currentReservation?.guest?.phone}</p>
                    </div>
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
                          />
                        </div>
                        <div>
                          <Label>Имя *</Label>
                          <Input
                            value={newGuestData.first_name}
                            onChange={(e) => setNewGuestData({ ...newGuestData, first_name: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Телефон *</Label>
                        <Input
                          value={newGuestData.phone}
                          onChange={(e) => setNewGuestData({ ...newGuestData, phone: e.target.value })}
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

            {/* Reservation Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                Детали бронирования
              </h3>
              <div className="space-y-4">
                {/* Date, Time, Hall */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      Дата
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-2 font-medium break-anywhere">{formatDate(currentReservation?.date || '')}</p>
                    ) : (
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      Время
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-2 font-medium break-anywhere">{formatTime(currentReservation?.time)}</p>
                    ) : (
                      <Input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="mt-2"
                        step="60"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      Зал
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-2 break-anywhere">{currentReservation?.hall?.name}</p>
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
                        <SelectTrigger className="mt-2">
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
                </div>

                {/* Guests Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4 flex-shrink-0" />
                      Гостей
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-2 text-xl font-bold text-stone-900 break-anywhere">{currentReservation?.guests_count}</p>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        value={formData.guests_count}
                        onChange={(e) => setFormData({ ...formData, guests_count: parseInt(e.target.value) || 1 })}
                        className="mt-2"
                      />
                    )}
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 text-sm">
                      <Baby className="h-4 w-4 flex-shrink-0" />
                      Детей
                    </Label>
                    {mode === 'view' ? (
                      <p className="mt-2 text-xl font-bold text-stone-900 break-anywhere">{currentReservation?.children_count || 0}</p>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        value={formData.children_count}
                        onChange={(e) => setFormData({ ...formData, children_count: parseInt(e.target.value) || 0 })}
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>

                {/* Table Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      Столы
                    </Label>
                    {mode !== 'view' && (
                      <Button
                        type="button"
                        variant={showSchemePicker ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setShowSchemePicker((v) => !v)}
                      >
                        {showSchemePicker ? 'Скрыть схему' : 'Выбрать на схеме'}
                      </Button>
                    )}
                  </div>

                  {mode === 'view' ? (
                    <p className="text-stone-900 break-anywhere">
                      {currentReservation?.tables?.length
                        ? currentReservation.tables.map((t) => t.number).join(', ')
                        : currentReservation?.table?.number
                          ? `${currentReservation.table.number}`
                          : 'Не выбраны'}
                    </p>
                  ) : (
                    <div className="space-y-3">
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
                        <SelectTrigger>
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

                      {/* Table Scheme Picker */}
                      <AnimatePresence>
                        {showSchemePicker && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-stone-600 break-anywhere">
                                Кликните по столу или выделите рамкой
                              </p>
                              <div className="flex gap-2">
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
                                  Готово
                                </Button>
                              </div>
                            </div>

                            <div className="overflow-auto max-h-96">
                              <div
                                ref={schemeRef}
                                className="relative bg-white border border-stone-200 overflow-hidden rounded-lg mx-auto"
                                style={{
                                  width: CANVAS_WIDTH,
                                  height: CANVAS_HEIGHT,
                                  backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                                  backgroundSize: '16px 16px',
                                  maxWidth: '100%',
                                  aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`
                                }}
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
                                        "absolute border-2 flex items-center justify-center text-sm font-semibold transition select-none",
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
                            </div>

                            <div className="flex flex-wrap gap-3 text-sm">
                              {draftTables.length > 0 && (
                                <span className="text-stone-700 break-anywhere">Выбрано: {draftTables.length}</span>
                              )}
                              {occupiedTableMap.size > 0 && (
                                <span className="text-rose-600 break-anywhere">
                                  Заняты: {tables.filter(t => occupiedTableMap.has(t.id)).map(t => t.number).join(', ')}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Color Picker */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <Label className="text-sm">Цвет бронирования</Label>
                        <div className="flex items-center gap-2">
                          {COLOR_PRESETS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              className={cn(
                                "h-6 w-6 rounded-full border-2",
                                formData.color === c ? "ring-2 ring-offset-1 ring-amber-500 border-stone-300" : "border-stone-200"
                              )}
                              style={{ backgroundColor: c }}
                              onClick={() => setFormData({ ...formData, color: c })}
                            />
                          ))}
                          <Input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="h-8 w-14 p-1"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Section */}
            {currentMenu && (
              <div className="space-y-4">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                  <ChefHat className="h-4 w-4 flex-shrink-0" />
                  Меню: {currentMenu.name}
                </h3>
                <div className="space-y-4">
                  {/* Menu Header */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-amber-900 break-anywhere">{currentMenu.name}</p>
                        <p className="text-sm text-amber-700 break-anywhere">
                          {formatCurrency(currentMenu.price_per_person)}/чел.
                        </p>
                      </div>
                      {mode !== 'view' && (
                        <Select
                          value={formData.menu_id}
                          onValueChange={(v) => setFormData({ ...formData, menu_id: v })}
                        >
                          <SelectTrigger className="w-[180px]">
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

                  {/* Menu Items */}
                  <AnimatePresence>
                    {(mode === 'view' || showMenuEdit) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {(Object.keys(menuItemsByType) as MenuItemType[]).map((type) => {
                          const items = menuItemsByType[type]
                          if (!items?.length) return null

                          const typeLabelPlural = getMenuItemTypeLabel(type, customTypes, true)
                          const isSelectable = items[0]?.is_selectable
                          const platesCount = calculatePlates(formData.guests_count)

                          return (
                            <div key={type} className="rounded-lg border border-stone-200 overflow-hidden">
                              <div className="bg-stone-50 px-4 py-2 flex items-center justify-between">
                                <span className="font-medium text-stone-900 break-anywhere flex-1">
                                  {typeLabelPlural}
                                </span>
                                <span className="text-sm text-stone-500 flex-shrink-0">
                                  {platesCount} тарелок
                                </span>
                              </div>
                              <div className="divide-y divide-stone-100">
                                {items.map((item, idx) => {
                                  let isSelected: boolean
                                  if (!isSelectable) {
                                    isSelected = true
                                  } else if (showMenuEdit) {
                                    isSelected = selectedSalads.includes(item.id)
                                  } else if (mode === 'view' && currentReservation?.selected_menu_items?.length) {
                                    isSelected = currentReservation.selected_menu_items.some(
                                      rmi => rmi.menu_item_id === item.id && rmi.is_selected
                                    )
                                  } else {
                                    isSelected = selectedSalads.includes(item.id) || (selectedSalads.length === 0 && idx < (items[0]?.max_selections || items.length))
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
                              if (!selectedSalads.includes(item.id)) {
                                setSelectedSalads([...selectedSalads, item.id])
                              }
                            } else {
                              setSelectedSalads(selectedSalads.filter(id => id !== item.id))
                            }
                          }}
                        />
                      )}
                      <span className={cn(
                        "text-sm break-anywhere flex-1",
                        isSelected ? "text-stone-900" : "text-stone-400"
                      )}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-stone-500 flex-shrink-0">
                      <span className="whitespace-nowrap">{item.weight_per_person}г/чел</span>
                      <span className="font-medium whitespace-nowrap">{totalWeight}г</span>
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

                  {mode !== 'view' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleMenuEdit}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {showMenuEdit ? 'Скрыть позиции' : 'Изменить позиции'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Payments */}
            {currentReservation?.payments && currentReservation.payments.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                  <CreditCard className="h-4 w-4 flex-shrink-0" />
                  Предоплаты
                </h3>
                <div className="space-y-3 pr-4">
                  {currentReservation.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-green-900 break-anywhere">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-green-700 break-anywhere">
                          {formatDate(payment.payment_date)} • {
                            payment.payment_method === 'cash' ? 'Наличные' :
                            payment.payment_method === 'card' ? 'Картой' : 'Перевод'
                          }
                        </p>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-green-600 break-anywhere flex-shrink-0">{payment.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {(currentReservation?.comments || mode !== 'view') && (
              <div className="space-y-4">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  Комментарии
                </h3>
                <div>
                  {mode === 'view' ? (
                    <div className="p-3 rounded-lg bg-stone-50 text-sm text-stone-600 leading-relaxed break-anywhere">
                      {currentReservation?.comments || 'Нет комментариев'}
                    </div>
                  ) : (
                    <Textarea
                      placeholder="Добавьте комментарии к заказу..."
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      className="min-h-[80px]"
                    />
                  )}
                </div>
              </div>
            )}

            {/* Total Amount - Always visible */}
            <div className="rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-amber-700">Итоговая стоимость</p>
                  <p className="text-2xl font-bold text-amber-900 break-anywhere">
                    {formatCurrency(computedTotal)}
                  </p>
                </div>
                <div className="text-right text-sm flex-shrink-0">
                  <p className="text-amber-700 break-anywhere">
                    {currentMenu?.name}
                  </p>
                  <p className="text-amber-600 break-anywhere">
                    {formData.guests_count} × {formatCurrency(currentMenu?.price_per_person || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {mode !== 'view' && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 p-4 border-t border-stone-200 bg-white/95 backdrop-blur-sm">
            {mode === 'edit' && currentReservation ? (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isLoading}
                size={isMobile ? "sm" : "default"}
              >
                {deleteReservation.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className={isMobile ? "hidden" : "inline"}>Удалить</span>
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={onClose}
                size={isMobile ? "sm" : "default"}
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="gap-2"
                size={isMobile ? "sm" : "default"}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Сохранить
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
