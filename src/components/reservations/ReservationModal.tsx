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
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Copy,
  Printer
} from 'lucide-react'
import { Reservation, ReservationStatus, RESERVATION_STATUS_CONFIG, getMenuItemTypeLabel, MenuItemType, Guest, ReservationMenuItem, Payment, MenuItem } from '@/types'
import { cn, formatCurrency, formatDate, formatTime, calculatePlates, calculateTotalWeight } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { GuestCombobox } from './GuestCombobox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import TimeWheelPicker from '@/components/TimeWheelPicker'
import { useHalls, useMenus, useMenuItems, useMenuItemTypes, useGuests, useTables, useLayoutItems, useCreateMutation, useUpdateMutation, useDeleteMutation, useReservations } from '@/hooks/useSupabase'
import { updateReservationServerAction, syncReservationTablesServerAction, syncReservationMenuItemsServerAction } from '@/lib/supabase/api'
import { X } from 'lucide-react'
import { HallScheme } from '@/components/halls/HallScheme'
import { format } from 'date-fns'
import { AddPaymentDialog } from '@/components/payments/AddPaymentDialog'

interface ReservationModalProps {
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onSaveSuccess?: (saved?: Reservation) => void
  mode?: 'view' | 'edit' | 'create'
  initialDate?: Date | null
  preselectedTableId?: string | null
  preselectedHallId?: string | null
  preselectedDate?: string | null
}

export function ReservationModal({
  reservation,
  isOpen,
  onClose,
  onSaveSuccess,
  mode: initialMode = 'view',
  initialDate,
  preselectedTableId,
  preselectedHallId,
  preselectedDate
}: ReservationModalProps) {
  const [mode, setMode] = useState(initialMode)
  const [showMenuEdit, setShowMenuEdit] = useState(false)
  const [selectedSalads, setSelectedSalads] = useState<string[]>([])
  const [itemOverrides, setItemOverrides] = useState<Record<string, Partial<ReservationMenuItem>>>({})
  const [adHocItems, setAdHocItems] = useState<ReservationMenuItem[]>([])
  const [wasSaladsInitialized, setWasSaladsInitialized] = useState(false)
  const [duplicateDate, setDuplicateDate] = useState<string>('')
  const [isDuplicating, setIsDuplicating] = useState(false)
  // Внутреннее состояние для хранения обновленного бронирования
  const [localReservation, setLocalReservation] = useState<Reservation | null>(reservation)

  // Reset showMenuEdit when mode changes to view
  useEffect(() => {
    if (mode === 'view') {
      setShowMenuEdit(false)
    }
  }, [mode])

  // Используем локальное состояние, если оно есть, иначе проп
  const currentReservation = localReservation || reservation

  // Инициализируем дату для копирования при загрузке бронирования
  useEffect(() => {
    if (currentReservation?.date) {
      setDuplicateDate(currentReservation.date)
    }
  }, [currentReservation?.date])

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
  const [showMobileTablePicker, setShowMobileTablePicker] = useState(false)
  const [showDesktopTablePicker, setShowDesktopTablePicker] = useState(false)
  const [selectedTables, setSelectedTables] = useState<string[]>([])
  const [draftTables, setDraftTables] = useState<string[]>([])

  const [isMobile, setIsMobile] = useState(false)
  const [menuCollapsed, setMenuCollapsed] = useState(true) // Свернуто по умолчанию на мобильных
  const COLOR_PRESETS = ['#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#ec4899', '#ef4444', '#6b7280']

  // Payment state for new reservations
  const [prepaymentAmount, setPrepaymentAmount] = useState<number>(0)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Fetch data
  const { data: reservations, refetch: refetchReservations } = useReservations()
  const { data: halls } = useHalls()
  const { data: menus } = useMenus()
  const { data: menuItems } = useMenuItems()
  const currentMenu = useMemo(() => {
    return menus.find(m => m.id === formData.menu_id)
  }, [formData.menu_id, menus])
  const { data: customTypes } = useMenuItemTypes(formData.menu_id || undefined)
  const { data: guests } = useGuests()
  const { data: tables } = useTables(formData.hall_id)
  const { data: layoutItems = [] } = useLayoutItems(formData.hall_id)
  const dayReservations = useMemo(() => {
    if (!formData.date) return []
    return reservations.filter(r =>
      r.date === formData.date &&
      (formData.hall_id ? r.hall_id === formData.hall_id : true)
    )
  }, [reservations, formData.date, formData.hall_id])

  // Вычисление вместимости выбранных столов
  const selectedCapacity = useMemo(() => {
    return tables
      .filter(t => draftTables.includes(t.id))
      .reduce((sum, t) => sum + (t.capacity || 0), 0)
  }, [tables, draftTables])

  // Требуемая вместимость (количество гостей + дети)
  const requiredCapacity = formData.guests_count + formData.children_count

  // Достаточно ли вместимости
  const hasEnoughCapacity = draftTables.length === 0 || selectedCapacity >= requiredCapacity

  // Find matching guest for new guest form
  const matchingGuest = useMemo(() => {
    if (!newGuestData.phone || newGuestData.phone.length < 6) return null
    // Normalize user input for comparison (e.g. matching +7 and 8)
    // But since we auto-format to +7, exact match is main target
    return guests.find(g => g.phone === newGuestData.phone)
  }, [newGuestData.phone, guests])

  // Mutations
  const createReservation = useCreateMutation<Reservation>('reservations')
  const updateReservation = useUpdateMutation<Reservation>('reservations')
  const deleteReservation = useDeleteMutation('reservations')
  const createGuest = useCreateMutation<Guest>('guests')
  const createPayment = useCreateMutation<Payment>('payments')

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Проверяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Предотвращаем прокрутку body при открытии модального окна
  useEffect(() => {
    if (isOpen || showMobileTablePicker || showDesktopTablePicker) {
      // Сохраняем текущую позицию прокрутки
      const scrollY = window.scrollY

      // Блокируем прокрутку
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      // Восстанавливаем позицию при закрытии
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen, showMobileTablePicker])

  // Обновляем локальное состояние при изменении пропа reservation
  useEffect(() => {
    setLocalReservation(reservation)
  }, [reservation])

  // Автоматически выбираем первое меню, если menu_id пустой и есть доступные меню
  useEffect(() => {
    if (mode !== 'view' && !formData.menu_id && menus.length > 0) {
      setFormData(prev => ({ ...prev, menu_id: menus[0].id }))
    }
  }, [mode, formData.menu_id, menus])

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
          menu_id: currentReservation.menu_id || menus[0]?.id || '',
          color: currentReservation.color || '#f59e0b',
          status: currentReservation.status,
          total_amount: currentReservation.total_amount,
          comments: currentReservation.comments || ''
        })
        const initialTables =
          currentReservation.table_ids?.length
            ? currentReservation.table_ids
            : currentReservation.tables?.length
              ? currentReservation.tables.map((t) => t.id)
              : currentReservation.table_id
                ? [currentReservation.table_id]
                : []
        setSelectedTables(initialTables)
        setDraftTables(initialTables)

        // Инициализируем выбранные салаты и переопределения из сохраненных данных
        if (currentReservation.selected_menu_items?.length) {
          const selectedIds = currentReservation.selected_menu_items
            .filter(rmi => rmi.is_selected && rmi.menu_item_id)
            .map(rmi => rmi.menu_item_id as string)
          setSelectedSalads(selectedIds)

          const overrides: Record<string, Partial<ReservationMenuItem>> = {}
          const adHoc: ReservationMenuItem[] = []

          currentReservation.selected_menu_items.forEach(rmi => {
            if (rmi.menu_item_id) {
              if (rmi.weight_per_person || rmi.name || rmi.order_index || rmi.price) {
                overrides[rmi.menu_item_id] = {
                  weight_per_person: rmi.weight_per_person,
                  name: rmi.name,
                  order_index: rmi.order_index,
                  price: rmi.price
                }
              }
            } else {
              // This is an ad-hoc item (no menu_item_id)
              adHoc.push(rmi)
            }
          })
          setItemOverrides(overrides)
          setAdHocItems(adHoc)
          setWasSaladsInitialized(true)
        } else {
          setSelectedSalads([])
          setItemOverrides({})
          setAdHocItems([])
          setWasSaladsInitialized((initialMode as string) !== 'create')
        }
      } else if (initialMode === 'create') {
        // Определяем hall_id - приоритет preselectedHallId, затем hall стола, затем первый зал
        let hallId = preselectedHallId || ''
        if (!hallId && preselectedTableId) {
          // Находим зал по столу (tables загружаются позже, поэтому используем halls[0])
          hallId = halls[0]?.id || ''
        }
        if (!hallId) {
          hallId = halls[0]?.id || ''
        }

        setFormData({
          date: preselectedDate || (initialDate ? format(initialDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')),
          time: '18:00',
          hall_id: hallId,
          table_id: preselectedTableId || '',
          guest_id: '',
          guests_count: 10,
          children_count: 0,
          menu_id: menus[0]?.id || '',
          color: '#f59e0b',
          status: 'new',
          total_amount: 0,
          comments: ''
        })
        // Устанавливаем выбранные столы если есть preselectedTableId
        if (preselectedTableId) {
          setSelectedTables([preselectedTableId])
          setDraftTables([preselectedTableId])
        } else {
          setSelectedTables([])
          setDraftTables([])
        }
        setSelectedSalads([])
      }
      setShowSchemePicker(false)
      setShowMobileTablePicker(false)
      setShowDesktopTablePicker(false)
      // Reset new guest form when modal opens/closes
      setShowNewGuest(false)
      setNewGuestData({ first_name: '', last_name: '', phone: '' })
      setPrepaymentAmount(0)
    })
  }, [currentReservation, initialMode, isOpen, initialDate, halls, menus, preselectedTableId, preselectedHallId, preselectedDate])

  const statusOptions: ReservationStatus[] = ['new', 'in_progress', 'prepaid', 'paid', 'canceled']

  // Инициализируем selectedSalads при переходе в режим редактирования или при выборе меню
  useEffect(() => {
    if (currentMenu && !wasSaladsInitialized) {
      const items = menuItems.filter(i => i.menu_id === currentMenu.id)
      const selectableItems = items.filter(item => item.is_selectable)

      // Если это существующее бронирование, мы уже должны были загрузить данные выше
      if (currentReservation?.id && mode !== 'create') {
        return
      }

      // Если нет сохраненных данных (новое бронирование), инициализируем первые по умолчанию
      if (selectableItems.length > 0) {
        const maxSelections = selectableItems[0]?.max_selections || selectableItems.length
        const defaultSelected = selectableItems
          .slice(0, maxSelections)
          .map(item => item.id)
          .filter(Boolean) as string[]
        setSelectedSalads(defaultSelected)
        setWasSaladsInitialized(true)
      }
    }
  }, [currentMenu, menuItems, currentReservation?.id, mode, wasSaladsInitialized])

  const handleToggleMenuEdit = () => {
    const newShowMenuEdit = !showMenuEdit

    // При открытии редактирования инициализируем выбранные салаты, если они еще не инициализированы
    if (newShowMenuEdit && currentMenu && selectedSalads.length === 0) {
      const items = menuItems.filter(i => i.menu_id === currentMenu.id)
      const selectableItems = items.filter(item => item.is_selectable)

      // Если есть сохраненные данные, используем их
      if (currentReservation?.selected_menu_items?.length) {
        const savedSelectableIds = currentReservation.selected_menu_items
          .filter(rmi => rmi.is_selected && rmi.menu_item_id && selectableItems.some(si => si.id === rmi.menu_item_id))
          .map(rmi => rmi.menu_item_id)
          .filter(Boolean) as string[]
        if (savedSelectableIds.length > 0) {
          setSelectedSalads(savedSelectableIds)
          setShowMenuEdit(newShowMenuEdit)
          return
        }
      }

      // Если нет сохраненных данных, инициализируем первые по умолчанию
      if (selectableItems.length > 0) {
        const maxSelections = selectableItems[0]?.max_selections || selectableItems.length
        const defaultSelected = selectableItems
          .slice(0, maxSelections)
          .map(item => item.id)
          .filter(Boolean) as string[]
        setSelectedSalads(defaultSelected)
      }
    }

    setShowMenuEdit(newShowMenuEdit)
  }

  const computedTotal = useMemo(() => {
    if (currentMenu && currentMenu.price_per_person != null) {
      const total = currentMenu.price_per_person * formData.guests_count
      return isNaN(total) ? 0 : total
    }

    // Если меню не выбрано, суммируем цены произвольных позиций
    if (adHocItems.length > 0) {
      return adHocItems.reduce((sum, item) => sum + (item.price || 0), 0)
    }

    return formData.total_amount || 0
  }, [currentMenu, formData.guests_count, formData.total_amount, adHocItems])

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

  const menuItemsByType = useMemo(() => {
    const result: Record<string, (MenuItem | ReservationMenuItem)[]> = {}

    // 1. Сначала добавляем позиции из глобального меню (если выбрано)
    if (currentMenu) {
      const globalItems = menuItems.filter(i => i.menu_id === currentMenu.id)
      globalItems.forEach(item => {
        if (!result[item.type]) result[item.type] = []
        result[item.type].push(item)
      })
    }

    // 2. Затем добавляем произвольные позиции (ad-hoc) этого бронирования
    adHocItems.forEach(item => {
      const type = item.type || 'Other'
      if (!result[type]) result[type] = []

      // Избегаем дубликатов, если вдруг они просочились сюда (хотя adHocItems по определению без menu_item_id)
      result[type].push(item)
    })

    return result
  }, [currentMenu, menuItems, adHocItems])

  const handleMobileTableClick = (tableId: string) => {
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




  const handleDelete = async () => {
    if (currentReservation && confirm('Вы уверены что хотите удалить это бронирование?')) {
      const result = await deleteReservation.mutate(currentReservation.id)
      if (result) {
        onSaveSuccess?.()
      }
    }
  }

  const handleDuplicate = async () => {
    if (!currentReservation || !duplicateDate) {
      alert('Выберите дату для копирования')
      return
    }

    setIsDuplicating(true)
    try {
      // 1. Create new reservation (cloning fields)
      const dataToSave = {
        date: duplicateDate,
        time: currentReservation.time,
        hall_id: currentReservation.hall_id,
        table_id: selectedTables.length > 0 ? selectedTables[0] : (formData.table_id || undefined),
        guest_id: currentReservation.guest_id,
        guests_count: Number(formData.guests_count) || 1,
        children_count: Number(formData.children_count) || 0,
        menu_id: formData.menu_id || undefined,
        color: formData.color,
        status: 'new' as ReservationStatus,
        total_amount: Number(computedTotal),
        prepaid_amount: 0, // Reset payments for the copy
        comments: formData.comments,
      }

      const created = await createReservation.mutate(dataToSave)

      if (created) {
        // 2. Clone tables
        if (selectedTables.length > 0) {
          await syncReservationTablesServerAction(created.id, selectedTables)
        }

        // 3. Clone menu items
        await syncReservationMenuItemsServerAction(created.id, selectedSalads, itemOverrides, adHocItems)

        alert(`Бронирование успешно скопировано на ${formatDate(duplicateDate)}`)
        onSaveSuccess?.()
        onClose()
      }
    } catch (error) {
      console.error('Error duplicating reservation:', error)
      alert('Ошибка при копировании: ' + (error as any)?.message)
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleSave = async () => {
    let guestId = formData.guest_id
    let existingReservationId = currentReservation?.id

    // 1. Create/Get Guest
    if (showNewGuest && newGuestData.first_name && newGuestData.last_name && newGuestData.phone) {
      const existingGuest = guests.find(g => g.phone === newGuestData.phone)
      if (existingGuest) {
        if (confirm(`Гость с телефоном ${newGuestData.phone} уже существует: ${existingGuest.last_name} ${existingGuest.first_name}. Привязать бронь к этому гостю?`)) {
          guestId = existingGuest.id
          setShowNewGuest(false)
          setNewGuestData({ first_name: '', last_name: '', phone: '' })
        } else {
          return // User chose not to use existing guest
        }
      } else {
        const newGuest = await createGuest.mutate({
          ...newGuestData,
          status: 'regular' as const
        })
        if (newGuest) {
          guestId = newGuest.id
          setShowNewGuest(false)
          setNewGuestData({ first_name: '', last_name: '', phone: '' })
        } else {
          const errorMsg = createGuest.error || 'Не удалось создать гостя. Проверьте введенные данные.'
          alert(errorMsg)
          return // Failed to create guest
        }
      }
    }

    if (!guestId) {
      alert('Выберите гостя')
      return
    }

    // Validate required fields
    if (!formData.guests_count) {
      alert('Укажите количество гостей')
      return
    }
    if (!formData.date) {
      alert('Выберите дату')
      return
    }
    if (!formData.time) {
      alert('Выберите время')
      return
    }
    if (!formData.hall_id) {
      alert('Выберите зал')
      return
    }
    if (formData.guests_count < 1) {
      alert('Количество гостей должно быть не менее 1')
      return
    }

    // Validate time format
    const timeStr = formatTime(formData.time)
    if (!timeStr || !timeStr.match(/^\d{2}:\d{2}$/)) {
      console.error('Invalid time format:', formData.time, 'formatted to:', timeStr)
      alert('Неверный формат времени')
      return
    }

    // Validate total amount
    if (isNaN(computedTotal) || computedTotal < 0) {
      console.error('Invalid total amount:', computedTotal)
      alert('Неверная сумма заказа')
      return
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(formData.hall_id)) {
      console.error('Invalid hall_id:', formData.hall_id)
      alert('Неверный идентификатор зала')
      return
    }
    if (!uuidRegex.test(guestId)) {
      console.error('Invalid guest_id:', guestId)
      alert('Неверный идентификатор гостя')
      return
    }
    if (formData.menu_id && !uuidRegex.test(formData.menu_id)) {
      console.error('Invalid menu_id:', formData.menu_id)
      alert('Неверный идентификатор меню')
      return
    }

    // Автоматически меняем статус с "new" на "in_progress" при любом изменении
    let statusToSave = formData.status
    if (currentReservation && currentReservation.status === 'new' && formData.status === 'new') {
      // Если статус был "new" и мы что-то изменяем, автоматически переводим в "in_progress"
      statusToSave = 'in_progress'
    }
    // If prepayment is added for a new reservation, set status to 'prepaid'
    if (mode === 'create' && prepaymentAmount > 0 && statusToSave === 'new') {
      statusToSave = 'prepaid'
    }


    // Ensure date is in correct format
    let dateToSave = formData.date
    if (formData.date) {
      // If it's already in YYYY-MM-DD format, use as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(formData.date)) {
        dateToSave = formData.date
      } else {
        // Otherwise, parse and format
        const parsedDate = new Date(formData.date)
        if (!isNaN(parsedDate.getTime())) {
          dateToSave = parsedDate.toISOString().split('T')[0]
        } else {
          console.error('Invalid date format:', formData.date)
          alert('Неверный формат даты')
          return
        }
      }
    } else {
      console.error('No date selected')
      alert('Выберите дату')
      return
    }

    if (!dateToSave) {
      console.error('dateToSave is empty')
      alert('Ошибка с датой')
      return
    }

    // Prepare time in HH:mm:ss format for database
    const timeFormatted = formatTime(formData.time)
    const timeForDB = timeFormatted.match(/^\d{2}:\d{2}$/) ? `${timeFormatted}:00` : timeFormatted

    const dataToSave = {
      date: dateToSave,
      time: timeForDB,
      hall_id: formData.hall_id,
      table_id: statusToSave === 'canceled' ? null : (selectedTables.length > 0 ? selectedTables[0] : (formData.table_id && formData.table_id.trim() ? formData.table_id : undefined)),
      guest_id: guestId,
      guests_count: Number(formData.guests_count) || 1,
      children_count: Number(formData.children_count) || 0,
      menu_id: formData.menu_id || undefined,
      color: formData.color,
      status: statusToSave,
      total_amount: Number(computedTotal),
      prepaid_amount: Number(currentReservation?.prepaid_amount || 0) + (mode === 'create' ? prepaymentAmount : 0), // Add new prepayment for create mode
      comments: formData.comments,
    }

    // Формируем selected_menu_items для обновления отображения
    const buildSelectedMenuItems = (reservationId: string): ReservationMenuItem[] => {
      const result: ReservationMenuItem[] = []

      if (currentMenu) {
        const allMenuItemsForMenu = menuItems.filter(i => i.menu_id === currentMenu.id)
        const selectableItems = allMenuItemsForMenu.filter(item => item.is_selectable)
        const nonSelectableItems = allMenuItemsForMenu.filter(item => !item.is_selectable)

        // Добавляем выбранные селективные позиции
        selectedSalads.forEach(menuItemId => {
          const menuItem = selectableItems.find(item => item.id === menuItemId)
          const override = itemOverrides[menuItemId] || {}
          if (menuItem) {
            result.push({
              id: '',
              reservation_id: reservationId,
              menu_item_id: menuItemId,
              is_selected: true,
              name: override.name,
              weight_per_person: override.weight_per_person,
              price: override.price,
              order_index: override.order_index,
              menu_item: menuItem
            })
          }
        })

        // Добавляем все неселективные позиции
        nonSelectableItems.forEach(menuItem => {
          const override = itemOverrides[menuItem.id] || {}
          result.push({
            id: '',
            reservation_id: reservationId,
            menu_item_id: menuItem.id,
            is_selected: true,
            name: override.name,
            weight_per_person: override.weight_per_person,
            price: override.price,
            order_index: override.order_index,
            menu_item: menuItem
          })
        })
      }

      // Добавляем произвольные позиции (ad-hoc)
      adHocItems.forEach(item => {
        result.push({
          ...item,
          reservation_id: reservationId,
          id: (item.id && item.id.startsWith('new-')) ? '' : item.id
        })
      })

      return result
    }

    let finalReservation: Reservation | null = null;

    if (mode === 'create') {
      try {
        const created = await createReservation.mutate(dataToSave as any)
        if (created) {
          const tablesToSync = statusToSave === 'canceled' ? [] : selectedTables

          console.log('--- Creating Reservation Sync ---')
          console.log('Tables to sync:', tablesToSync)

          const [tablesSyncResult, menuSyncResult] = await Promise.all([
            syncReservationTablesServerAction(created.id, tablesToSync),
            syncReservationMenuItemsServerAction(created.id, selectedSalads, itemOverrides, adHocItems, formData.menu_id)
          ])

          if (!tablesSyncResult.success) {
            console.error('Tables sync failed:', tablesSyncResult.error)
            alert(`Ошибка при привязке столов: ${tablesSyncResult.error}`)
          }

          if (!menuSyncResult.success) {
            console.error('Menu sync failed:', menuSyncResult.error)
            alert(`Ошибка при сохранении меню: ${menuSyncResult.error}`)
          }

          if (prepaymentAmount > 0) {
            await createPayment.mutate({
              reservation_id: created.id,
              amount: prepaymentAmount,
              payment_method: 'card',
              payment_date: new Date().toISOString(),
              notes: 'Предоплата при создании'
            })
          }

          finalReservation = {
            ...created,
            status: statusToSave,
            tables: tables.filter(t => selectedTables.includes(t.id)),
            table_ids: selectedTables,
            selected_menu_items: buildSelectedMenuItems(created.id),
            prepaid_amount: dataToSave.prepaid_amount // Ensure prepaid_amount is updated
          } as Reservation;
          setLocalReservation(finalReservation)
          setFormData(prev => ({ ...prev, status: statusToSave }))
          onSaveSuccess?.(finalReservation)
        }
      } catch (error) {
        console.error('Error creating reservation:', error);
        alert('Ошибка при создании бронирования: ' + (error as any)?.message);
      }
    } else if (currentReservation) {
      try {
        console.log('Save Debug - Original formData.date:', formData.date)
        console.log('Save Debug - Processed dateToSave:', dateToSave)
        console.log('Save Debug - Final dataToSave:', dataToSave)

        const updateResult = await updateReservationServerAction(currentReservation.id, dataToSave as any)
        console.log('Server action update result:', updateResult)

        if (!updateResult.success) {
          console.error('Server action failed:', updateResult.error)
          alert('Ошибка сохранения: ' + ((updateResult.error as any)?.message || 'Неизвестная ошибка'))
          return
        }

        const result = updateResult.data
        if (result) {
          const tablesToSync = statusToSave === 'canceled' ? [] : selectedTables

          console.log('--- Updating Reservation Sync ---')
          console.log('Tables to sync:', tablesToSync)

          const [tablesSyncResult, menuSyncResult] = await Promise.all([
            syncReservationTablesServerAction(currentReservation.id, tablesToSync),
            syncReservationMenuItemsServerAction(currentReservation.id, selectedSalads, itemOverrides, adHocItems, formData.menu_id)
          ])

          if (!tablesSyncResult.success) {
            console.error('Tables sync failed:', tablesSyncResult.error)
            alert(`Ошибка при привязке столов: ${tablesSyncResult.error}`)
          }

          if (!menuSyncResult.success) {
            console.error('Menu sync failed:', menuSyncResult.error)
            alert(`Ошибка при сохранении меню: ${menuSyncResult.error}`)
          }

          finalReservation = {
            ...currentReservation,
            ...(dataToSave as any),
            status: statusToSave,
            tables: tables.filter(t => (statusToSave === 'canceled' ? [] : selectedTables).includes(t.id)),
            table_ids: statusToSave === 'canceled' ? [] : selectedTables,
            selected_menu_items: buildSelectedMenuItems(currentReservation.id)
          } as Reservation;
          setLocalReservation(finalReservation)
          setFormData(prev => ({ ...prev, status: statusToSave }))
          onSaveSuccess?.(finalReservation)
        }
      } catch (error) {
        console.error('Error updating reservation:', error);
        alert('Ошибка при сохранении изменений: ' + (error as any)?.message);
      }
    }
  }


  const isLoading = createReservation.loading || updateReservation.loading || deleteReservation.loading || createGuest.loading || createPayment.loading

  // Десктопное модальное окно для выбора столов
  if (showDesktopTablePicker && !isMobile) {
    return (
      <Dialog open={showDesktopTablePicker} onOpenChange={() => setShowDesktopTablePicker(false)}>
        <DialogContent className="max-w-4xl max-h-[90vh] w-full p-0">
          <div className="flex flex-col h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h3 className="text-xl font-semibold">Выбор столов</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDesktopTablePicker(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Hall Scheme */}
            <HallScheme
              tables={tables}
              layoutItems={layoutItems}
              mode="select"
              selectedTables={draftTables}
              onSelectTable={handleMobileTableClick}
              occupiedTableMap={occupiedTableMap}
              currentReservationId={currentReservation?.id}
              className="flex-1"
              showCapacity={true}
              requiredCapacity={requiredCapacity}
            />

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-200">
              <div className="text-sm">
                <div className="text-stone-600">
                  Выбрано столов: {draftTables.length}
                  {draftTables.length > 0 && (
                    <span className="ml-2">
                      (№{tables.filter(t => draftTables.includes(t.id)).map(t => t.number).join(', ')})
                    </span>
                  )}
                </div>
                {/* Информация о вместимости */}
                {draftTables.length > 0 && (
                  <div className={cn(
                    "text-sm mt-1",
                    hasEnoughCapacity ? "text-green-600" : "text-red-500"
                  )}>
                    Вместимость: {selectedCapacity} из {requiredCapacity} чел
                    {!hasEnoughCapacity && (
                      <span className="ml-1 font-medium">
                        (нужно ещё {requiredCapacity - selectedCapacity})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDraftTables([])
                    setSelectedTables([])
                    setFormData((prev) => ({ ...prev, table_id: '' }))
                  }}
                >
                  Сбросить
                </Button>
                <Button
                  onClick={() => {
                    setSelectedTables(draftTables)
                    setFormData((prev) => ({ ...prev, table_id: draftTables[0] ?? '' }))
                    setShowDesktopTablePicker(false)
                  }}
                >
                  Готово
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Мобильное модальное окно для выбора столов
  if (showMobileTablePicker && isMobile) {
    return (
      <Dialog open={showMobileTablePicker} onOpenChange={() => setShowMobileTablePicker(false)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] p-0 [&>button]:hidden">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <h3 className="text-lg font-semibold">Выбор столов</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileTablePicker(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Hall Scheme */}
            <HallScheme
              tables={tables}
              layoutItems={layoutItems}
              mode="select"
              selectedTables={draftTables}
              onSelectTable={handleMobileTableClick}
              occupiedTableMap={occupiedTableMap}
              currentReservationId={currentReservation?.id}
              className="flex-1"
              showCapacity={true}
              requiredCapacity={requiredCapacity}
            />

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-200">
              <div className="text-sm">
                <div className="text-stone-600">
                  Выбрано: {draftTables.length}
                </div>
                {/* Информация о вместимости */}
                {draftTables.length > 0 && (
                  <div className={cn(
                    "text-xs mt-0.5",
                    hasEnoughCapacity ? "text-green-600" : "text-red-500"
                  )}>
                    {selectedCapacity}/{requiredCapacity} чел
                    {!hasEnoughCapacity && ` (−${requiredCapacity - selectedCapacity})`}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
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
                  size="sm"
                  onClick={() => {
                    setSelectedTables(draftTables)
                    setFormData((prev) => ({ ...prev, table_id: draftTables[0] ?? '' }))
                    setShowMobileTablePicker(false)
                  }}
                >
                  Готово
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-4xl max-h-[95vh] p-0 overflow-hidden",
        "w-[95vw] sm:w-[90vw] md:w-[85vw]", // Добавлен md breakpoint
        "mx-auto", // Центрирование
        mode !== 'view' && "pb-0"
      )}>
        <DialogHeader className="p-4 pb-2 pr-12 sm:pr-4">
          {/* Compact Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Кнопка "Назад" для мобильных */}
              <div className="flex items-center gap-2 mb-2 md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="p-1 h-8 w-8"
                >
                  ← Назад
                </Button>
              </div>
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
                  <Badge variant={getStatusVariant(currentReservation?.status || formData.status)} className="text-xs">
                    {RESERVATION_STATUS_CONFIG[currentReservation?.status || formData.status].label}
                  </Badge>
                </div>
              )}
            </div>

            {/* Action Buttons - всегда справа */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {reservation && mode !== 'create' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 sm:gap-2 h-8 sm:h-9 text-stone-600 hover:text-amber-600 hover:border-amber-200"
                      onClick={() => setDuplicateDate(formData.date)}
                    >
                      <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline text-xs sm:text-sm">Копия</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4" align="end">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium leading-none text-stone-900">Копировать бронь</h4>
                        <p className="text-sm text-stone-500">
                          Выберите новую дату для создания копии этого бронирования. Все данные, кроме оплат, будут перенесены.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-stone-700">Новая дата</Label>
                        <DateTimePicker
                          value={duplicateDate}
                          onChange={(date) => setDuplicateDate(date)}
                          dateOnly={true}
                        />
                      </div>
                      <Button
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={handleDuplicate}
                        disabled={isDuplicating || !duplicateDate}
                      >
                        {isDuplicating ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Copy className="h-4 w-4 mr-2" />
                        )}
                        Создать копию
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              {mode === 'view' && reservation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/reservations/${reservation.id}/print`, '_blank')}
                  className="gap-1 sm:gap-2 h-8 sm:h-9 border-stone-200 hover:bg-stone-50"
                  title="Распечатать карточку"
                >
                  <Printer className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Печать</span>
                </Button>
              )}

              {mode === 'view' && reservation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="gap-1 sm:gap-2 h-8 sm:h-9"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline text-xs sm:text-sm">Изменить</span>
                </Button>
              )}

              {reservation && mode === 'view' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 sm:h-9 sm:w-9"
                  onClick={handleDelete}
                  disabled={isLoading}
                  title="Удалить бронь"
                >
                  {deleteReservation.loading ? (
                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
          <div className="modal-content space-y-4 break-anywhere">
            {/* Status Selection - Only show when editing */}
            {mode !== 'view' && (
              <div className="space-y-3 modal-form-section">
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
            <div className="space-y-4 modal-form-section">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                <User className="h-4 w-4 shrink-0" />
                Информация о госте
              </h3>
              {mode === 'view' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs text-stone-500">ФИО</Label>
                      <p className="mt-1 font-medium text-stone-900 break-anywhere">
                        {currentReservation?.guest?.last_name} {currentReservation?.guest?.first_name} {currentReservation?.guest?.middle_name}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-stone-500 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
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
                      <GuestCombobox
                        guests={guests}
                        value={formData.guest_id}
                        onChange={(v) => setFormData({ ...formData, guest_id: v })}
                      />
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
                          onChange={(e) => {
                            let val = e.target.value
                            if (val === '9') val = '+79'
                            if (val === '8') val = '+7'
                            setNewGuestData({ ...newGuestData, phone: val })
                          }}
                          className={cn(matchingGuest && "border-amber-500 ring-amber-500")}
                        />
                        {matchingGuest && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between"
                          >
                            <div className="text-sm">
                              <p className="font-medium text-amber-900">Гость найден:</p>
                              <p className="text-amber-800">{matchingGuest.last_name} {matchingGuest.first_name}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, guest_id: matchingGuest.id }))
                                setShowNewGuest(false)
                                setNewGuestData({ first_name: '', last_name: '', phone: '' })
                              }}
                            >
                              Выбрать
                            </Button>
                          </motion.div>
                        )}
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
            <div className="space-y-4 modal-form-section">
              <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                <Calendar className="h-4 w-4 shrink-0" />
                Детали бронирования
              </h3>
              <div className="space-y-4">
                {/* Mobile layout: 3 rows x 2 cols */}
                <div className="space-y-4 sm:hidden">
                  {/* Row 1: Date & Time */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 shrink-0" />
                        Дата
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 font-medium break-anywhere">{formatDate(currentReservation?.date || '')}</p>
                      ) : (
                        <DateTimePicker
                          value={formData.date}
                          onChange={(date) => setFormData({ ...formData, date })}
                          dateOnly={true}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 shrink-0" />
                        Время
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 font-medium break-anywhere">{formatTime(currentReservation?.time)}</p>
                      ) : (
                        <TimeWheelPicker
                          value={formData.time}
                          onChange={(time) => setFormData({ ...formData, time })}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Row 2: Guests & Children */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 shrink-0" />
                        Гостей
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 text-xl font-bold text-stone-900 break-anywhere">{currentReservation?.guests_count}</p>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={formData.guests_count}
                          onChange={(e) => setFormData({ ...formData, guests_count: e.target.value === '' ? ('' as any) : parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Baby className="h-4 w-4 shrink-0" />
                        Детей
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 text-xl font-bold text-stone-900 break-anywhere">{currentReservation?.children_count || 0}</p>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={formData.children_count}
                          onChange={(e) => setFormData({ ...formData, children_count: e.target.value === '' ? ('' as any) : parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>

                  {/* Row 3: Hall & Tables */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 shrink-0" />
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

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 shrink-0" />
                          Столы
                        </Label>
                        {mode !== 'view' && (
                          <Button
                            type="button"
                            variant={(showSchemePicker || showMobileTablePicker || showDesktopTablePicker) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              if (isMobile) {
                                setShowMobileTablePicker(true)
                              } else {
                                setShowDesktopTablePicker(true)
                              }
                            }}
                            className="text-xs"
                          >
                            {(showSchemePicker || showMobileTablePicker || showDesktopTablePicker) ? 'Скрыть схему' : 'Выбрать на схеме'}
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 break-anywhere text-sm text-stone-600">
                        {mode === 'view' ? (
                          currentReservation?.tables?.length
                            ? currentReservation.tables.map((t) => `Стол ${t.number}`).join(', ')
                            : currentReservation?.table?.number
                              ? `Стол ${currentReservation.table.number}`
                              : 'Не выбраны'
                        ) : (
                          selectedTables.length > 0
                            ? tables.filter(t => selectedTables.includes(t.id)).map(t => `Стол ${t.number}`).join(', ')
                            : 'Не выбраны'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desktop layout: 2 rows x 3 cols */}
                <div className="hidden sm:block">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 shrink-0" />
                        Дата
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 font-medium break-anywhere">{formatDate(currentReservation?.date || '')}</p>
                      ) : (
                        <DateTimePicker
                          value={formData.date}
                          onChange={(date) => setFormData({ ...formData, date })}
                          dateOnly={true}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 shrink-0" />
                        Время
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 font-medium break-anywhere">{formatTime(currentReservation?.time)}</p>
                      ) : (
                        <TimeWheelPicker
                          value={formData.time}
                          onChange={(time) => setFormData({ ...formData, time })}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 shrink-0" />
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

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 shrink-0" />
                        Гостей
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 text-xl font-bold text-stone-900 break-anywhere">{currentReservation?.guests_count}</p>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={formData.guests_count}
                          onChange={(e) => setFormData({ ...formData, guests_count: e.target.value === '' ? ('' as any) : parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <Label className="flex items-center gap-2 text-sm">
                        <Baby className="h-4 w-4 shrink-0" />
                        Детей
                      </Label>
                      {mode === 'view' ? (
                        <p className="mt-2 text-xl font-bold text-stone-900 break-anywhere">{currentReservation?.children_count || 0}</p>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={formData.children_count}
                          onChange={(e) => setFormData({ ...formData, children_count: e.target.value === '' ? ('' as any) : parseInt(e.target.value) })}
                          className="mt-2"
                        />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 shrink-0" />
                          Столы
                        </Label>
                        {mode !== 'view' && (
                          <Button
                            type="button"
                            variant={(showSchemePicker || showMobileTablePicker || showDesktopTablePicker) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              if (isMobile) {
                                setShowMobileTablePicker(true)
                              } else {
                                setShowDesktopTablePicker(true)
                              }
                            }}
                            className="text-xs"
                          >
                            {(showSchemePicker || showMobileTablePicker || showDesktopTablePicker) ? 'Скрыть схему' : 'Выбрать на схеме'}
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 break-anywhere text-sm text-stone-600">
                        {mode === 'view' ? (
                          currentReservation?.tables?.length
                            ? currentReservation.tables.map((t) => `Стол ${t.number}`).join(', ')
                            : currentReservation?.table?.number
                              ? `Стол ${currentReservation.table.number}`
                              : 'Не выбраны'
                        ) : (
                          selectedTables.length > 0
                            ? tables.filter(t => selectedTables.includes(t.id)).map(t => `Стол ${t.number}`).join(', ')
                            : 'Не выбраны'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Color Picker */}
                <div className="space-y-3">
                  <Label className="text-sm">Цвет бронирования</Label>
                  <div className="flex flex-col gap-3">
                    {/* Preset colors in grid */}
                    <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                      {COLOR_PRESETS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={cn(
                            "h-6 w-6 sm:h-5 sm:w-5 rounded-full border-2 touch-manipulation",
                            formData.color === c ? "ring-2 ring-offset-1 ring-amber-500 border-stone-300" : "border-stone-200"
                          )}
                          style={{ backgroundColor: c }}
                          onClick={() => setFormData({ ...formData, color: c })}
                          title={`Выбрать цвет ${c}`}
                        />
                      ))}
                    </div>
                    {/* Custom color picker */}
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-stone-600">Или выберите свой:</Label>
                      <Input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="h-8 w-12 p-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Section */}
            {(mode === 'edit' || currentMenu) && (
              <div className="space-y-4 modal-form-section">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-2">
                  <ChefHat className="h-4 w-4 shrink-0" />
                  Меню: {currentMenu?.name || 'Не выбрано'}
                </h3>

                <div className="space-y-4">
                  {/* Menu Header */}
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex-1">
                        {currentMenu ? (
                          <>
                            <p className="font-semibold text-amber-900 break-anywhere">{currentMenu.name}</p>
                            <p className="text-sm text-amber-700 break-anywhere">
                              {formatCurrency(currentMenu.price_per_person)}/чел.
                            </p>
                          </>
                        ) : (
                          <p className="font-semibold text-amber-900">Меню не выбрано</p>
                        )}
                      </div>
                      {mode !== 'view' && (
                        <Select
                          value={formData.menu_id}
                          onValueChange={(v) => {
                            if (v !== formData.menu_id) {
                              setFormData({ ...formData, menu_id: v })
                              // Очищаем выбранные селективные позиции и переопределения при смене меню
                              setSelectedSalads([])
                              setItemOverrides({})
                            }
                          }}
                        >
                          <SelectTrigger className="w-full sm:w-[180px]">
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
                  {(currentMenu || adHocItems.length > 0 || (showMenuEdit && mode !== 'view')) && (
                    <AnimatePresence>
                      {(mode === 'view' || showMenuEdit) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          {(Object.keys(menuItemsByType) as string[]).map((type) => {
                            const items = menuItemsByType[type]
                            if (!items?.length) return null

                            const typeLabelPlural = getMenuItemTypeLabel(type as MenuItemType, customTypes, true)
                            const firstItem = items[0]
                            const isSelectableGroup = !(!('menu_id' in firstItem) || !(firstItem as MenuItem).is_selectable)
                            const platesCount = calculatePlates(formData.guests_count)

                            return (
                              <div key={type} className="rounded-lg border border-stone-200 overflow-hidden">
                                <div className="bg-stone-50 px-4 py-2 flex items-center justify-between">
                                  <span className="font-medium text-stone-900 break-anywhere flex-1">
                                    {typeLabelPlural}
                                  </span>
                                  <span className="text-sm text-stone-500 shrink-0">
                                    {platesCount} тарелок
                                  </span>
                                </div>
                                <div className="divide-y divide-stone-100">
                                  {items.map((item, idx) => {
                                    const isAdHoc = !('menu_id' in item)
                                    const itemId = isAdHoc ? (item as ReservationMenuItem).id : (item as MenuItem).id
                                    const itemName = isAdHoc ? (item as ReservationMenuItem).name : (item as MenuItem).name
                                    const itemWeight = isAdHoc ? (item as ReservationMenuItem).weight_per_person : (item as MenuItem).weight_per_person
                                    const isSelectable = !isAdHoc && (item as MenuItem).is_selectable

                                    let isSelected: boolean
                                    if (isAdHoc) {
                                      isSelected = true
                                    } else if (!isSelectable) {
                                      isSelected = true
                                    } else if (showMenuEdit) {
                                      isSelected = selectedSalads.includes(itemId)
                                    } else if (mode === 'view' && currentReservation?.selected_menu_items?.length) {
                                      isSelected = currentReservation.selected_menu_items.some(
                                        rmi => rmi.menu_item_id === itemId && rmi.is_selected
                                      )
                                    } else {
                                      isSelected = selectedSalads.includes(itemId) || (selectedSalads.length === 0 && idx < ((item as MenuItem).max_selections || items.length))
                                    }

                                    const displayWeight = isAdHoc
                                      ? (item as ReservationMenuItem).weight_per_person
                                      : (itemOverrides[itemId]?.weight_per_person ?? (item as MenuItem).weight_per_person)

                                    const displayName = isAdHoc
                                      ? (item as ReservationMenuItem).name
                                      : (itemOverrides[itemId]?.name ?? (item as MenuItem).name)

                                    return (
                                      <div
                                        key={isAdHoc ? `adhoc-${itemId}-${idx}` : itemId}
                                        className={cn(
                                          "px-4 py-3 flex items-center justify-between gap-4 group",
                                          !isSelected && "opacity-50"
                                        )}
                                      >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          {isSelectable && showMenuEdit && (
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  if (!selectedSalads.includes(itemId)) {
                                                    setSelectedSalads([...selectedSalads, itemId])
                                                  }
                                                } else {
                                                  setSelectedSalads(selectedSalads.filter(id => id !== itemId))
                                                }
                                              }}
                                            />
                                          )}
                                          <div className="flex flex-col flex-1 min-w-0">
                                            <span className={cn(
                                              "text-sm break-anywhere",
                                              isSelected ? "text-stone-900" : "text-stone-400"
                                            )}>
                                              {showMenuEdit && mode !== 'view' ? (
                                                <Input
                                                  className="h-8 py-1 px-2 text-sm"
                                                  value={displayName ?? ''}
                                                  onChange={(e) => {
                                                    if (isAdHoc) {
                                                      const newAdHoc = [...adHocItems]
                                                      const adItem = newAdHoc.find(ai => ai.id === itemId)
                                                      if (adItem) adItem.name = e.target.value
                                                      setAdHocItems(newAdHoc)
                                                    } else {
                                                      setItemOverrides({
                                                        ...itemOverrides,
                                                        [itemId]: { ...itemOverrides[itemId], name: e.target.value }
                                                      })
                                                    }
                                                  }}
                                                />
                                              ) : (
                                                displayName
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-stone-500 shrink-0">
                                          <div className="flex items-center gap-1">
                                            {showMenuEdit && mode !== 'view' ? (
                                              <Input
                                                type="number"
                                                className="h-8 w-16 py-1 px-2 text-sm"
                                                value={displayWeight ?? 0}
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value) || 0
                                                  if (isAdHoc) {
                                                    const newAdHoc = [...adHocItems]
                                                    const adItem = newAdHoc.find(ai => ai.id === itemId)
                                                    if (adItem) adItem.weight_per_person = val
                                                    setAdHocItems(newAdHoc)
                                                  } else {
                                                    setItemOverrides({
                                                      ...itemOverrides,
                                                      [itemId]: { ...itemOverrides[itemId], weight_per_person: val }
                                                    })
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <span>{displayWeight}</span>
                                            )}
                                            <span>г/чел</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {showMenuEdit && mode !== 'view' ? (
                                              <Input
                                                type="number"
                                                className="h-8 w-20 py-1 px-2 text-sm text-right"
                                                value={isAdHoc ? ((item as ReservationMenuItem).price ?? 0) : (itemOverrides[itemId]?.price ?? (item as MenuItem).price ?? 0)}
                                                onChange={(e) => {
                                                  const val = parseFloat(e.target.value) || 0
                                                  if (isAdHoc) {
                                                    const newAdHoc = [...adHocItems]
                                                    const adItem = newAdHoc.find(ai => ai.id === itemId)
                                                    if (adItem) adItem.price = val
                                                    setAdHocItems(newAdHoc)
                                                  } else {
                                                    setItemOverrides({
                                                      ...itemOverrides,
                                                      [itemId]: { ...itemOverrides[itemId], price: val }
                                                    })
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <span>{isAdHoc ? ((item as ReservationMenuItem).price ?? 0) : (itemOverrides[itemId]?.price ?? (item as MenuItem).price ?? 0)}</span>
                                            )}
                                            <span>₽</span>
                                          </div>
                                          <span className="font-medium whitespace-nowrap min-w-[50px] text-right">
                                            {calculateTotalWeight(displayWeight || 0, formData.guests_count)}г
                                          </span>
                                          {isAdHoc && showMenuEdit && mode !== 'view' && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                              onClick={() => {
                                                setAdHocItems(adHocItems.filter(ai => ai.id !== itemId))
                                              }}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}

                                  {showMenuEdit && mode !== 'view' && (
                                    <div className="px-4 py-2 bg-stone-50/50">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-stone-500 hover:text-amber-600 gap-1 w-full justify-center"
                                        onClick={() => {
                                          const newItem: ReservationMenuItem = {
                                            id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                            reservation_id: currentReservation?.id || '',
                                            menu_item_id: null,
                                            is_selected: true,
                                            name: '',
                                            weight_per_person: 0,
                                            price: 0,
                                            type: type,
                                            order_index: (adHocItems.length + 1) * 10
                                          }
                                          setAdHocItems([...adHocItems, newItem])
                                        }}
                                      >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Добавить позицию</span>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}

                          {showMenuEdit && mode !== 'view' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full border-dashed text-stone-500 hover:text-amber-600 border-stone-300 gap-2 h-10"
                              onClick={() => {
                                const sectionName = prompt('Введите название нового раздела (например: Фрукты, Напитки):')
                                if (sectionName) {
                                  const newItem: ReservationMenuItem = {
                                    id: `new-${Date.now()}`,
                                    reservation_id: currentReservation?.id || '',
                                    menu_item_id: null,
                                    is_selected: true,
                                    name: '',
                                    weight_per_person: 0,
                                    price: 0,
                                    type: sectionName,
                                    order_index: (adHocItems.length + 1) * 10
                                  }
                                  setAdHocItems([...adHocItems, newItem])
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                              <span>Добавить свой раздел</span>
                            </Button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}

                  {mode !== 'view' && currentMenu && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleMenuEdit}
                      className="w-full min-h-[44px]"
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
                  <CreditCard className="h-4 w-4 shrink-0" />
                  Предоплаты
                </h3>
                <div className="space-y-3">
                  {currentReservation.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 sm:p-4 rounded-lg bg-green-50 border border-green-200"
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
                        <p className="text-sm text-green-600 break-anywhere shrink-0">{payment.notes}</p>
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
                  <MessageSquare className="h-4 w-4 shrink-0" />
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

            {/* Total Amount & Payment Info */}
            <div className="bg-stone-50 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-stone-600 font-medium">Итого к оплате</span>
                <div className="text-right">
                  <span className="text-xl sm:text-2xl font-bold text-amber-600">
                    {(() => {
                      const paid = mode === 'create' ? prepaymentAmount : (currentReservation?.prepaid_amount || 0)
                      const balance = Math.max(0, computedTotal - paid)
                      return formatCurrency(balance)
                    })()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Сумма до вычета</span>
                <span className="font-semibold text-stone-600">
                  {formatCurrency(computedTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">Оплачено</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(mode === 'create' ? prepaymentAmount : (currentReservation?.prepaid_amount || 0))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-stone-200 pt-2">
                {(() => {
                  const paid = mode === 'create' ? prepaymentAmount : (currentReservation?.prepaid_amount || 0)
                  const surplus = Math.max(0, paid - computedTotal)

                  if (surplus > 0) {
                    return (
                      <>
                        <span className="text-stone-500">Излишек</span>
                        <span className="font-bold text-emerald-600">
                          {formatCurrency(surplus)}
                        </span>
                      </>
                    )
                  }

                  return null
                })()}
              </div>

              {mode !== 'create' && currentReservation && (
                <Button
                  variant="outline"
                  className="w-full mt-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700"
                  onClick={() => setIsPaymentDialogOpen(true)}
                >
                  + Добавить оплату
                </Button>
              )}

              {mode === 'create' && (
                <div className="pt-2 border-t border-stone-200">
                  <Label className="text-stone-600 mb-1.5 block">Внести предоплату (₽)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={prepaymentAmount || ''}
                    onChange={(e) => setPrepaymentAmount(parseFloat(e.target.value) || 0)}
                  />
                  {prepaymentAmount > computedTotal && computedTotal > 0 && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Внимание: Превышение суммы</p>
                        <p>Предоплата больше итоговой суммы. Излишек составит {formatCurrency(prepaymentAmount - computedTotal)}.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
      <AddPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        reservationId={currentReservation?.id}
        reservation={currentReservation || undefined}
        onSuccess={() => {
          refetchReservations()
        }}
      />
    </Dialog>
  )
}
