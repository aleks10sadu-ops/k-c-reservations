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
  Printer,
  MoreHorizontal
} from 'lucide-react'
import { Reservation, ReservationStatus, RESERVATION_STATUS_CONFIG, getMenuItemTypeLabel, MenuItemType, Guest, ReservationMenuItem, Payment, MenuItem, ReservationMainMenuItem } from '@/types'
import { cn, formatCurrency, formatDate, formatTime, calculatePlates, calculateTotalWeight } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import TimeWheelPicker from '@/components/TimeWheelPicker'
import { useHalls, useMenus, useMenuItems, useMenuItemTypes, useGuests, useTables, useLayoutItems, useCreateMutation, useUpdateMutation, useDeleteMutation, useReservations, useStaff, notifyDataChange } from '@/hooks/useSupabase'
import { updateReservationServerAction, syncReservationTablesServerAction, syncReservationMenuItemsServerAction, syncReservationMainMenuItemsServerAction } from '@/lib/supabase/api'
import { X } from 'lucide-react'
import { HallScheme } from '@/components/halls/HallScheme'
import { format } from 'date-fns'
import { getNowInMoscow, formatInMoscow } from '@/lib/date-utils'
import { AddPaymentDialog } from '@/components/payments/AddPaymentDialog'
import { MainMenuSelector } from './MainMenuSelector'

const parseWeight = (w?: string | null) => {
  if (!w) return 0
  const match = w.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : 0
}

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

  // Reset mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  // Используем локальное состояние, если оно есть, иначе проп
  const { data: reservations, refetch: refetchReservations } = useReservations()

  const currentReservation = useMemo(() => {
    if (reservation?.id) {
      const live = reservations.find(r => r.id === reservation.id)
      if (live) return live
    }
    return localReservation || reservation
  }, [reservations, reservation, localReservation])

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
      confirmed: 'inProgress' as const, // Using inProgress variant style for confirmed if no specific one exists
      in_progress: 'inProgress' as const,
      paid: 'paid' as const,
      prepaid: 'paid' as const, // Treat prepaid similarly to paid for badge variant
      canceled: 'canceled' as const,
      completed: 'completed' as const,
      waitlist: 'waitlist' as const,
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
    comments: '',
    menu_type: 'banquet' as 'banquet' | 'main_menu',
    waiter_id: '',
    is_walk_in: false
  })

  // Main Menu State
  const [mainMenuSelections, setMainMenuSelections] = useState<ReservationMainMenuItem[]>([])

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

  // State for change tracking
  const [hasChanges, setHasChanges] = useState(false)
  const [initialStateJson, setInitialStateJson] = useState('')

  // Helper to serialize current form state
  const serializeState = () => {
    return JSON.stringify({
      formData,
      selectedTables: [...selectedTables].sort(),
      selectedSalads: [...selectedSalads].sort(),
      itemOverrides,
      adHocItems,
      mainMenuSelections: mainMenuSelections.map(i => ({ ...i, id: undefined })), // Exclude IDs which might be temp
      newGuestData
    })
  }

  // Update change status
  useEffect(() => {
    // Skip check if still initializing
    if (!initialStateJson) return

    const currentState = serializeState()
    setHasChanges(currentState !== initialStateJson)
  }, [formData, selectedTables, selectedSalads, itemOverrides, adHocItems, mainMenuSelections, newGuestData, initialStateJson])

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
  const { data: layoutItems = [] } = useLayoutItems(formData.hall_id)
  const dayReservations = useMemo(() => {
    if (!formData.date) return []
    return reservations.filter(r =>
      r.date === formData.date &&
      (formData.hall_id ? r.hall_id === formData.hall_id : true)
    )
  }, [reservations, formData.date, formData.hall_id])
  const { data: staff } = useStaff()
  const waiters = useMemo(() => {
    return staff.filter(s => s.role?.name === 'Официант' && s.is_active)
  }, [staff])

  // Вычисление вместимости выбранных столов
  const selectedCapacity = useMemo(() => {
    return tables
      .filter(t => draftTables.includes(t.id))
      .reduce((sum, t) => sum + (t.capacity || 0), 0)
  }, [tables, draftTables])

  // Требуемая вместимость (количество гостей + дети)
  const requiredCapacity = (Number(formData.guests_count) || 0) + (Number(formData.children_count) || 0)

  // Достаточно ли вместимости
  const hasEnoughCapacity = draftTables.length === 0 || selectedCapacity >= requiredCapacity

  // Find matching guest for new guest form
  const matchingGuest = useMemo(() => {
    if (!newGuestData.phone || newGuestData.phone.length < 6) return null
    // Normalize user input for comparison (e.g. matching +7 and 8)
    const normalizedInput = newGuestData.phone.replace(/\D/g, '').replace(/^8/, '7')
    return guests.find(g => {
      const normalizedGuest = g.phone.replace(/\D/g, '').replace(/^8/, '7')
      return normalizedGuest === normalizedInput
    })
  }, [newGuestData.phone, guests])

  // Mutations
  const createReservation = useCreateMutation<Reservation>('reservations')
  const updateReservation = useUpdateMutation<Reservation>('reservations')
  const deleteReservation = useDeleteMutation('reservations')
  const createGuest = useCreateMutation<Guest>('guests')
  const createPayment = useCreateMutation<Payment>('payments')

  // Selected Guest Object
  const selectedGuestObj = useMemo(() => {
    return guests.find(g => g.id === formData.guest_id)
  }, [formData.guest_id, guests])

  const isGuestBlacklisted = selectedGuestObj?.status === 'blacklist'

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
  }, [reservation?.id])

  // Автоматически выбираем первое меню, если menu_id пустой и есть доступные меню
  useEffect(() => {
    if (mode !== 'view' && !formData.menu_id && menus.length > 0) {
      setFormData(prev => ({ ...prev, menu_id: menus[0].id }))
    }
  }, [mode, formData.menu_id, menus])

  // Reset form when modal opens or reservation changes
  useEffect(() => {
    if (!isOpen) {
      setHasChanges(false) // Reset changes on close
      return
    }

    // We use a small timeout to let the modal open animation start smoothly
    const timer = setTimeout(() => {
      // setMode(initialMode) // REMOVED: This was causing the reset bug on background updates

      let newFormData = { ...formData }
      let newSelectedTables: string[] = []
      let newSelectedSalads: string[] = []
      let newItemOverrides: Record<string, Partial<ReservationMenuItem>> = {}
      let newAdHocItems: ReservationMenuItem[] = []
      let newMainMenuSelections: ReservationMainMenuItem[] = []

      if (currentReservation && initialMode !== 'create') {
        newFormData = {
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
          comments: currentReservation.comments || '',
          menu_type: currentReservation.menu_type || 'banquet',
          waiter_id: currentReservation.waiter_id || '',
          is_walk_in: currentReservation.is_walk_in || false
        }

        const initialLinkIds =
          currentReservation.table_ids?.length
            ? currentReservation.table_ids
            : currentReservation.tables?.length
              ? currentReservation.tables.map((t) => t.id)
              : currentReservation.table_id
                ? [currentReservation.table_id]
                : []

        // Composite Table Support: Expand selections to all related segments by number
        const linkedTableObjects = tables.filter(t => initialLinkIds.includes(t.id))
        const linkedNumbers = Array.from(new Set(linkedTableObjects.map(t => t.number)))
        const expandedIds = tables
          .filter(t => linkedNumbers.includes(t.number) || initialLinkIds.includes(t.id))
          .map(t => t.id)

        newSelectedTables = Array.from(new Set([...initialLinkIds, ...expandedIds]))

        // Инициализируем выбранные салаты и переопределения из сохраненных данных
        if (currentReservation.selected_menu_items?.length) {
          const selectedIds = currentReservation.selected_menu_items
            .filter(rmi => rmi.is_selected && rmi.menu_item_id)
            .map(rmi => rmi.menu_item_id as string)
          newSelectedSalads = selectedIds

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
          newItemOverrides = overrides
          newAdHocItems = adHoc
          setWasSaladsInitialized(true)
        } else {
          setWasSaladsInitialized((initialMode as string) !== 'create')
        }

        // Initialize Main Menu Items
        if (currentReservation.menu_type === 'main_menu' && currentReservation.main_menu_items) {
          newMainMenuSelections = currentReservation.main_menu_items
        }
      } else if (initialMode === 'create') {
        // Определяем hall_id
        let hallId = preselectedHallId || ''
        if (!hallId && preselectedTableId) {
          hallId = halls[0]?.id || ''
        }
        if (!hallId) {
          hallId = halls[0]?.id || ''
        }

        newFormData = {
          date: preselectedDate || (initialDate ? formatInMoscow(initialDate, 'yyyy-MM-dd') : formatInMoscow(getNowInMoscow(), 'yyyy-MM-dd')),
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
          comments: '',
          menu_type: 'main_menu',
          waiter_id: '',
          is_walk_in: false
        }

        // Устанавливаем выбранные столы
        if (preselectedTableId) {
          const table = tables.find(t => t.id === preselectedTableId)
          const relatedIds = table
            ? tables.filter(t => t.hall_id === table.hall_id && t.number === table.number).map(t => t.id)
            : [preselectedTableId]

          newSelectedTables = relatedIds
        }
        setWasSaladsInitialized(false)
      }

      setFormData(newFormData)
      setSelectedTables(newSelectedTables)
      setDraftTables(newSelectedTables)
      setSelectedSalads(newSelectedSalads)
      setItemOverrides(newItemOverrides)
      setAdHocItems(newAdHocItems)
      setMainMenuSelections(newMainMenuSelections)

      setShowSchemePicker(false)
      setShowMobileTablePicker(false)
      setShowDesktopTablePicker(false)
      setShowNewGuest(false)
      setNewGuestData({ first_name: '', last_name: '', phone: '' })
      setPrepaymentAmount(0)

      // SNAPSHOT INITIAL STATE
      const initialState = JSON.stringify({
        formData: newFormData,
        selectedTables: [...newSelectedTables].sort(),
        selectedSalads: [...newSelectedSalads].sort(),
        itemOverrides: newItemOverrides,
        adHocItems: newAdHocItems,
        mainMenuSelections: newMainMenuSelections.map(i => ({ ...i, id: undefined })),
        newGuestData: { first_name: '', last_name: '', phone: '' }
      })
      setInitialStateJson(initialState)
      setHasChanges(false)

    }, 0)

    return () => clearTimeout(timer)
  }, [currentReservation, initialMode, isOpen, initialDate, halls, menus, preselectedTableId, preselectedHallId, preselectedDate, tables])

  const statusOptions: ReservationStatus[] = ['new', 'confirmed', 'in_progress', 'paid', 'canceled', 'completed']

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
    if (formData.menu_type === 'main_menu') {
      const itemsTotal = mainMenuSelections.reduce((sum, item) => sum + (item.total_price || 0), 0)
      return itemsTotal
    }

    if (currentMenu && currentMenu.price_per_person != null) {
      const total = currentMenu.price_per_person * formData.guests_count
      return isNaN(total) ? 0 : total
    }

    // Если меню не выбрано, суммируем цены произвольных позиций
    if (adHocItems.length > 0) {
      return adHocItems.reduce((sum, item) => sum + (item.price || 0), 0)
    }

    return formData.total_amount || 0
  }, [currentMenu, formData.guests_count, formData.total_amount, adHocItems, mainMenuSelections, formData.menu_type])

  const occupiedTableMap = useMemo(() => {
    const map = new Map<string, string>()
    dayReservations
      ?.filter(r => r.id !== currentReservation?.id && r.status !== 'canceled' && r.status !== 'completed')
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

  const mainMenuItemsByCategory = useMemo(() => {
    const grouped: Record<string, ReservationMainMenuItem[]> = {}
    mainMenuSelections.forEach(item => {
      const category = item.main_menu_item?.category_name || 'Другое'
      if (!grouped[category]) grouped[category] = []
      grouped[category].push(item)
    })
    return grouped
  }, [mainMenuSelections])

  const handleMobileTableClick = (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (!table) return

    // Composite Table Support: find IDs of all tables with the same number in this hall
    const relatedTableIds = tables
      .filter(t => t.hall_id === table.hall_id && t.number === table.number)
      .map(t => t.id)

    setDraftTables((prev) => {
      const exists = prev.includes(tableId)
      if (exists) {
        // Deselect all related
        return prev.filter((id) => !relatedTableIds.includes(id))
      }
      // Select all related
      return [...prev, ...relatedTableIds.filter(id => !prev.includes(id))]
    })
  }

  const handleStatusChange = (status: ReservationStatus) => {
    setFormData(prev => ({ ...prev, status }))
  }




  const handleDelete = async () => {
    if (currentReservation && confirm('Вы уверены что хотите удалить это бронирование?')) {
      const result = await deleteReservation.mutate(currentReservation.id)
      if (result) {
        onClose() // Close modal immediately
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
        menu_type: formData.menu_type,
        waiter_id: formData.waiter_id || undefined,
        is_walk_in: formData.is_walk_in
      }

      const created = await createReservation.mutate(dataToSave)

      if (created) {
        // 2. Clone tables
        if (selectedTables.length > 0) {
          await syncReservationTablesServerAction(created.id, selectedTables)
        }

        // 3. Clone menu items
        if (formData.menu_type === 'banquet') {
          await syncReservationMenuItemsServerAction(created.id, selectedSalads, itemOverrides, adHocItems)
        } else {
          await syncReservationMainMenuItemsServerAction(created.id, mainMenuSelections.map(item => ({
            ...item,
            reservation_id: created.id
          })))
        }

        alert(`Бронирование успешно скопировано на ${formatDate(duplicateDate)}`)
        onSaveSuccess?.()
        onClose()
      }
    } catch (error) {
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
      const normalizedInput = newGuestData.phone.replace(/\D/g, '').replace(/^8/, '7')
      const existingGuest = guests.find(g => {
        const normalizedGuest = g.phone.replace(/\D/g, '').replace(/^8/, '7')
        return normalizedGuest === normalizedInput
      })

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

    const guestObj = guests.find(g => g.id === guestId)
    if (guestObj?.status === 'blacklist') {
      alert('Данный гость находится в чёрном списке, на него невозможно выполнить бронь')
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
      alert('Неверный формат времени')
      return
    }

    // Validate total amount
    if (isNaN(computedTotal) || computedTotal < 0) {
      alert('Неверная сумма заказа')
      return
    }

    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(formData.hall_id)) {
      alert('Неверный идентификатор зала')
      return
    }
    if (!uuidRegex.test(guestId)) {
      alert('Неверный идентификатор гостя')
      return
    }
    if (formData.menu_id && !uuidRegex.test(formData.menu_id)) {
      alert('Неверный идентификатор меню')
      return
    }


    // Автоматические переходы статусов
    let statusToSave = formData.status

    if (mode === 'create') {
      if (formData.is_walk_in) {
        // Быстрая бронь -> Сразу "За столом"
        statusToSave = 'in_progress'
      }
    } else {
      // Редактирование
      if (currentReservation && currentReservation.status === 'new' && formData.status === 'new') {
        // Если статус был "new" и мы что-то изменяем, переводим в "confirmed" (Взято в работу)
        statusToSave = 'confirmed'
      }
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
          alert('Неверный формат даты')
          return
        }
      }
    } else {
      alert('Выберите дату')
      return
    }

    if (!dateToSave) {
      alert('Ошибка с датой')
      return
    }

    // Prepare time in HH:mm:ss format for database
    const timeFormatted = formatTime(formData.time)
    const timeForDB = timeFormatted.match(/^\d{2}:\d{2}$/) ? `${timeFormatted}:00` : timeFormatted

    // Helper to sanitize UUID fields
    const sanitizeUuid = (val?: string) => {
      if (!val) return null
      if (val === 'none') return null
      if (val.trim() === '') return null
      return val
    }

    const dataToSave = {
      date: dateToSave,
      time: timeForDB,
      hall_id: formData.hall_id,
      table_id: selectedTables.length > 0 ? selectedTables[0] : sanitizeUuid(formData.table_id),
      guest_id: guestId,
      guests_count: Number(formData.guests_count) || 1,
      children_count: Number(formData.children_count) || 0,
      menu_id: sanitizeUuid(formData.menu_id),
      color: formData.color,
      status: statusToSave,
      total_amount: Number(computedTotal),
      prepaid_amount: Number(currentReservation?.prepaid_amount || 0) + (mode === 'create' ? prepaymentAmount : 0),
      comments: formData.comments,
      menu_type: formData.menu_type,
      waiter_id: sanitizeUuid(formData.waiter_id),
      is_walk_in: formData.is_walk_in
    }

    console.log('Saving reservation payload:', dataToSave) // Debug log

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
          const tablesToSync = selectedTables

          const [tablesSyncResult, menuSyncResult] = await Promise.all([
            syncReservationTablesServerAction(created.id, tablesToSync),
            formData.menu_type === 'banquet'
              ? syncReservationMenuItemsServerAction(created.id, selectedSalads, itemOverrides, adHocItems, formData.menu_id)
              : syncReservationMainMenuItemsServerAction(created.id, mainMenuSelections.map(item => ({
                main_menu_item_id: item.main_menu_item_id,
                variant_id: item.variant_id,
                custom_name: item.custom_name,
                quantity: item.quantity,
                weight_grams: item.weight_grams,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes,
                order_index: item.order_index
              })))
          ])

          if (!tablesSyncResult.success) {
            alert(`Ошибка при привязке столов: ${tablesSyncResult.error}`)
          }

          if (!menuSyncResult.success) {
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
            main_menu_items: mainMenuSelections,
            prepaid_amount: dataToSave.prepaid_amount // Ensure prepaid_amount is updated
          } as Reservation;
          setLocalReservation(finalReservation)
          setFormData(prev => ({ ...prev, status: statusToSave }))

          // Update change tracking snapshot
          const newSnapshot = JSON.stringify({
            formData: { ...formData, status: statusToSave },
            selectedTables: [...selectedTables].sort(),
            selectedSalads: [...selectedSalads].sort(),
            itemOverrides,
            adHocItems,
            mainMenuSelections: mainMenuSelections.map(i => ({ ...i, id: undefined })),
            newGuestData: { first_name: '', last_name: '', phone: '' }
          })
          setInitialStateJson(newSnapshot)

          notifyDataChange('reservations')
          onSaveSuccess?.(finalReservation)
        }
      } catch (error) {
        alert('Ошибка при создании бронирования: ' + (error as any)?.message);
      }
    } else if (currentReservation) {
      try {
        const updateResult = await updateReservationServerAction(currentReservation.id, dataToSave as any)

        if (!updateResult.success) {
          alert('Ошибка сохранения: ' + ((updateResult.error as any)?.message || 'Неизвестная ошибка'))
          return
        }

        const result = updateResult.data
        if (result) {
          const tablesToSync = selectedTables

          const [tablesSyncResult, menuSyncResult] = await Promise.all([
            syncReservationTablesServerAction(currentReservation.id, tablesToSync),
            formData.menu_type === 'banquet'
              ? syncReservationMenuItemsServerAction(currentReservation.id, selectedSalads, itemOverrides, adHocItems, formData.menu_id)
              : syncReservationMainMenuItemsServerAction(currentReservation.id, mainMenuSelections.map(item => ({
                main_menu_item_id: item.main_menu_item_id,
                variant_id: item.variant_id,
                custom_name: item.custom_name,
                quantity: item.quantity,
                weight_grams: item.weight_grams,
                unit_price: item.unit_price,
                total_price: item.total_price,
                notes: item.notes,
                order_index: item.order_index
              })))
          ])

          if (!tablesSyncResult.success) {
            alert(`Ошибка при привязке столов: ${tablesSyncResult.error}`)
          }

          if (!menuSyncResult.success) {
            alert(`Ошибка при сохранении меню: ${menuSyncResult.error}`)
          }

          finalReservation = {
            ...currentReservation,
            ...(dataToSave as any),
            status: statusToSave,
            tables: tables.filter(t => selectedTables.includes(t.id)),
            table_ids: selectedTables,
            selected_menu_items: buildSelectedMenuItems(currentReservation.id),
            main_menu_items: mainMenuSelections
          } as Reservation;
          setLocalReservation(finalReservation)
          setFormData(prev => ({ ...prev, status: statusToSave }))

          // Update change tracking snapshot
          const newSnapshot = JSON.stringify({
            formData: { ...formData, status: statusToSave },
            selectedTables: [...selectedTables].sort(),
            selectedSalads: [...selectedSalads].sort(),
            itemOverrides,
            adHocItems,
            mainMenuSelections: mainMenuSelections.map(i => ({ ...i, id: undefined })),
            newGuestData: { first_name: '', last_name: '', phone: '' }
          })
          setInitialStateJson(newSnapshot)

          notifyDataChange('reservations')
          onSaveSuccess?.(finalReservation)
        }
      } catch (error) {
        alert('Ошибка при сохранении изменений: ' + (error as any)?.message);
      }
    }
  }


  const isLoading = createReservation.loading || updateReservation.loading || deleteReservation.loading || createGuest.loading || createPayment.loading

  // Десктопное модальное окно для выбора столов
  if (showDesktopTablePicker && !isMobile) {
    return (
      <Dialog open={showDesktopTablePicker} onOpenChange={() => setShowDesktopTablePicker(false)}>
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[70vw] max-h-[95vh] h-[95vh] sm:max-h-[80vh] sm:h-[80vh] p-0 flex flex-col overflow-hidden">
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <DialogTitle className="text-xl font-semibold">Выбор столов</DialogTitle>
              <DialogDescription className="sr-only">
                Выберите подходящие столы для бронирования на схеме зала
              </DialogDescription>
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
                      (№{Array.from(new Set(tables.filter(t => draftTables.includes(t.id)).map(t => t.number))).join(', ')})
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
          <DialogTitle className="sr-only">Схема зала (мобильная)</DialogTitle>
          <DialogDescription className="sr-only">
            Мобильный интерфейс выбора столов
          </DialogDescription>
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
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-7xl sm:max-w-none max-h-[95vh] p-0 overflow-hidden",
          "w-[95vw] sm:w-[92vw] lg:w-[90vw]",
          "mx-auto rounded-3xl border-stone-200",
          mode !== 'view' && "pb-0"
        )}
      >
        <DialogHeader className="p-4 pb-2 border-b border-stone-50">
          {/* Compact Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              {/* Кнопка "Назад" для мобильных - теперь инлайн */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 px-0 text-stone-500 lg:hidden shrink-0"
              >
                ←
              </Button>
              <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                <DialogTitle className="text-sm sm:text-base font-black text-stone-900 uppercase tracking-tight truncate">
                  {mode === 'create' ? 'Новая' : 'Бронь'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Детальное управление бронированием, гостем и платежами.
                </DialogDescription>
                {currentReservation && (
                  <Badge variant={getStatusVariant(currentReservation?.status || formData.status)} className="text-[8px] sm:text-[9px] h-4 sm:h-5 font-black uppercase pt-0.5 shrink-0">
                    {RESERVATION_STATUS_CONFIG[currentReservation?.status || formData.status].label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              {reservation && mode !== 'create' && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 h-9 text-stone-600 hover:text-amber-600 hover:border-amber-200 hidden sm:flex"
                      onClick={() => setDuplicateDate(formData.date)}
                    >
                      <Copy className="h-4 w-4" />
                      <span className="text-sm">Копия</span>
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
                  className="gap-2 h-9 border-stone-200 hover:bg-stone-50 hidden sm:flex"
                  title="Распечатать карточку"
                >
                  <Printer className="h-4 w-4" />
                  <span className="text-sm">Печать</span>
                </Button>
              )}

              {mode === 'view' && reservation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('edit')}
                  className="gap-1 sm:gap-2 h-8 sm:h-9 hidden sm:flex"
                >
                  <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="inline text-xs sm:text-sm">Изм.</span>
                </Button>
              )}

              {reservation && mode === 'view' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="text-stone-400 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex"
                >
                  {deleteReservation.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}

              {/* Mobile Actions Dropdown */}
              {reservation && mode === 'view' && (
                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-400">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setMode('edit')} className="gap-2">
                        <Settings className="h-4 w-4" /> Изменить
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`/reservations/${reservation.id}/print`, '_blank')} className="gap-2">
                        <Printer className="h-4 w-4" /> Печать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setDuplicateDate(formData.date)} className="gap-2">
                        <Copy className="h-4 w-4" /> Копировать
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-700 gap-2">
                        <Trash2 className="h-4 w-4" /> Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* Custom Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 sm:h-9 sm:w-9 text-stone-400 hover:bg-stone-50 rounded-full ml-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>


        <ScrollArea className={cn(
          "flex-1 w-full",
          mode === 'view' ? "h-[calc(90vh-80px)]" : "h-[calc(90vh-160px)]",
        )}>
          <div className="p-4 sm:p-6 lg:p-8 pb-32 sm:pb-40">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8 items-start">
              {/* Left Column: Core Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status Selection - Moved to sidebar */}
                {mode !== 'view' && (
                  <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <Label className="text-xs font-bold text-stone-500 uppercase tracking-widest pl-1">Статус бронирования</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {statusOptions.filter(s => s !== 'prepaid').map((status) => {
                        const config = RESERVATION_STATUS_CONFIG[status]
                        const isSelected = formData.status === status
                        return (
                          <motion.button
                            key={status}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleStatusChange(status)}
                            className={cn(
                              "px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold border-2 transition-all text-center leading-tight",
                              isSelected ? "shadow-md ring-2 ring-offset-1 ring-amber-100" : "opacity-60 hover:opacity-100 grayscale-[0.5]"
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

                {/* Guest Information Card */}
                <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-50 pb-3 sm:pb-4">
                    <h3 className="font-black text-stone-900 flex items-center gap-2 sm:gap-3 text-sm sm:text-base">
                      <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg sm:rounded-xl">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                      </div>
                      Гость
                    </h3>
                    {mode !== 'view' && !showNewGuest && (
                      <Button variant="ghost" size="sm" onClick={() => setShowNewGuest(true)} className="text-amber-600 font-bold text-[10px] h-7 sm:h-8 px-2 sm:px-3">
                        <Plus className="h-3.5 w-3.5 mr-0.5 sm:mr-1" />
                        <span className="hidden sm:inline">Новый</span>
                        <span className="sm:hidden uppercase">Новый</span>
                      </Button>
                    )}
                  </div>

                  {mode === 'view' ? (
                    <div className="space-y-3 sm:space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:gap-4">
                        <div className="bg-stone-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                          <Label className="text-[9px] sm:text-[10px] text-stone-400 font-black uppercase tracking-widest pl-1 mb-1 block">ФИО Гостя</Label>
                          <p className="font-black text-stone-900 text-base sm:text-lg leading-tight">
                            {currentReservation?.guest?.last_name} {currentReservation?.guest?.first_name}
                          </p>
                          <p className="text-stone-500 font-medium text-xs sm:text-sm mt-0.5 sm:mt-1">
                            {currentReservation?.guest?.middle_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 sm:gap-4 bg-stone-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl">
                          <div className="p-1.5 sm:p-2 bg-white rounded-lg sm:rounded-xl shadow-sm">
                            <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-stone-400" />
                          </div>
                          <div>
                            <Label className="text-[9px] sm:text-[10px] text-stone-400 font-black uppercase tracking-widest block mb-0.5">Телефон</Label>
                            <p className="font-bold text-stone-900 text-sm sm:text-base">{currentReservation?.guest?.phone}</p>
                          </div>
                        </div>
                      </div>
                      {currentReservation?.guest?.notes && (
                        <div className="p-3 sm:p-4 bg-amber-50/50 border border-amber-100 rounded-xl sm:rounded-2xl">
                          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                            <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                            <span className="text-[9px] sm:text-[10px] font-black text-amber-700 uppercase tracking-widest">Заметки о госте</span>
                          </div>
                          <p className="text-xs sm:text-sm text-stone-700 font-medium italic leading-relaxed">{currentReservation.guest.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {!showNewGuest ? (
                        <>
                          <GuestCombobox
                            guests={guests}
                            value={formData.guest_id}
                            onChange={(v) => setFormData({ ...formData, guest_id: v })}
                          />
                          {isGuestBlacklisted && (
                            <div className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl flex items-center gap-3 text-red-800 animate-pulse">
                              <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
                              <p className="text-sm font-black uppercase tracking-tight">В чёрном списке!</p>
                            </div>
                          )}
                          {selectedGuestObj?.notes && (
                            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="h-4 w-4 text-stone-400" />
                                <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Информация</span>
                              </div>
                              <p className="text-sm text-stone-700 font-medium italic">{selectedGuestObj.notes}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-4 p-5 rounded-3xl bg-stone-50/50 border border-stone-100 shadow-inner">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Фамилия *</Label>
                              <Input
                                placeholder="Петров"
                                value={newGuestData.last_name}
                                onChange={(e) => setNewGuestData({ ...newGuestData, last_name: e.target.value })}
                                className="bg-white rounded-xl border-stone-200 h-11 px-4 font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Имя *</Label>
                              <Input
                                placeholder="Иван"
                                value={newGuestData.first_name}
                                onChange={(e) => setNewGuestData({ ...newGuestData, first_name: e.target.value })}
                                className="bg-white rounded-xl border-stone-200 h-11 px-4 font-bold"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Телефон *</Label>
                            <Input
                              placeholder="+7 (___) ___ - __ - __"
                              value={newGuestData.phone}
                              onChange={(e) => {
                                let val = e.target.value
                                if (val === '9') val = '+79'
                                if (val === '8') val = '+7'
                                setNewGuestData({ ...newGuestData, phone: val })
                              }}
                              className={cn("bg-white rounded-xl border-stone-200 h-11 px-4 font-bold", matchingGuest && "border-amber-400 ring-2 ring-amber-100")}
                            />
                            {matchingGuest && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={cn(
                                  "mt-3 p-4 border-2 rounded-2xl flex items-center justify-between shadow-sm",
                                  matchingGuest.status === 'blacklist' ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                                )}
                              >
                                <div className="text-xs">
                                  <p className={cn("font-black mb-1", matchingGuest.status === 'blacklist' ? "text-red-900" : "text-amber-900")}>
                                    {matchingGuest.status === 'blacklist' ? "ГОСТЬ В ЧЁРНОМ СПИСКЕ" : "НАЙДЕН В БАЗЕ"}
                                  </p>
                                  <p className="font-bold text-stone-800">
                                    {matchingGuest.last_name} {matchingGuest.first_name}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant={matchingGuest.status === 'blacklist' ? "destructive" : "default"}
                                  className={cn("h-8 px-4 font-black text-[10px]", matchingGuest.status === 'blacklist' ? "" : "bg-amber-600 hover:bg-amber-700")}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, guest_id: matchingGuest.id }))
                                    setShowNewGuest(false)
                                    setNewGuestData({ first_name: '', last_name: '', phone: '' })
                                  }}
                                >
                                  ВЫБРАТЬ
                                </Button>
                              </motion.div>
                            )}
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => setShowNewGuest(false)} className="w-full text-stone-400 font-bold hover:text-stone-600">
                            Вернуться к списку
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Waiter and Walk-in (New Section) */}
                <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-4">
                  <h3 className="font-black text-stone-900 flex items-center gap-2 sm:gap-3 text-sm sm:text-base border-b border-stone-50 pb-3 sm:pb-4">
                    <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg sm:rounded-xl">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    </div>
                    Обслуживание
                  </h3>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-2xl border border-stone-100">
                      <div className="space-y-0.5">
                        <Label className="font-bold text-stone-900 text-sm">Гость без брони</Label>
                        <p className="text-[10px] text-stone-500 font-medium">Гость пришел по факту в день</p>
                      </div>
                      {mode === 'view' ? (
                        <Badge variant={formData.is_walk_in ? 'paid' : 'outline'}>
                          {formData.is_walk_in ? 'Да' : 'Нет'}
                        </Badge>
                      ) : (
                        <Checkbox
                          checked={formData.is_walk_in}
                          onCheckedChange={(checked) => setFormData({ ...formData, is_walk_in: !!checked })}
                          className="h-6 w-6 rounded-lg data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Официант</Label>
                      {mode === 'view' ? (
                        <div className="h-11 flex items-center bg-stone-50 rounded-xl px-4 font-bold text-stone-900 text-sm border border-stone-100">
                          {waiters.find(w => w.id === formData.waiter_id)?.name || 'Не назначен'}
                        </div>
                      ) : (
                        <Select
                          value={formData.waiter_id}
                          onValueChange={(v) => setFormData({ ...formData, waiter_id: v })}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-stone-200 font-bold bg-white text-sm">
                            <SelectValue placeholder="Выберите официанта" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="font-medium text-stone-400">Не назначен</SelectItem>
                            {waiters.map(waiter => (
                              <SelectItem key={waiter.id} value={waiter.id} className="font-medium">
                                {waiter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reservation Details Card (Previous content continues) */}
                <div className="bg-white border border-stone-200 rounded-3xl p-3.5 sm:p-6 shadow-sm space-y-4 sm:space-y-6">
                  <h3 className="font-black text-stone-900 flex items-center gap-2 sm:gap-3 text-sm sm:text-base border-b border-stone-50 pb-3 sm:pb-4">
                    <div className="p-1.5 sm:p-2 bg-amber-50 rounded-lg sm:rounded-xl">
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                    </div>
                    Условия бронирования
                  </h3>

                  <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-4 sm:gap-y-6">
                    {/* Date */}
                    <div>
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 sm:mb-1.5 block px-1">Дата</Label>
                      {mode === 'view' ? (
                        <div className="h-10 sm:h-12 flex items-center bg-stone-50 rounded-xl px-3 sm:px-4 font-bold text-stone-900 text-sm sm:text-base border border-stone-100 italic">
                          {formatDate(formData.date)}
                        </div>
                      ) : (
                        <DateTimePicker
                          value={formData.date}
                          onChange={(date) => setFormData({ ...formData, date })}
                          dateOnly={true}
                        />
                      )}
                    </div>

                    {/* Time */}
                    <div>
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 sm:mb-1.5 block px-1">Время</Label>
                      {mode === 'view' ? (
                        <div className="h-10 sm:h-12 flex items-center bg-stone-50 rounded-xl px-3 sm:px-4 font-bold text-stone-900 text-sm sm:text-base border border-stone-100 italic">
                          {formatTime(formData.time)}
                        </div>
                      ) : (
                        <TimeWheelPicker
                          value={formData.time}
                          onChange={(time) => setFormData({ ...formData, time })}
                          className="h-10 sm:h-12"
                        />
                      )}
                    </div>

                    {/* Hall */}
                    <div className="col-span-2">
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 sm:mb-1.5 block px-1">Зал и локация</Label>
                      {mode === 'view' ? (
                        <div className="h-10 sm:h-12 flex items-center bg-stone-50 rounded-xl px-3 sm:px-4 font-bold text-stone-900 text-sm sm:text-base border border-stone-100 italic">
                          <MapPin className="h-4 w-4 text-stone-400 mr-2" />
                          {halls.find(h => h.id === formData.hall_id)?.name}
                        </div>
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
                          <SelectTrigger className="h-10 sm:h-12 rounded-xl border-stone-200 font-bold bg-white text-sm">
                            <SelectValue placeholder="Выберите зал" />
                          </SelectTrigger>
                          <SelectContent>
                            {halls.map(hall => (
                              <SelectItem key={hall.id} value={hall.id} className="font-medium">
                                {hall.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Tables */}
                    <div className="col-span-2">
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 sm:mb-1.5 block px-1">Столы</Label>
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex-1 min-h-[2.5rem] sm:min-h-[3rem] py-2 sm:py-3 flex flex-wrap items-center gap-1.5 sm:gap-2 bg-stone-50 rounded-xl px-3 sm:px-4 border border-stone-100 italic">
                          {mode === 'view' ? (
                            currentReservation?.tables?.length ? (
                              currentReservation.tables.map(t => (
                                <Badge key={t.id} variant="secondary" className="bg-white h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs">
                                  Стол {t.number}
                                </Badge>
                              ))
                            ) : <span className="text-stone-400 text-xs sm:text-sm font-medium">Не закреплены</span>
                          ) : (
                            selectedTables.length > 0 ? (
                              tables.filter(t => selectedTables.includes(t.id)).map(t => (
                                <Badge key={t.id} variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200 font-bold h-6 sm:h-7 px-2 sm:px-3 text-[10px] sm:text-xs">
                                  Стол {t.number}
                                </Badge>
                              ))
                            ) : <span className="text-stone-400 text-xs sm:text-sm font-medium">Выберите на схеме</span>
                          )}
                        </div>
                        {mode !== 'view' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => isMobile ? setShowMobileTablePicker(true) : setShowDesktopTablePicker(true)}
                            className="h-10 sm:h-12 rounded-xl px-3 sm:px-4 border-amber-200 font-black text-[10px] text-amber-700 hover:bg-amber-50"
                          >
                            СХЕМА
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Guest counts */}
                    <div>
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 sm:mb-1.5 block px-1">Взрослых</Label>
                      {mode === 'view' ? (
                        <div className="h-10 sm:h-12 flex items-center justify-center bg-stone-50 rounded-xl font-black text-lg text-stone-900 border border-stone-100 italic">
                          {formData.guests_count}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={formData.guests_count || ''}
                          onChange={(e) => setFormData({ ...formData, guests_count: parseInt(e.target.value) || 0 })}
                          className="h-10 sm:h-12 rounded-xl text-center font-black text-lg bg-stone-50 border-stone-100"
                        />
                      )}
                    </div>
                    <div>
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1 sm:mb-1.5 block px-1">Детей</Label>
                      {mode === 'view' ? (
                        <div className="h-10 sm:h-12 flex items-center justify-center bg-stone-50 rounded-xl font-black text-lg text-stone-900 border border-stone-100 italic">
                          {formData.children_count || 0}
                        </div>
                      ) : (
                        <Input
                          type="number"
                          min={0}
                          value={formData.children_count || ''}
                          onChange={(e) => setFormData({ ...formData, children_count: parseInt(e.target.value) || 0 })}
                          className="h-10 sm:h-12 rounded-xl text-center font-black text-lg bg-stone-50 border-stone-100"
                        />
                      )}
                    </div>

                    {/* Color Preset Selector */}
                    <div className="col-span-2 pt-2">
                      <Label className="text-[9px] sm:text-[10px] font-black text-stone-400 uppercase tracking-widest mb-3 block px-1">Цветовая метка</Label>
                      <div className="flex flex-wrap gap-2 sm:gap-3.5 px-0.5 py-1">
                        {COLOR_PRESETS.map((c) => (
                          <button
                            key={c}
                            disabled={mode === 'view'}
                            type="button"
                            className={cn(
                              "w-6 h-6 sm:w-8 sm:h-8 rounded-full transition-all relative ring-offset-2 ring-offset-white",
                              formData.color === c ? "scale-110 ring-2 ring-stone-300" : "hover:scale-105 opacity-80"
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => setFormData({ ...formData, color: c })}
                          >
                            {formData.color === c && (
                              <div className="absolute inset-[-4px] rounded-full border-2 border-stone-200 scale-110" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Comments Card - Moved to left column conditionally for Banquets */}
                {formData.menu_type === 'banquet' && (currentReservation?.comments || mode !== 'view') && (
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
                    <h3 className="font-black text-stone-900 flex items-center gap-3 text-base border-b border-stone-50 pb-4">
                      <div className="p-2 bg-stone-50 rounded-xl">
                        <MessageSquare className="h-5 w-5 text-stone-500" />
                      </div>
                      Комментарии
                    </h3>
                    <div>
                      {mode === 'view' ? (
                        <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 italic text-sm text-stone-600 leading-relaxed font-medium">
                          {currentReservation?.comments || 'Комментарии отсуствуют'}
                        </div>
                      ) : (
                        <Textarea
                          placeholder="Важные детали заказа, пожелания гостя..."
                          value={formData.comments}
                          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                          className="min-h-[100px] rounded-2xl border-stone-200 focus:ring-amber-500 font-medium text-sm p-4 bg-stone-50/30"
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Menu & Billing */}
              <div className="lg:col-span-3 space-y-6">
                {/* Menu Section Card */}
                <div className="bg-white border border-stone-200 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5 sm:space-y-6">
                  <h3 className="font-black text-stone-900 flex items-center gap-3 text-base border-b border-stone-50 pb-4">
                    <div className="p-2 bg-amber-50 rounded-xl">
                      <ChefHat className="h-5 w-5 text-amber-600" />
                    </div>
                    Состав заказа
                  </h3>

                  {/* Menu Type Switcher */}
                  {mode !== 'view' && (
                    <div className="flex p-1.5 bg-stone-100 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, menu_type: 'main_menu' })}
                        className={cn(
                          "flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                          formData.menu_type === 'main_menu'
                            ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200"
                            : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        Основное
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, menu_type: 'banquet' })}
                        className={cn(
                          "flex-1 py-2.5 px-4 text-xs font-black rounded-xl transition-all uppercase tracking-widest",
                          formData.menu_type === 'banquet'
                            ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200"
                            : "text-stone-400 hover:text-stone-600"
                        )}
                      >
                        Банкетное
                      </button>
                    </div>
                  )}

                  {/* BANQUET MENU MODE */}
                  {formData.menu_type === 'banquet' && (
                    <div className="space-y-4">
                      <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 shadow-sm">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex-1">
                            {currentMenu ? (
                              <>
                                <p className="font-black text-amber-900 text-lg">{currentMenu.name}</p>
                                <p className="text-sm text-amber-600 font-bold uppercase tracking-tight">
                                  {formatCurrency(currentMenu.price_per_person)} / ЧЕЛОВЕК
                                </p>
                              </>
                            ) : (
                              <p className="font-black text-amber-900">Меню не выбрано</p>
                            )}
                          </div>
                          {mode !== 'view' && (
                            <Select
                              value={formData.menu_id}
                              onValueChange={(v) => {
                                if (v !== formData.menu_id) {
                                  setFormData({ ...formData, menu_id: v })
                                  setSelectedSalads([])
                                  setItemOverrides({})
                                }
                              }}
                            >
                              <SelectTrigger className="w-full sm:w-[200px] h-11 rounded-xl bg-white border-amber-200 font-black text-xs uppercase text-amber-900">
                                <SelectValue placeholder="ВЫБРАТЬ МЕНЮ" />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl shadow-xl border-stone-200">
                                {menus.map(menu => (
                                  <SelectItem key={menu.id} value={menu.id} className="font-bold py-3">
                                    {menu.name} ({formatCurrency(menu.price_per_person)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Menu Items List */}
                      {(currentMenu || adHocItems.length > 0) && (
                        <div className="space-y-4">
                          {(Object.keys(menuItemsByType) as string[]).map((type) => {
                            const items = menuItemsByType[type]
                            if (!items?.length) return null

                            const typeLabelPlural = getMenuItemTypeLabel(type as MenuItemType, customTypes, true)
                            return (
                              <div key={type} className="space-y-2">
                                <div className="flex items-center justify-between gap-4 px-1">
                                  <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">{typeLabelPlural}</h4>
                                  {formData.guests_count > 0 && (
                                    <span className="text-[9px] font-black text-amber-700 uppercase italic whitespace-nowrap shrink-0">
                                      {calculatePlates(formData.guests_count)} ТАР.
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1.5">
                                  {items.map((item, idx) => {
                                    const isAdHoc = !('menu_id' in item)
                                    const itemId = isAdHoc ? (item as ReservationMenuItem).id : (item as MenuItem).id
                                    const isSelectable = !isAdHoc && (item as MenuItem).is_selectable

                                    let isSelected: boolean
                                    if (isAdHoc || !isSelectable) {
                                      isSelected = true
                                    } else if (showMenuEdit) {
                                      isSelected = selectedSalads.includes(itemId)
                                    } else if (mode === 'view' && currentReservation?.selected_menu_items?.length) {
                                      isSelected = currentReservation.selected_menu_items.some(rmi => rmi.menu_item_id === itemId && rmi.is_selected)
                                    } else {
                                      isSelected = selectedSalads.includes(itemId) || (selectedSalads.length === 0 && idx < ((item as MenuItem).max_selections || items.length))
                                    }

                                    if (!isSelected && mode === 'view' && !showMenuEdit) return null

                                    const displayWeight = isAdHoc
                                      ? (item as ReservationMenuItem).weight_per_person
                                      : (itemOverrides[itemId]?.weight_per_person ?? (item as MenuItem).weight_per_person)
                                    const displayName = isAdHoc
                                      ? (item as ReservationMenuItem).name
                                      : (itemOverrides[itemId]?.name ?? (item as MenuItem).name)

                                    return (
                                      <div key={isAdHoc ? `adhoc-${itemId}-${idx}` : itemId} className={cn(
                                        "px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 rounded-2xl bg-stone-50 transition-all",
                                        !isSelected && "opacity-40 grayscale"
                                      )}>
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                          {isSelectable && showMenuEdit && (
                                            <Checkbox
                                              checked={isSelected}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  if (!selectedSalads.includes(itemId)) setSelectedSalads([...selectedSalads, itemId])
                                                } else {
                                                  setSelectedSalads(selectedSalads.filter(id => id !== itemId))
                                                }
                                              }}
                                              className="h-5 w-5 rounded-md border-stone-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                                            />
                                          )}
                                          <div className="flex-1">
                                            {showMenuEdit && mode !== 'view' ? (
                                              <Input
                                                className="h-9 font-bold bg-white text-sm rounded-lg"
                                                value={displayName ?? ''}
                                                onChange={(e) => {
                                                  if (isAdHoc) {
                                                    const newAdHoc = [...adHocItems]
                                                    const adItem = newAdHoc.find(ai => ai.id === itemId)
                                                    if (adItem) adItem.name = e.target.value
                                                    setAdHocItems(newAdHoc)
                                                  } else {
                                                    setItemOverrides({ ...itemOverrides, [itemId]: { ...itemOverrides[itemId], name: e.target.value } })
                                                  }
                                                }}
                                              />
                                            ) : (
                                              <p className="font-bold text-stone-800 text-sm leading-tight">{displayName}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                                          <div className="flex flex-col items-end gap-0.5">
                                            <div className="bg-white px-1.5 sm:px-2 py-0.5 rounded-lg border border-stone-100 text-[9px] sm:text-[10px] font-black text-stone-400 uppercase leading-none">
                                              {displayWeight}г
                                            </div>
                                          </div>
                                          {isAdHoc && showMenuEdit && mode !== 'view' && (
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-stone-300 hover:text-red-500 rounded-full" onClick={() => setAdHocItems(adHocItems.filter(ai => ai.id !== itemId))}>
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {mode !== 'view' && currentMenu && (
                        <div className="pt-2">
                          <Button variant="outline" size="sm" onClick={handleToggleMenuEdit} className="w-full h-11 rounded-xl border-stone-200 font-bold text-stone-500 hover:bg-stone-50 hover:text-amber-600">
                            <Settings className="h-4 w-4 mr-2" />
                            {showMenuEdit ? 'ЗАВЕРШИТЬ РЕДАКТИРОВАНИЕ' : 'НАСТРОИТЬ ПОЗИЦИИ'}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* MAIN MENU MODE */}
                  {formData.menu_type === 'main_menu' && (
                    <div className="space-y-6">
                      {mode !== 'view' && (
                        <MainMenuSelector
                          onSelectItem={(item, variant) => {
                            const unitWeight = variant
                              ? (variant.weight_grams || parseWeight(variant.weight) || 0)
                              : (item.weight_grams || parseWeight(item.weight) || 0)
                            const newItem: ReservationMainMenuItem = {
                              id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                              reservation_id: currentReservation?.id || '',
                              main_menu_item_id: item.id,
                              main_menu_item: item,
                              variant_id: variant?.id,
                              variant: variant,
                              quantity: 1,
                              weight_grams: unitWeight,
                              unit_price: variant ? (variant.price || 0) : (item.price || 0),
                              total_price: variant ? (variant.price || 0) : (item.price || 0),
                              order_index: mainMenuSelections.length
                            }

                            const existingIndex = mainMenuSelections.findIndex(
                              s => s.main_menu_item_id === item.id && s.variant_id === variant?.id
                            )

                            if (existingIndex >= 0) {
                              const updated = [...mainMenuSelections]
                              updated[existingIndex].quantity += 1
                              const unitW = updated[existingIndex].variant
                                ? (updated[existingIndex].variant?.weight_grams || parseWeight(updated[existingIndex].variant?.weight) || 0)
                                : (updated[existingIndex].main_menu_item?.weight_grams || parseWeight(updated[existingIndex].main_menu_item?.weight) || 0)
                              updated[existingIndex].weight_grams = updated[existingIndex].quantity * unitW
                              updated[existingIndex].total_price = updated[existingIndex].quantity * updated[existingIndex].unit_price
                              setMainMenuSelections(updated)
                            } else {
                              setMainMenuSelections([...mainMenuSelections, newItem])
                            }
                          }}
                        />
                      )}

                      <div className="space-y-5">
                        {Object.entries(mainMenuItemsByCategory).map(([category, items]) => (
                          <div key={category} className="space-y-3">
                            <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] px-1">{category}</h4>
                            <div className="space-y-2">
                              {items.map((item) => {
                                const idx = mainMenuSelections.findIndex(s => s.id === item.id)
                                return (
                                  <div key={item.id} className="flex flex-col sm:flex-row justify-between sm:items-center bg-stone-50 p-2.5 sm:p-4 rounded-2xl border border-stone-100 hover:border-amber-100 transition-colors gap-2.5 sm:gap-4">
                                    <div className="flex-1 min-w-0">
                                      <p className="font-black text-stone-900 text-xs sm:text-sm leading-tight mb-1">
                                        {item.main_menu_item?.name}
                                        {item.variant && <span className="text-amber-600 font-bold ml-1">({item.variant.name})</span>}
                                      </p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] sm:text-[10px] font-bold text-stone-400 uppercase tracking-tight">
                                          {item.weight_grams || (item.variant ? parseWeight(item.variant.weight) : parseWeight(item.main_menu_item?.weight)) || 0}г
                                        </span>
                                        <span className="h-0.5 w-0.5 sm:h-1 sm:w-1 bg-stone-300 rounded-full" />
                                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-700 uppercase tracking-tight">{formatCurrency(item.unit_price)}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100/50">
                                      {mode !== 'view' && (
                                        <div className="flex items-center bg-white border border-stone-200 rounded-xl overflow-hidden shadow-sm h-8 sm:h-10">
                                          <button
                                            type="button"
                                            className="w-8 sm:w-9 h-full flex items-center justify-center text-stone-400 hover:bg-stone-50 transition-colors font-black text-sm"
                                            onClick={() => {
                                              const updated = [...mainMenuSelections]
                                              if (updated[idx].quantity > 1) {
                                                updated[idx].quantity -= 1
                                                const unitW = updated[idx].variant
                                                  ? (updated[idx].variant?.weight_grams || parseWeight(updated[idx].variant?.weight) || 0)
                                                  : (updated[idx].main_menu_item?.weight_grams || parseWeight(updated[idx].main_menu_item?.weight) || 0)
                                                updated[idx].weight_grams = updated[idx].quantity * unitW
                                                updated[idx].total_price = updated[idx].quantity * updated[idx].unit_price
                                                setMainMenuSelections(updated)
                                              } else {
                                                setMainMenuSelections(mainMenuSelections.filter((_, i) => i !== idx))
                                              }
                                            }}
                                          >
                                            -
                                          </button>
                                          <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-black text-stone-900">{item.quantity}</span>
                                          <button
                                            type="button"
                                            className="w-8 sm:w-9 h-full flex items-center justify-center text-stone-400 hover:bg-stone-50 transition-colors font-black text-sm"
                                            onClick={() => {
                                              const updated = [...mainMenuSelections]
                                              updated[idx].quantity += 1
                                              const unitW = updated[idx].variant
                                                ? (updated[idx].variant?.weight_grams || parseWeight(updated[idx].variant?.weight) || 0)
                                                : (updated[idx].main_menu_item?.weight_grams || parseWeight(updated[idx].main_menu_item?.weight) || 0)
                                              updated[idx].weight_grams = updated[idx].quantity * unitW
                                              updated[idx].total_price = updated[idx].quantity * updated[idx].unit_price
                                              setMainMenuSelections(updated)
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                      <div className="text-right min-w-[60px] sm:min-w-[80px]">
                                        <p className="font-black text-stone-900 text-xs sm:text-sm">{formatCurrency(item.total_price)}</p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                        {mainMenuSelections.length === 0 && (
                          <div className="text-center py-12 rounded-3xl bg-stone-50 border-2 border-dashed border-stone-100 group">
                            <div className="bg-white h-16 w-16 rounded-full flex items-center justify-center mx-auto shadow-sm mb-4 border border-stone-100 group-hover:scale-110 transition-transform">
                              <ChefHat className="h-8 w-8 text-stone-300" />
                            </div>
                            <p className="font-black text-stone-400 uppercase tracking-widest text-[10px]">Меню не заполнено</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Payments Card */}
                {currentReservation?.payments && currentReservation.payments.length > 0 && (
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
                    <h3 className="font-black text-stone-900 flex items-center gap-3 text-base border-b border-stone-50 pb-4">
                      <div className="p-2 bg-emerald-50 rounded-xl">
                        <CreditCard className="h-5 w-5 text-emerald-600" />
                      </div>
                      История оплат
                    </h3>
                    <div className="space-y-2">
                      {currentReservation.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-black text-emerald-900 text-lg leading-none">
                                {formatCurrency(payment.amount)}
                              </p>
                              <Badge variant="outline" className="bg-white text-[9px] font-black border-emerald-100 text-emerald-600 uppercase h-5 px-1.5 pt-0.5">
                                {payment.payment_method === 'cash' ? 'Наличные' : payment.payment_method === 'card' ? 'Картой' : 'Перевод'}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-tight opacity-70">
                              {formatDate(payment.payment_date)}
                            </p>
                          </div>
                          {payment.notes && (
                            <div className="max-w-[150px] text-right">
                              <p className="text-[10px] font-medium text-emerald-600 italic line-clamp-1">"{payment.notes}"</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}


                {/* Comments Card - Shown on right for Main Menu */}
                {formData.menu_type === 'main_menu' && (currentReservation?.comments || mode !== 'view') && (
                  <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
                    <h3 className="font-black text-stone-900 flex items-center gap-3 text-base border-b border-stone-50 pb-4">
                      <div className="p-2 bg-stone-50 rounded-xl">
                        <MessageSquare className="h-5 w-5 text-stone-500" />
                      </div>
                      Комментарии
                    </h3>
                    <div>
                      {mode === 'view' ? (
                        <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100 italic text-sm text-stone-600 leading-relaxed font-medium">
                          {currentReservation?.comments || 'Комментарии отсуствуют'}
                        </div>
                      ) : (
                        <Textarea
                          placeholder="Важные детали заказа, пожелания гостя..."
                          value={formData.comments}
                          onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                          className="min-h-[100px] rounded-2xl border-stone-200 focus:ring-amber-500 font-medium text-sm p-4 bg-stone-50/30"
                        />
                      )}
                    </div>
                  </div>
                )}

                {/* Total Summary Card */}
                <div className="bg-amber-50/50 text-stone-900 border border-amber-100 rounded-3xl p-8 shadow-sm space-y-6 relative overflow-hidden group">
                  {/* Background Gradient Effect */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />

                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/60 block mb-1 sm:mb-2 px-1">Финальный расчет</span>
                      <h4 className="text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums tracking-tight flex items-baseline flex-wrap gap-x-2">
                        {(() => {
                          const paid = mode === 'create' ? prepaymentAmount : (currentReservation?.prepaid_amount || 0)
                          const balance = Math.max(0, computedTotal - paid)
                          return formatCurrency(balance)
                        })()}
                        <span className="text-[10px] sm:text-xs text-amber-600 uppercase font-bold tracking-widest font-black">К ОПЛАТЕ</span>
                      </h4>
                    </div>

                    {mode !== 'create' && currentReservation && (
                      <Button
                        variant="ghost"
                        onClick={() => setIsPaymentDialogOpen(true)}
                        className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-white border border-amber-200 hover:bg-amber-100 text-amber-600 p-0 shadow-sm shrink-0"
                      >
                        <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    )}
                  </div>

                  <div className="relative z-10 grid grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-amber-200/50">
                    <div className="space-y-0.5 sm:space-y-1">
                      <span className="text-[8px] sm:text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Общая сумма</span>
                      <p className="text-base sm:text-lg font-black tabular-nums">{formatCurrency(computedTotal)}</p>
                    </div>
                    <div className="space-y-0.5 sm:space-y-1 text-right">
                      <span className="text-[8px] sm:text-[9px] font-black text-stone-400 uppercase tracking-widest block px-1">Внесено</span>
                      <p className="text-base sm:text-lg font-black tabular-nums text-emerald-600">
                        {formatCurrency(mode === 'create' ? prepaymentAmount : (currentReservation?.prepaid_amount || 0))}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const paid = mode === 'create' ? prepaymentAmount : (currentReservation?.prepaid_amount || 0)
                    const surplus = Math.max(0, paid - computedTotal)
                    if (surplus > 0) {
                      return (
                        <div className="relative z-10 mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Переплата</span>
                          <span className="text-lg font-black text-emerald-600">{formatCurrency(surplus)}</span>
                        </div>
                      )
                    }
                    return null
                  })()}

                  {mode === 'create' && (
                    <div className="relative z-10 space-y-3 pt-2">
                      <Label className="text-[10px] font-black text-stone-400 uppercase tracking-widest px-1">Внести предоплату при создании</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={prepaymentAmount || ''}
                          onChange={(e) => setPrepaymentAmount(parseFloat(e.target.value) || 0)}
                          className="h-14 bg-white border-stone-200 rounded-2xl text-xl font-black text-stone-900 pl-11 focus:ring-amber-500/50"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-lg">₽</div>
                      </div>
                      {prepaymentAmount > computedTotal && computedTotal > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-[10px] font-black text-amber-600 uppercase flex items-center gap-2"
                        >
                          <AlertCircle className="h-4 w-4" />
                          Предоплата превышает итоговую сумму
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Sticky Footer */}
        {
          mode !== 'view' && (
            <div className="sticky bottom-0 flex items-center justify-between gap-4 p-5 sm:p-6 border-t border-stone-100 bg-white/95 backdrop-blur-md z-50 rounded-b-3xl">
              {mode === 'edit' && currentReservation ? (
                <Button
                  variant="ghost"
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="h-12 w-12 rounded-2xl text-stone-300 hover:text-red-500 hover:bg-red-50"
                >
                  {deleteReservation.loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (mode === 'edit') {
                      setMode('view')
                      // Reset to original data
                      if (currentReservation) {
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
                          comments: currentReservation.comments || '',
                          menu_type: currentReservation.menu_type || 'banquet',
                          waiter_id: currentReservation.waiter_id || '',
                          is_walk_in: currentReservation.is_walk_in || false
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
                              adHoc.push(rmi)
                            }
                          })
                          setItemOverrides(overrides)
                          setAdHocItems(adHoc)
                        }
                        if (currentReservation.menu_type === 'main_menu' && currentReservation.main_menu_items) {
                          setMainMenuSelections(currentReservation.main_menu_items)
                        }
                      }
                    } else {
                      onClose()
                    }
                  }}
                  className="h-11 sm:h-12 px-4 sm:px-6 rounded-2xl font-black text-[10px] sm:text-xs text-stone-400 uppercase tracking-widest hover:bg-stone-50 hover:text-stone-600 transition-all"
                >
                  Отмена
                </Button>
                {(hasChanges || (mode === 'create' && !currentReservation?.id)) && (
                  <Button
                    onClick={handleSave}
                    disabled={isLoading || isGuestBlacklisted}
                    className={cn(
                      "h-11 sm:h-12 px-5 sm:px-8 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-[0.2em] shadow-lg shadow-amber-500/20 transition-all active:scale-95",
                      isGuestBlacklisted ? "bg-stone-100 text-stone-400" : "bg-amber-600 hover:bg-amber-700 text-white"
                    )}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1 sm:mr-2" /> : <Save className="h-4 w-4 mr-1 sm:mr-2" />}
                    {isGuestBlacklisted ? 'ЧС' : 'Сохранить'}
                  </Button>
                )}
              </div>
            </div>
          )
        }
      </DialogContent >

      <AddPaymentDialog
        open={isPaymentDialogOpen}
        onOpenChange={setIsPaymentDialogOpen}
        reservationId={currentReservation?.id}
        reservation={currentReservation || undefined}
        onSuccess={() => {
          refetchReservations()
        }}
      />
    </Dialog >
  )
}
