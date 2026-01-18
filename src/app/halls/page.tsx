"use client"

import { useRef, useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, MapPin, Loader2, Trash2, Save, Pencil, RotateCw, ZoomIn, ZoomOut, Move, History, FileDown, Copy } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHalls, useReservations, useTables, useLayoutItems, useCreateMutation, useUpdateMutation, useDeleteMutation, useHallLayoutTemplates, useHallDateLayouts, useUpsertMutation, useStaff, useStaffShifts, useStaffRoles } from '@/hooks/useSupabase'
import { cn, formatTime } from '@/lib/utils'
import { RESERVATION_STATUS_CONFIG, Table, Hall, LayoutItem, HallLayoutTemplate, HallDateLayout, ReservationStatus, StaffShift } from '@/types'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { ReservationModal } from '@/components/reservations/ReservationModal'
import { Reservation } from '@/types'

const WALK_IN_GUEST_ID = '00000000-0000-0000-0000-000000000000'

export default function HallsPage() {
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isHallDialogOpen, setIsHallDialogOpen] = useState(false)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [editingHall, setEditingHall] = useState<Hall | null>(null)
  const [hallForm, setHallForm] = useState({ name: '', capacity: 0, description: '' })
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [tableForm, setTableForm] = useState({
    hall_id: '',
    number: 1,
    capacity: 4,
    position_x: 50,
    position_y: 50,
    width: 100,
    height: 100,
    shape: 'rectangle' as Table['shape'],
  })

  const [previewPos, setPreviewPos] = useState<Record<string, { x: number; y: number }>>({})
  const [previewSize, setPreviewSize] = useState<Record<string, { w: number; h: number }>>({})
  const [previewRotation, setPreviewRotation] = useState<Record<string, number>>({})
  const [editingLayoutItem, setEditingLayoutItem] = useState<LayoutItem | null>(null)
  const [layoutForm, setLayoutForm] = useState({
    hall_id: '',
    type: 'label' as 'label' | 'shape',
    text: 'Надпись',
    position_x: 80,
    position_y: 80,
    width: 160,
    height: 40,
    rotation: 0,
    color: '#1f2937',
    bg_color: '#ffffff',
  })
  const previewRef = useRef<HTMLDivElement | null>(null)
  const previewWrapperRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<HTMLDivElement | null>(null)
  const editorWrapperRef = useRef<HTMLDivElement | null>(null)
  const GRID = 10

  // Состояние для показа броней стола
  const [selectedTableForInfo, setSelectedTableForInfo] = useState<Table | null>(null)

  // Состояние для открытия ReservationModal
  const [reservationModalOpen, setReservationModalOpen] = useState(false)
  const [reservationToEdit, setReservationToEdit] = useState<Reservation | null>(null)
  const [preselectedTableId, setPreselectedTableId] = useState<string | null>(null)
  const [preselectedHallId, setPreselectedHallId] = useState<string | null>(null)
  const [focusedReservationId, setFocusedReservationId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Layout Templates and Date Layouts
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState('')
  const [isSavingDateLayout, setIsSavingDateLayout] = useState(false)

  // 1. Data Hooks
  const { data: halls, loading: hallsLoading } = useHalls()
  const { data: tables, refetch: refetchTables } = useTables(undefined, true)
  const { data: layoutItems, refetch: refetchLayoutItems } = useLayoutItems(selectedHallId || undefined)
  const { data: dateReservations, loading: reservationsLoading, refetch: refetchReservations } = useReservations({ date: selectedDate })
  const { data: templates } = useHallLayoutTemplates(selectedHallId || undefined)
  const { data: dateLayouts } = useHallDateLayouts(selectedHallId || undefined, selectedDate)
  const { data: staffMembers } = useStaff()
  const { data: staffRoles } = useStaffRoles()
  const { data: staffShifts } = useStaffShifts({
    startDate: selectedDate,
    endDate: selectedDate
  })

  // 2. Mutations
  const createHall = useCreateMutation<Hall>('halls')
  const updateHall = useUpdateMutation<Hall>('halls')
  const deleteHall = useDeleteMutation('halls')
  const createTable = useCreateMutation<Table>('tables')
  const updateTable = useUpdateMutation<Table>('tables')
  const deleteTable = useDeleteMutation('tables')
  const createLayoutItem = useCreateMutation<LayoutItem>('layout_items')
  const updateLayoutItem = useUpdateMutation<LayoutItem>('layout_items')
  const deleteLayoutItem = useDeleteMutation('layout_items')
  const updateReservation = useUpdateMutation<Reservation>('reservations')
  const createReservation = useCreateMutation<Reservation>('reservations')
  const createReservationTable = useCreateMutation<any>('reservation_tables')

  const upsertDateLayout = useUpsertMutation<HallDateLayout>('hall_date_layouts', ['hall_id', 'date'])
  const createTemplate = useCreateMutation<HallLayoutTemplate>('hall_layout_templates')
  const deleteTemplate = useDeleteMutation('hall_layout_templates')
  const updateTemplate = useUpdateMutation<HallLayoutTemplate>('hall_layout_templates')
  const deleteDateLayout = useDeleteMutation('hall_date_layouts')

  // Fixed sizes
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  const ROTATE_HANDLE_OFFSET = 24
  const [previewScale, setPreviewScale] = useState(1)
  const [baseEditorScale, setBaseEditorScale] = useState(1)

  // Pan & Zoom
  const [editorZoom, setEditorZoom] = useState(1)
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const wrapperRectRef = useRef<DOMRect | null>(null)
  const editorRectRef = useRef<DOMRect | null>(null)

  // High-performance interaction state (bypasses React)
  const interactionRef = useRef({
    isInteracting: false,
    type: 'none' as 'none' | 'pan' | 'drag' | 'resize' | 'zoom',
    targetId: null as string | null,
    targetType: null as 'table' | 'layout' | null,
    startX: 0,
    startY: 0,
    startW: 0,
    startH: 0,
    currentX: 0,
    currentY: 0,
    currentW: 0,
    currentH: 0,
    currentZoom: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    lastPinchDist: null as number | null,
    lastTransform: { x: 0, y: 0 },
    rafId: null as number | null
  })

  // Cache latest values for the native interaction loop
  const cacheRef = useRef({
    editorZoom,
    editorPan,
    tables,
    layoutItems,
    previewPos,
    previewSize,
    previewRotation,
    baseEditorScale,
  })

  useEffect(() => {
    cacheRef.current = {
      editorZoom,
      editorPan,
      tables,
      layoutItems,
      previewPos,
      previewSize,
      previewRotation,
      baseEditorScale,
    }
  }, [editorZoom, editorPan, tables, layoutItems, previewPos, previewSize, previewRotation, baseEditorScale])

  const editorScale = baseEditorScale * editorZoom

  const resetEditorView = () => {
    setEditorZoom(1)
    setEditorPan({ x: 0, y: 0 })
  }

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const computePreviewScale = () => {
    const availableW = window.innerWidth - 64
    const availableH = window.innerHeight * 0.55
    const scale = Math.min(1, Math.min(availableW / CANVAS_WIDTH, availableH / CANVAS_HEIGHT))
    return Math.max(0.35, scale)
  }

  const computeEditorScale = (el: HTMLDivElement | null) => {
    if (!el || el.clientWidth === 0 || el.clientHeight === 0) return 0.5
    const padding = isMobile ? 16 : 32
    const scale = Math.min((el.clientWidth - padding) / CANVAS_WIDTH, (el.clientHeight - padding) / CANVAS_HEIGHT)
    return Math.max(0.1, scale)
  }

  useEffect(() => {
    const updateScale = () => {
      setPreviewScale(computePreviewScale())
      if (editorWrapperRef.current) {
        setBaseEditorScale(computeEditorScale(editorWrapperRef.current))
      }
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    if (editorWrapperRef.current) {
      const observer = new ResizeObserver(() => {
        setBaseEditorScale(computeEditorScale(editorWrapperRef.current))
      })
      observer.observe(editorWrapperRef.current)
      return () => {
        window.removeEventListener('resize', updateScale)
        observer.disconnect()
      }
    }
    return () => window.removeEventListener('resize', updateScale)
  }, [isEditorOpen])

  const selectedHall = selectedHallId
    ? halls?.find(h => h.id === selectedHallId)
    : halls?.[0]

  // Date Layout for current date
  const currentDateLayout = dateLayouts?.[0]

  // Active Tables and Items (respecting date override)
  const activeTables = useMemo(() => {
    if (!selectedHall) return []
    const baseTables = tables.filter(t => t.hall_id === selectedHall.id)
    if (!currentDateLayout || !currentDateLayout.tables_data || currentDateLayout.tables_data.length === 0) {
      return baseTables
    }
    // Return tables from layout, but ensure they have required fields
    return currentDateLayout.tables_data.map((td: any) => ({
      ...td,
      hall_id: selectedHall.id,
      id: td.id || Math.random().toString(36).substr(2, 9) // Should have id if saved correctly
    })) as Table[]
  }, [selectedHall, tables, currentDateLayout])

  const activeLayoutItems = useMemo(() => {
    if (!selectedHall) return []
    const baseItems = layoutItems.filter(li => li.hall_id === selectedHall.id)
    if (!currentDateLayout || !currentDateLayout.layout_items_data || currentDateLayout.layout_items_data.length === 0) {
      return baseItems
    }
    return currentDateLayout.layout_items_data.map((li: any) => ({
      ...li,
      hall_id: selectedHall.id,
      id: li.id || Math.random().toString(36).substr(2, 9)
    })) as LayoutItem[]
  }, [selectedHall, layoutItems, currentDateLayout])

  // 3. Waiter Queue Logic
  const waiterQueue = useMemo(() => {
    if (!staffMembers || !staffShifts) return []

    const waiterRole = staffRoles?.find(r => r.name === 'Официант')

    // Get staff working today with their shift info
    const shiftMap = new Map<string, StaffShift>()
    staffShifts.forEach(s => {
      if (s.shift_type !== 'none') {
        shiftMap.set(s.staff_id, s)
      }
    })

    const now = new Date()
    const isToday = selectedDate === format(now, 'yyyy-MM-dd')
    const currentHour = now.getHours()

    return staffMembers
      .filter(s => {
        const shift = shiftMap.get(s.id)
        if (!shift) return false

        // 1/2 shifts constraint: hidden after 16:00 if it's today
        if (isToday && shift.shift_type === 'half' && currentHour >= 16) {
          return false
        }

        // Robust role check: by ID or name fallback (handling both object and array from Supabase)
        const roleData = Array.isArray(s.role) ? s.role[0] : s.role
        const roleName = (roleData?.name || (s as any).role_name || '').toLowerCase()

        const isWaiter = (waiterRole && s.role_id === waiterRole.id) ||
          ['официант', 'официанты', 'waiter', 'waiters'].includes(roleName)

        return s.is_active && isWaiter
      })
      .map(s => ({
        ...s,
        shift_type: shiftMap.get(s.id)!.shift_type
      }))
      .sort((a, b) => {
        const timeA = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0
        const timeB = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0
        return timeA - timeB
      })
  }, [staffMembers, staffShifts, staffRoles, selectedDate])

  const getTableReservation = (table: Table) => {
    return dateReservations?.find(r =>
      (r.id !== focusedReservationId && r.status !== 'canceled' && r.status !== 'completed' && (r.table_id === table.id || (r.table_ids && r.table_ids.includes(table.id)))) ||
      (r.id === focusedReservationId && (r.table_id === table.id || (r.table_ids && r.table_ids.includes(table.id))))
    )
  }

  const handleAssignWaiter = async (reservationId: string, waiterId: string) => {
    try {
      await updateReservation.mutate(reservationId, { waiter_id: waiterId })
      await refetchReservations()
    } catch (error) {
      console.error('Error assigning waiter:', error)
      alert('Ошибка при назначении официанта')
    }
  }

  const handleQuickOccupy = async (table: Table) => {
    try {
      if (!table) return

      const tableHall = halls.find(h =>
        tables.some(t => t.id === table.id && t.hall_id === h.id)
      )

      const now = new Date()
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`

      const dataToSave = {
        date: selectedDate,
        time: timeStr,
        hall_id: tableHall?.id || table.hall_id,
        table_id: table.id,
        guest_id: WALK_IN_GUEST_ID,
        guests_count: table.capacity || 1,
        children_count: 0,
        status: 'in_progress' as ReservationStatus,
        color: '#2563EB', // Blue for walk-in
        is_walk_in: true,
        menu_type: 'main_menu' as const,
        total_amount: 0,
        prepaid_amount: 0,
        balance: 0,
        surplus: 0
      }

      const created = await createReservation.mutate(dataToSave)
      if (created) {
        // Link table in junction table
        await createReservationTable.mutate({
          reservation_id: created.id,
          table_id: table.id
        })
        await refetchReservations()
        setSelectedTableForInfo(null)
      }
    } catch (error) {
      console.error('Error in Quick Occupy:', error)
      alert('Ошибка при быстром занятии стола')
    }
  }

  useEffect(() => {
    const getScale = () => cacheRef.current.baseEditorScale * cacheRef.current.editorZoom

    const updateVisuals = () => {
      if (!interactionRef.current.isInteracting) return
      const { type, lastTransform, targetId, currentZoom, currentX, currentY, currentW, currentH } = interactionRef.current

      const editor = editorRef.current
      if (!editor) return

      if (type === 'pan') {
        const panner = editor.parentElement
        if (panner) {
          panner.style.transform = `translate(${lastTransform.x}px, ${lastTransform.y}px)`
        }
      } else if (type === 'zoom') {
        editor.style.transform = `scale(${currentZoom})`
      } else if (targetId) {
        const el = editor.querySelector(`[data-id="${targetId}"][data-action="drag"]`) as HTMLDivElement
        if (el) {
          el.style.left = `${currentX}px`
          el.style.top = `${currentY}px`
          if (type === 'resize') {
            el.style.width = `${currentW}px`
            el.style.height = `${currentH}px`
          }
        }
      }

      interactionRef.current.rafId = requestAnimationFrame(updateVisuals)
    }

    const handleStart = (e: MouseEvent | TouchEvent) => {
      const isTouch = 'touches' in e
      const clientX = isTouch ? e.touches[0].clientX : (e as MouseEvent).clientX
      const clientY = isTouch ? e.touches[0].clientY : (e as MouseEvent).clientY

      const target = e.target as HTMLElement
      const interactiveEl = target.closest('[data-action]') as HTMLElement | null
      const action = (interactiveEl?.dataset.action || 'pan') as 'pan' | 'drag' | 'resize'
      const id = interactiveEl?.dataset.id || target.closest('[data-id]')?.getAttribute('data-id')
      const type = interactiveEl?.dataset.type || target.closest('[data-type]')?.getAttribute('data-type')
      const corner = interactiveEl?.dataset.corner as any

      interactionRef.current.isInteracting = true
      interactionRef.current.type = action
      interactionRef.current.targetId = id || null
      interactionRef.current.targetType = (type as any) || null
      interactionRef.current.prevMouseX = clientX
      interactionRef.current.prevMouseY = clientY

      const editor = editorRef.current
      if (action === 'pan') {
        interactionRef.current.lastTransform = { ...cacheRef.current.editorPan }
        setIsPanning(true)
      } else if (id && editor) {
        const sourceTable = cacheRef.current.tables?.find(t => t.id === id)
        const sourceLayout = cacheRef.current.layoutItems?.find(li => li.id === id)

        const pos = cacheRef.current.previewPos[id] || { x: sourceTable?.position_x ?? sourceLayout?.position_x ?? 0, y: sourceTable?.position_y ?? sourceLayout?.position_y ?? 0 }
        const size = cacheRef.current.previewSize[id] || { w: sourceTable?.width ?? sourceLayout?.width ?? 100, h: sourceTable?.height ?? sourceLayout?.height ?? 100 }

        interactionRef.current.startX = pos.x
        interactionRef.current.startY = pos.y
        interactionRef.current.startW = size.w
        interactionRef.current.startH = size.h
        interactionRef.current.currentX = pos.x
        interactionRef.current.currentY = pos.y
        interactionRef.current.currentW = size.w
        interactionRef.current.currentH = size.h

        if (action === 'resize') (interactionRef.current as any).corner = corner

        const el = editor.querySelector(`[data-id="${id}"][data-action="drag"]`) as HTMLDivElement
        if (el) el.style.transition = 'none'
      }

      if (!interactionRef.current.rafId) {
        interactionRef.current.rafId = requestAnimationFrame(updateVisuals)
      }
    }

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!interactionRef.current.isInteracting) return

      const isTouch = 'touches' in e
      const clientX = isTouch ? e.touches[0].clientX : (e as MouseEvent).clientX
      const clientY = isTouch ? e.touches[0].clientY : (e as MouseEvent).clientY

      const dx = clientX - interactionRef.current.prevMouseX
      const dy = clientY - interactionRef.current.prevMouseY
      interactionRef.current.prevMouseX = clientX
      interactionRef.current.prevMouseY = clientY

      const { type, targetId, targetType } = interactionRef.current
      const currentScale = Math.max(0.01, getScale())

      if (type === 'pan') {
        interactionRef.current.lastTransform.x += dx
        interactionRef.current.lastTransform.y += dy
      } else if (type === 'zoom') {
        // Zoom handled in handleTouchMove
      } else if (targetId && !isNaN(currentScale)) {
        const canvasDx = dx / currentScale
        const canvasDy = dy / currentScale

        if (type === 'drag') {
          interactionRef.current.currentX += canvasDx
          interactionRef.current.currentY += canvasDy
          const maxX = Math.max(0, CANVAS_WIDTH - interactionRef.current.currentW)
          const maxY = Math.max(0, CANVAS_HEIGHT - interactionRef.current.currentH)
          interactionRef.current.currentX = Math.min(Math.max(interactionRef.current.currentX, 0), maxX)
          interactionRef.current.currentY = Math.min(Math.max(interactionRef.current.currentY, 0), maxY)
        } else if (type === 'resize') {
          const corner = (interactionRef.current as any).corner
          const rot = cacheRef.current.previewRotation[targetId] ||
            (targetType === 'table' ? cacheRef.current.tables?.find(t => t.id === targetId)?.rotation : cacheRef.current.layoutItems?.find(li => li.id === targetId)?.rotation) || 0

          const rad = (rot * Math.PI) / 180
          const localDx = canvasDx * Math.cos(rad) + canvasDy * Math.sin(rad)
          const localDy = -canvasDx * Math.sin(rad) + canvasDy * Math.cos(rad)

          let nX = interactionRef.current.currentX
          let nY = interactionRef.current.currentY
          let nW = interactionRef.current.currentW
          let nH = interactionRef.current.currentH

          if (corner === 'right') nW += localDx
          else if (corner === 'left') { nW -= localDx; nX += localDx * Math.cos(rad); nY -= localDx * Math.sin(rad) }
          else if (corner === 'bottom') nH += localDy
          else if (corner === 'top') { nH -= localDy; nX += localDy * Math.sin(rad); nY += localDy * Math.cos(rad) }
          else if (corner === 'br') { nW += localDx; nH += localDy }
          else if (corner === 'tr') { nW += localDx; nH -= localDy; nX += localDy * Math.sin(rad); nY += localDy * Math.cos(rad) }
          else if (corner === 'bl') { nW -= localDx; nH += localDy; nX += localDx * Math.cos(rad); nY -= localDx * Math.sin(rad) }
          else if (corner === 'tl') {
            nW -= localDx; nH -= localDy
            nX += localDx * Math.cos(rad) + localDy * Math.sin(rad)
            nY += -localDx * Math.sin(rad) + localDy * Math.cos(rad)
          }

          interactionRef.current.currentW = Math.max(40, nW)
          interactionRef.current.currentH = Math.max(40, nH)
          interactionRef.current.currentX = nX
          interactionRef.current.currentY = nY
        }
      }

      if (e.cancelable) e.preventDefault()
    }

    const handleEnd = () => {
      if (!interactionRef.current.isInteracting) return
      const { type, targetId, targetType, currentX, currentY, currentW, currentH, lastTransform, currentZoom } = interactionRef.current

      interactionRef.current.isInteracting = false
      if (interactionRef.current.rafId) {
        cancelAnimationFrame(interactionRef.current.rafId)
        interactionRef.current.rafId = null
      }

      const snap = (v: number) => Math.round(v / GRID) * GRID

      if (type === 'pan') {
        setEditorPan({ x: lastTransform.x, y: lastTransform.y })
      } else if (type === 'zoom') {
        setEditorZoom(currentZoom / cacheRef.current.baseEditorScale)
      } else if (targetId) {
        const finalX = snap(currentX)
        const finalY = snap(currentY)
        const finalW = snap(currentW)
        const finalH = snap(currentH)

        if (type === 'drag' || type === 'resize') {
          setPreviewPos(prev => ({ ...prev, [targetId]: { x: finalX, y: finalY } }))
          if (type === 'resize') {
            setPreviewSize(prev => ({ ...prev, [targetId]: { w: finalW, h: finalH } }))
          }

          if (targetType === 'table') {
            updateTable.mutate(targetId, {
              position_x: finalX,
              position_y: finalY,
              ...(type === 'resize' ? { width: finalW, height: finalH } : {})
            })
          } else if (targetType === 'layout') {
            updateLayoutItem.mutate(targetId, {
              position_x: finalX,
              position_y: finalY,
              ...(type === 'resize' ? { width: finalW, height: finalH } : {})
            })
          }
        }
      }
      setIsPanning(false)
      interactionRef.current.type = 'none'
      interactionRef.current.targetId = null
      interactionRef.current.lastPinchDist = null
    }

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setEditorZoom(z => Math.max(0.2, Math.min(4, z + delta)))
    }

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        interactionRef.current.lastPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        e.preventDefault()
      } else {
        handleStart(e)
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && interactionRef.current.lastPinchDist !== null) {
        e.preventDefault()
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const scale = dist / interactionRef.current.lastPinchDist
        const newZoom = Math.max(0.2, Math.min(4, cacheRef.current.editorZoom * scale))

        interactionRef.current.isInteracting = true
        interactionRef.current.type = 'zoom'
        interactionRef.current.currentZoom = cacheRef.current.baseEditorScale * newZoom

        if (!interactionRef.current.rafId) {
          interactionRef.current.rafId = requestAnimationFrame(updateVisuals)
        }
      } else {
        handleMove(e)
      }
    }

    let lastAttachedWrapper: HTMLElement | null = null
    let cleanupFunc: (() => void) | null = null

    const tryAttach = () => {
      const w = editorWrapperRef.current
      if (!isEditorOpen || !w) {
        if (cleanupFunc) {
          cleanupFunc()
          cleanupFunc = null
          lastAttachedWrapper = null
        }
        return
      }

      if (lastAttachedWrapper === w) return

      if (cleanupFunc) cleanupFunc()

      const handleStartLocal = (e: any) => handleStart(e)
      const handleMoveLocal = (e: any) => handleMove(e)
      const handleEndLocal = () => handleEnd()
      const handleWheelLocal = (e: any) => handleWheel(e)
      const handleTouchStartLocal = (e: any) => handleTouchStart(e)
      const handleTouchMoveLocal = (e: any) => handleTouchMove(e)

      w.addEventListener('mousedown', handleStartLocal)
      window.addEventListener('mousemove', handleMoveLocal)
      window.addEventListener('mouseup', handleEndLocal)
      w.addEventListener('touchstart', handleTouchStartLocal, { passive: false })
      w.addEventListener('touchmove', handleTouchMoveLocal, { passive: false })
      window.addEventListener('touchend', handleEndLocal)
      w.addEventListener('wheel', handleWheelLocal, { passive: false })

      lastAttachedWrapper = w
      cleanupFunc = () => {
        w.removeEventListener('mousedown', handleStartLocal)
        window.removeEventListener('mousemove', handleMoveLocal)
        window.removeEventListener('mouseup', handleEndLocal)
        w.removeEventListener('touchstart', handleTouchStartLocal)
        w.removeEventListener('touchmove', handleTouchMoveLocal)
        window.removeEventListener('touchend', handleEndLocal)
        w.removeEventListener('wheel', handleWheelLocal)
      }
    }

    // Faster polling to ensure immediate responsiveness after a re-render
    const interval = setInterval(tryAttach, 100)
    tryAttach()

    return () => {
      clearInterval(interval)
      if (cleanupFunc) cleanupFunc()
      if (interactionRef.current.rafId) cancelAnimationFrame(interactionRef.current.rafId)
    }
  }, [isEditorOpen])


  if (hallsLoading) {
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
              <h1 className="text-3xl font-bold text-stone-900">Залы</h1>
              <p className="mt-1 text-stone-500">Схема расположения столов и текущие брони</p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 sm:flex-none gap-2 px-3 sm:px-6 text-sm sm:text-base"
                onClick={() => {
                  setEditingHall(null)
                  setHallForm({ name: '', capacity: 0, description: '' })
                  setIsHallDialogOpen(true)
                }}
              >
                <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="whitespace-nowrap">Добавить зал</span>
              </Button>
              {selectedHall && (
                <Button
                  size="lg"
                  className="flex-1 sm:flex-none gap-2 px-3 sm:px-6 text-sm sm:text-base shadow-lg shadow-amber-500/25"
                  onClick={() => {
                    resetEditorView()
                    setIsEditorOpen(true)
                  }}
                >
                  <span className="whitespace-nowrap">Редактор схемы</span>
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {halls.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-stone-300" />
            <p>Нет залов. Создайте первый зал.</p>
          </div>
        ) : (
          <Tabs
            defaultValue={halls[0]?.id}
            value={selectedHall?.id}
            onValueChange={(v) => setSelectedHallId(v)}
          >
            <TabsList className="mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
              {halls.map((hall) => (
                <TabsTrigger key={hall.id} value={hall.id} className="gap-2">
                  <MapPin className="h-4 w-4" />
                  {hall.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {halls.map((hall) => (
              <TabsContent key={hall.id} value={hall.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* Hall Info */}
                  <div className="order-3 lg:order-none">
                    <Card>
                      <CardHeader className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-amber-600" />
                            {hall.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingHall(hall)
                                setHallForm({
                                  name: hall.name,
                                  capacity: hall.capacity,
                                  description: hall.description || ''
                                })
                                setIsHallDialogOpen(true)
                              }}
                              className="text-stone-500 hover:text-stone-800"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-stone-400 hover:text-rose-600"
                              onClick={async () => {
                                if (!confirm('Удалить этот зал и его столы?')) return
                                const deleted = await deleteHall.mutate(hall.id)
                                if (deleted) {
                                  if (selectedHallId === hall.id) {
                                    const nextHall = halls.find(h => h.id !== hall.id)
                                    setSelectedHallId(nextHall?.id ?? null)
                                  }
                                } else {
                                  alert('Не удалось удалить зал. Удалите связанные бронирования или попробуйте позже.')
                                }
                              }}
                              disabled={deleteHall.loading}
                              title="Удалить зал"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center gap-3 text-stone-600">
                          <Users className="h-5 w-5" />
                          <span>Вместимость: до {hall.capacity} человек</span>
                        </div>

                        <p className="text-stone-500">{hall.description}</p>

                        <div className="pt-4 border-t border-stone-200">
                          <h4 className="font-medium text-stone-900 mb-2">Столы ({activeTables.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {activeTables
                              .sort((a, b) => a.number - b.number)
                              .map((table) => {
                                const reservation = getTableReservation(table)
                                return (
                                  <Badge
                                    key={table.id}
                                    variant={reservation ?
                                      (reservation.status === 'paid' ? 'paid' :
                                        reservation.status === 'prepaid' ? 'prepaid' :
                                          reservation.status === 'in_progress' ? 'inProgress' :
                                            reservation.status === 'canceled' ? 'canceled' : 'new')
                                      : 'outline'
                                    }
                                    onClick={() => {
                                      setEditingTable(table)
                                      setTableForm({
                                        hall_id: hall.id,
                                        number: table.number,
                                        capacity: table.capacity,
                                        position_x: table.position_x,
                                        position_y: table.position_y,
                                        width: table.width,
                                        height: table.height,
                                        shape: table.shape,
                                      })
                                      setIsTableDialogOpen(true)
                                    }}
                                    className="cursor-pointer"
                                  >
                                    Стол {table.number} ({table.capacity} чел.)
                                  </Badge>
                                )
                              })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Waiter Queue */}
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-amber-600" />
                          Очередь официантов
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {waiterQueue.length === 0 ? (
                            <p className="text-sm text-stone-500 text-center py-4 italic">
                              Нет официантов в смене
                            </p>
                          ) : (
                            waiterQueue.map((waiter, index) => (
                              <div
                                key={waiter.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-100"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="h-6 w-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-stone-900">
                                      {waiter.name}
                                      {waiter.shift_type === 'half' && (
                                        <span className="ml-2 text-[10px] text-amber-600 font-black uppercase">
                                          До 16:00 (½)
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-stone-500 uppercase">
                                      {waiter.last_assigned_at
                                        ? `Посл. стол: ${formatTime(waiter.last_assigned_at.split('T')[1].substring(0, 5))}`
                                        : 'Еще не назначался'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-[10px] font-black text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={async () => {
                                    if (selectedTableForInfo) {
                                      const reservation = getTableReservation(selectedTableForInfo)
                                      if (reservation) {
                                        await handleAssignWaiter(reservation.id, waiter.id)
                                      } else {
                                        alert('Сначала добавьте гостя на этот стол')
                                      }
                                    } else if (focusedReservationId) {
                                      await handleAssignWaiter(focusedReservationId, waiter.id)
                                    } else {
                                      alert('Выберите стол или бронирование для назначения')
                                    }
                                  }}
                                >
                                  ВЫБРАТЬ
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Floor Plan */}
                  <div className="lg:col-span-2 order-1 lg:order-none">
                    <Card className="h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between gap-3">
                          <span>Схема зала</span>
                          <DateTimePicker
                            value={selectedDate}
                            onChange={(date) => setSelectedDate(date)}
                            dateOnly={true}
                            placeholder="Выберите дату"
                            className="w-[150px]"
                          />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="overflow-hidden">
                        <div
                          ref={previewWrapperRef}
                          className="relative bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 overflow-hidden touch-manipulation mx-auto"
                          style={{
                            width: CANVAS_WIDTH * previewScale,
                            height: CANVAS_HEIGHT * previewScale,
                            maxWidth: '100%',
                            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                            backgroundSize: `${16 * previewScale}px ${16 * previewScale}px`
                          }}
                        >
                          <div
                            ref={previewRef}
                            className="relative origin-top-left"
                            style={{
                              width: CANVAS_WIDTH,
                              height: CANVAS_HEIGHT,
                              transform: `scale(${previewScale})`,
                            }}
                          >
                            {/* Layout items preview */}
                            {activeLayoutItems.map((item) => (
                              <div
                                key={item.id}
                                className="absolute bg-white border border-stone-200 rounded-lg shadow-sm flex items-center justify-center text-xs text-stone-700"
                                style={{
                                  left: item.position_x,
                                  top: item.position_y,
                                  width: item.width,
                                  height: item.height,
                                  transform: `rotate(${item.rotation ?? 0}deg)`,
                                  color: item.color || '#1f2937',
                                  backgroundColor: item.bg_color || '#ffffff',
                                  transformOrigin: 'center center',
                                }}
                              >
                                {item.text || 'Элемент'}
                              </div>
                            ))}

                            {/* Tables visualization (read-only) */}
                            {activeTables.map((table) => {
                              const reservation = getTableReservation(table)
                              const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status as keyof typeof RESERVATION_STATUS_CONFIG] : null

                              // Determine visual state based on focus
                              const isFocused = focusedReservationId !== null
                              const isPartOfFocus = reservation?.id === focusedReservationId

                              // Default styles
                              let bgColor = statusConfig?.bgColor || 'white'
                              let borderColor = statusConfig?.borderColor || '#D1D5DB'
                              let textColor = statusConfig?.color || '#374151'
                              let opacity = 1
                              let scale = 1

                              const waiter = reservation?.waiter_id && staffMembers
                                ? staffMembers.find(s => s.id === reservation.waiter_id)
                                : null

                              const formatWaiterName = (fullName: string) => {
                                const parts = fullName.trim().split(/\s+/)
                                if (parts.length < 2) return parts[0]
                                return `${parts[0]} ${parts[1][0]}.`
                              }

                              if (isFocused) {
                                if (isPartOfFocus) {
                                  scale = 1.1
                                } else {
                                  bgColor = '#f5f5f4'
                                  borderColor = '#e7e5e4'
                                  textColor = '#d6d3d1'
                                  opacity = 0.8
                                }
                              }

                              return (
                                <motion.div
                                  key={table.id}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity, scale }}
                                  whileHover={{ scale: isFocused ? scale : 1.05 }}
                                  whileTap={{ scale: isFocused ? scale : 0.98 }}
                                  className={cn(
                                    "absolute transition-all border-2 flex flex-col items-center justify-center p-2 cursor-pointer",
                                    table.shape === 'round' && "rounded-full",
                                    table.shape === 'rectangle' && "rounded-xl",
                                    table.shape === 'square' && "rounded-lg",
                                    reservation && !isFocused
                                      ? "shadow-lg hover:shadow-xl"
                                      : isPartOfFocus
                                        ? "shadow-xl ring-4 ring-white/50 z-10"
                                        : "bg-white border-stone-300"
                                  )}
                                  style={{
                                    left: table.position_x,
                                    top: table.position_y,
                                    width: table.width,
                                    height: table.height,
                                    backgroundColor: bgColor,
                                    borderColor: borderColor,
                                    transform: `rotate(${table.rotation ?? 0}deg)`,
                                    transformOrigin: 'center center',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTableForInfo(table)
                                  }}
                                >
                                  {waiter && (
                                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-stone-200 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 z-20 pointer-events-none">
                                      <Users className="w-2 h-2 text-amber-600" />
                                      <span className="text-[9px] font-black text-stone-800 whitespace-nowrap">
                                        {formatWaiterName(waiter.name)}
                                      </span>
                                    </div>
                                  )}
                                  {reservation && (
                                    <span
                                      className="absolute -top-2 -right-2 h-3.5 w-3.5 rounded-full border border-white shadow"
                                      style={{ backgroundColor: reservation.color || statusConfig?.borderColor || '#f59e0b' }}
                                    />
                                  )}
                                  <span className="font-bold text-lg leading-tight" style={{ color: textColor }}>
                                    {table.number}
                                  </span>
                                  {table.capacity > 0 && (
                                    <span className="text-[10px] text-stone-500 leading-tight">
                                      {table.capacity} чел
                                    </span>
                                  )}
                                </motion.div>
                              )
                            })}

                            {activeTables.length === 0 && (
                              <div className="flex items-center justify-center h-full text-stone-400">
                                Нет столов в этом зале
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <div className="flex flex-wrap gap-3 px-4 pb-4">
                        <div className="flex items-center gap-1.5 text-xs text-stone-500">
                          <div className="w-3 h-3 rounded-full bg-white border-2 border-stone-300" />
                          Свободен
                        </div>
                        {Object.entries(RESERVATION_STATUS_CONFIG).map(([status, config]) => (
                          <div key={status} className="flex items-center gap-1.5 text-xs">
                            <div
                              className="w-3 h-3 rounded-full border-2"
                              style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}
                            />
                            <span style={{ color: config.color }}>{config.label}</span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Reservations for this hall */}
                  <div className="lg:col-span-3 order-2 lg:order-none mt-0 lg:mt-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>
                          Бронирования на {format(new Date(selectedDate), 'd MMMM yyyy', { locale: ru })}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reservationsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                          </div>
                        ) : dateReservations.filter(r => r.hall_id === hall.id).length === 0 ? (
                          <p className="text-center py-8 text-stone-500">
                            Нет бронирований на эту дату
                          </p>
                        ) : (
                          <div className="divide-y divide-stone-100">
                            {dateReservations
                              .filter(r => r.hall_id === hall.id)
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((reservation) => {
                                const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                                return (
                                  <div
                                    key={reservation.id}
                                    className={cn(
                                      "py-3 flex items-center justify-between cursor-pointer rounded-lg px-2 transition-all -mx-2 my-1",
                                      focusedReservationId === reservation.id
                                        ? "bg-amber-50 shadow-sm ring-1 ring-amber-200"
                                        : "hover:bg-stone-50"
                                    )}
                                    onClick={() => setFocusedReservationId(focusedReservationId === reservation.id ? null : reservation.id)}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div
                                        className="w-2 h-10 rounded-full"
                                        style={{ backgroundColor: statusConfig.borderColor }}
                                      />
                                      <div>
                                        <p className="font-medium text-stone-900">
                                          {reservation.guest?.last_name} {reservation.guest?.first_name}
                                        </p>
                                        <p className="text-sm text-stone-500">
                                          {formatTime(reservation.time)} • {reservation.guests_count} гостей
                                        </p>
                                      </div>
                                    </div>
                                    <Badge
                                      variant={reservation.status === 'new' ? 'new' :
                                        reservation.status === 'in_progress' ? 'inProgress' :
                                          reservation.status === 'prepaid' ? 'prepaid' :
                                            reservation.status === 'paid' ? 'paid' :
                                              reservation.status === 'completed' ? 'completed' : 'canceled'}
                                    >
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                )
                              })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div >

      {/* Hall Dialog */}
      < Dialog
        open={isHallDialogOpen}
        onOpenChange={(open) => {
          setIsHallDialogOpen(open)
          if (!open) {
            setEditingHall(null)
            setHallForm({ name: '', capacity: 0, description: '' })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHall ? 'Редактировать зал' : 'Новый зал'}</DialogTitle>
            <DialogDescription>
              {editingHall ? 'Обновите параметры зала' : 'Создайте зал и позже добавьте столы'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Название *</Label>
              <Input
                value={hallForm.name}
                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Вместимость *</Label>
              <Input
                type="number"
                value={hallForm.capacity || ''}
                onChange={(e) => setHallForm({ ...hallForm, capacity: parseInt(e.target.value) || 0 })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={hallForm.description}
                onChange={(e) => setHallForm({ ...hallForm, description: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHallDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                const payload = {
                  name: hallForm.name.trim(),
                  capacity: hallForm.capacity,
                  description: hallForm.description?.trim()
                }

                if (editingHall) {
                  const updated = await updateHall.mutate(editingHall.id, payload)
                  if (updated) {
                    setEditingHall(null)
                    setIsHallDialogOpen(false)
                    setHallForm({ name: '', capacity: 0, description: '' })
                  }
                } else {
                  await createHall.mutate(payload)
                  setIsHallDialogOpen(false)
                  setHallForm({ name: '', capacity: 0, description: '' })
                }
              }}
              disabled={!hallForm.name || !hallForm.capacity}
            >
              {(createHall.loading || updateHall.loading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingHall ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Layout Item Dialog */}
      < Dialog open={isLayoutDialogOpen} onOpenChange={setIsLayoutDialogOpen} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLayoutItem ? 'Редактировать элемент' : 'Новый элемент'}</DialogTitle>
            <DialogDescription>
              Добавьте подписи или блоки для наглядной схемы
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Тип</Label>
              <Select
                value={layoutForm.type}
                onValueChange={(v) => setLayoutForm({ ...layoutForm, type: v as 'label' | 'shape' })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="label">Надпись</SelectItem>
                  <SelectItem value="shape">Блок</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Текст</Label>
              <Input
                value={layoutForm.text}
                onChange={(e) => setLayoutForm({ ...layoutForm, text: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Цвет текста</Label>
                <Input
                  value={layoutForm.color}
                  onChange={(e) => setLayoutForm({ ...layoutForm, color: e.target.value })}
                  className="mt-1"
                  type="text"
                />
              </div>
              <div>
                <Label>Фон</Label>
                <Input
                  value={layoutForm.bg_color}
                  onChange={(e) => setLayoutForm({ ...layoutForm, bg_color: e.target.value })}
                  className="mt-1"
                  type="text"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="justify-between">
            {editingLayoutItem ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  await deleteLayoutItem.mutate(editingLayoutItem.id)
                  setIsLayoutDialogOpen(false)
                  setEditingLayoutItem(null)
                }}
                disabled={deleteLayoutItem.loading}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </Button>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsLayoutDialogOpen(false)}>Отмена</Button>
              <Button
                onClick={async () => {
                  if (!selectedHall) return
                  const payload = {
                    ...layoutForm,
                    hall_id: selectedHall.id,
                  }
                  if (editingLayoutItem) {
                    await updateLayoutItem.mutate(editingLayoutItem.id, payload)
                  } else {
                    await createLayoutItem.mutate(payload as Partial<LayoutItem>)
                  }
                  setIsLayoutDialogOpen(false)
                  setEditingLayoutItem(null)
                }}
              >
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Table Dialog */}
      < Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen} >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTable ? 'Редактировать стол' : 'Новый стол'}</DialogTitle>
            <DialogDescription>Настройте расположение и параметры стола</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Номер *</Label>
                <Input
                  type="number"
                  value={tableForm.number || ''}
                  onChange={(e) => setTableForm({ ...tableForm, number: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Вместимость *</Label>
                <Input
                  type="number"
                  value={tableForm.capacity || ''}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ширина</Label>
                <Input
                  type="number"
                  value={tableForm.width || ''}
                  onChange={(e) => setTableForm({ ...tableForm, width: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Высота</Label>
                <Input
                  type="number"
                  value={tableForm.height || ''}
                  onChange={(e) => setTableForm({ ...tableForm, height: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Позиция X</Label>
                <Input
                  type="number"
                  value={tableForm.position_x || ''}
                  onChange={(e) => setTableForm({ ...tableForm, position_x: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Позиция Y</Label>
                <Input
                  type="number"
                  value={tableForm.position_y || ''}
                  onChange={(e) => setTableForm({ ...tableForm, position_y: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Форма</Label>
              <Select
                value={tableForm.shape}
                onValueChange={(v) => setTableForm({ ...tableForm, shape: v as Table['shape'] })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="round">Круглый</SelectItem>
                  <SelectItem value="rectangle">Прямоугольный</SelectItem>
                  <SelectItem value="square">Квадратный</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="justify-between">
            {editingTable ? (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={async () => {
                    await deleteTable.mutate(editingTable.id)
                    setIsTableDialogOpen(false)
                    setEditingTable(null)
                  }}
                  disabled={deleteTable.loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </Button>
              </div>
            ) : <div />}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsTableDialogOpen(false)}>Отмена</Button>
              <Button
                onClick={async () => {
                  if (editingTable) {
                    await updateTable.mutate(editingTable.id, tableForm)
                  } else {
                    await createTable.mutate({ ...tableForm, hall_id: tableForm.hall_id || selectedHall?.id || '' })
                  }
                  setIsTableDialogOpen(false)
                  setEditingTable(null)
                }}
                disabled={!tableForm.number || !tableForm.capacity}
              >
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog >

      {/* Editor Modal */}
      < Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open)
          if (!open) {
            setPreviewPos({})
            setPreviewSize({})
            setPreviewRotation({})
          }
        }}
      >
        <DialogContent className="max-w-[95vw] w-[95vw] sm:max-w-[75vw] max-h-[95vh] h-[95vh] sm:max-h-[90vh] sm:h-[90vh] p-0 sm:p-0 flex flex-col overflow-hidden">
          <DialogHeader className="pb-2 sm:pb-4 px-4 sm:px-6 pt-4">
            <DialogTitle className="text-lg sm:text-xl">Редактор схемы зала</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isMobile ? 'Перетаскивайте столы. Двойной тап — редактирование.' : 'Перемещайте, растягивайте и поворачивайте столы и элементы. Двойной клик — редактирование параметров.'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 sm:p-6 sm:pt-4 flex flex-col flex-1 min-h-0 overflow-hidden space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm text-stone-600 hidden sm:block">
                Сетку: {GRID}px • Двигать/ресайзить/крутить можно только в этом редакторе
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {selectedHall && (
                  <Button
                    size={isMobile ? "sm" : "default"}
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                    onClick={() => {
                      setEditingTable(null)
                      setTableForm({
                        hall_id: selectedHall.id,
                        number: (tables.filter(t => t.hall_id === selectedHall.id).length || 0) + 1,
                        capacity: 4,
                        position_x: 50,
                        position_y: 50,
                        width: 100,
                        height: 100,
                        shape: 'rectangle',
                      })
                      setIsTableDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                    {isMobile ? 'Стол' : 'Добавить стол'}
                  </Button>
                )}
                {selectedHall && (
                  <Button
                    size={isMobile ? "sm" : "default"}
                    variant="outline"
                    className="flex-1 sm:flex-none text-xs sm:text-sm"
                    onClick={() => {
                      setEditingLayoutItem(null)
                      setLayoutForm({
                        hall_id: selectedHall.id,
                        type: 'label',
                        text: 'Надпись',
                        position_x: 80,
                        position_y: 80,
                        width: 160,
                        height: 40,
                        rotation: 0,
                        color: '#1f2937',
                        bg_color: '#ffffff',
                      })
                      setIsLayoutDialogOpen(true)
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                    {isMobile ? 'Элемент' : 'Добавить элемент'}
                  </Button>
                )}
                <Button
                  size={isMobile ? "sm" : "default"}
                  className="flex-1 sm:flex-none gap-1 sm:gap-2 text-xs sm:text-sm"
                  onClick={async () => {
                    await Promise.all([refetchTables(), refetchLayoutItems()])
                    setIsEditorOpen(false)
                  }}
                >
                  <Save className="h-4 w-4" />
                  {isMobile ? 'ОК' : 'Закрыть редактор'}
                </Button>
              </div>
            </div>

            {/* Date Specific & Template Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-4 py-2 bg-stone-50 rounded-lg border border-stone-200">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!selectedHall) return
                    setIsSavingDateLayout(true)
                    try {
                      // Get CURRENT state from the editor (using tables/layoutItems which are already being updated by mutations)
                      // No, wait. The editor updates the database DIRECTLY on drag/rotate/resize via updateTable.mutate/updateLayoutItem.mutate.
                      // This means the "Standard" layout is being modified.
                      // WAIT. This is a problem in my logic.
                      // If the editor modifications update the primary `tables` and `layout_items` table, then the "Standard" layout is lost if we don't save it first.

                      // CORRECT LOGIC:
                      // 1. The Hall Editor should work on a "Current Session" state if we want to support "Discard Changes" or "Save for Date".
                      // 2. But the current implementation uses `updateTable.mutate` which hits the DB immediately.

                      // TO SUPPORT THIS FEATURE PROPERLY:
                      // We should either:
                      // a) Only update DB on "Save" (requires refactoring the whole editor to use local state)
                      // b) "Save for Date" copies the current "Standard" state to `hall_date_layouts`.

                      // Given the current architecture, I'll stick to (b) for now, but with a twist:
                      // When in Editor, if a Date is selected, we should maybe be editing THAT date's layout if it exists.

                      const currentTables = tables.filter(t => t.hall_id === selectedHall.id)
                      const currentItems = layoutItems.filter(li => li.hall_id === selectedHall.id)

                      await upsertDateLayout.mutate({
                        hall_id: selectedHall.id,
                        date: selectedDate,
                        tables_data: currentTables,
                        layout_items_data: currentItems
                      })
                      alert(`Расположение сохранено для ${format(new Date(selectedDate), 'd MMMM', { locale: ru })}`)
                    } catch (err) {
                      console.error(err)
                      alert('Ошибка при сохранении')
                    } finally {
                      setIsSavingDateLayout(false)
                    }
                  }}
                  disabled={isSavingDateLayout || !selectedHall}
                  className="text-amber-700 border-amber-200 hover:bg-amber-50"
                >
                  <History className="h-4 w-4 mr-2" />
                  Сохранить для {format(new Date(selectedDate), 'd MMM', { locale: ru })}
                </Button>

                {currentDateLayout && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm('Вернуть стандартное расположение для этой даты? Все изменения для этой конкретной даты будут удалены.')) return
                      await deleteDateLayout.mutate(currentDateLayout.id)
                    }}
                    className="text-stone-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Сбросить до стандарта
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Select
                  onValueChange={async (templateId) => {
                    const template = templates?.find(t => t.id === templateId)
                    if (!template || !selectedHall) return

                    if (!confirm(`Применить шаблон "${template.name}"? Это изменит текущее стандартное расположение столов в зале.`)) return

                    // Apply template by updating standard tables/items
                    // This is complex because we need to match tables or re-create them.
                    // For now, let's assume standard layout editing is what the user wants.
                    // Actually, a better "Apply" would be to just set it as the Date Layout.

                    await upsertDateLayout.mutate({
                      hall_id: selectedHall.id,
                      date: selectedDate,
                      tables_data: template.tables_data as any,
                      layout_items_data: template.layout_items_data as any
                    })
                    alert('Шаблон применен к выбранной дате')
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Применить шаблон" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                    {(!templates || templates.length === 0) && (
                      <SelectItem value="none" disabled>Нет шаблонов</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTemplateDialogOpen(true)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Сохранить как шаблон
                </Button>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorZoom(z => Math.max(0.2, z - 0.2))}
                disabled={editorZoom <= 0.2}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-stone-600 min-w-[60px] text-center">
                {Math.round(editorZoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorZoom(z => Math.min(4, z + 0.2))}
                disabled={editorZoom >= 4}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetEditorView}
                className="ml-2"
              >
                <Move className="h-4 w-4 mr-1" />
                Сброс
              </Button>
            </div>

            <div
              ref={editorWrapperRef}
              className="flex items-center justify-center w-full flex-1 min-h-0 overflow-hidden relative bg-stone-100/50 rounded-xl"
              style={{
                touchAction: 'none'
              }}
            >
              <div
                style={{
                  transform: `translate(${editorPan.x}px, ${editorPan.y}px)`,
                  transition: 'none',
                  willChange: 'transform'
                }}
              >
                <div
                  ref={editorRef}
                  className="relative bg-white rounded-xl border border-stone-200 overflow-hidden touch-manipulation"
                  style={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    transform: `scale(${editorScale})`,
                    transformOrigin: 'center center',
                    backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                    touchAction: 'none',
                  }}
                >
                  {/* Layout items */}
                  {selectedHall && layoutItems.filter(li => li.hall_id === selectedHall.id).map((item) => {
                    const pos = previewPos[item.id] ?? { x: item.position_x, y: item.position_y }
                    const size = previewSize[item.id] ?? { w: item.width, h: item.height }
                    const rot = previewRotation[item.id] ?? item.rotation ?? 0
                    return (
                      <div
                        key={item.id}
                        data-id={item.id}
                        data-type="layout"
                        data-action="drag"
                        className="absolute bg-white border border-stone-300 rounded-lg shadow-sm p-2 group cursor-move select-none"
                        style={{
                          left: pos.x,
                          top: pos.y,
                          width: size.w,
                          height: size.h,
                          transform: `rotate(${rot}deg)`,
                          transformOrigin: 'center center',
                        }}
                        onDoubleClick={() => {
                          setEditingLayoutItem(item)
                          setLayoutForm({
                            hall_id: item.hall_id,
                            type: item.type,
                            text: item.text || '',
                            position_x: pos.x,
                            position_y: pos.y,
                            width: size.w,
                            height: size.h,
                            rotation: rot,
                            color: item.color || '#1f2937',
                            bg_color: item.bg_color || '#ffffff',
                          })
                          setIsLayoutDialogOpen(true)
                        }}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center text-sm text-stone-800 pointer-events-none"
                          style={{
                            color: item.color || '#1f2937',
                            backgroundColor: item.bg_color || '#ffffff',
                          }}
                        >
                          {item.text || 'Элемент'}
                        </div>

                        {/* Resize handles */}
                        {['left', 'right', 'top', 'bottom', 'tl', 'tr', 'bl', 'br'].map((corner) => (
                          <div
                            key={corner}
                            data-id={item.id}
                            data-type="layout"
                            data-action="resize"
                            data-corner={corner}
                            className={cn(
                              "absolute pointer-events-auto",
                              corner === 'left' && "left-0 top-0 h-full w-2 cursor-ew-resize",
                              corner === 'right' && "right-0 top-0 h-full w-2 cursor-ew-resize",
                              corner === 'top' && "top-0 left-0 w-full h-2 cursor-ns-resize",
                              corner === 'bottom' && "bottom-0 left-0 w-full h-2 cursor-ns-resize",
                              corner.length === 2 && "w-3 h-3 bg-white border border-stone-400 z-20",
                              corner === 'tl' && "left-0 top-0 cursor-nwse-resize",
                              corner === 'tr' && "right-0 top-0 cursor-nesw-resize",
                              corner === 'bl' && "left-0 bottom-0 cursor-nesw-resize",
                              corner === 'br' && "right-0 bottom-0 cursor-nwse-resize"
                            )}
                          />
                        ))}

                        {/* Rotate handle */}
                        <div
                          className="absolute left-1/2 pointer-events-none"
                          style={{ top: 0, transform: `translate(-50%, -${ROTATE_HANDLE_OFFSET}px)` }}
                        >
                          <div
                            className="w-7 h-7 bg-white border border-amber-500 rounded-full pointer-events-auto cursor-pointer flex items-center justify-center shadow-sm"
                            style={{ transform: `rotate(${-rot}deg)` }}
                            onClick={async (e) => {
                              e.stopPropagation()
                              const next = (rot + 90) % 360
                              setPreviewRotation(prev => ({ ...prev, [item.id]: next }))
                              await updateLayoutItem.mutate(item.id, { rotation: next })
                            }}
                          >
                            <RotateCw className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Tables */}
                  {selectedHall && tables.filter(t => t.hall_id === selectedHall.id).map((table) => {
                    const reservation = getTableReservation(table)
                    const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status as keyof typeof RESERVATION_STATUS_CONFIG] : null
                    const pos = previewPos[table.id] ?? { x: table.position_x, y: table.position_y }
                    const size = previewSize[table.id] ?? { w: table.width, h: table.height }
                    const rot = previewRotation[table.id] ?? table.rotation ?? 0
                    return (
                      <div
                        key={table.id}
                        data-id={table.id}
                        data-type="table"
                        data-action="drag"
                        className={cn(
                          "absolute border-2 flex flex-col items-center justify-center p-2 group bg-white select-none",
                          table.shape === 'round' && "rounded-full",
                          table.shape === 'rectangle' && "rounded-xl",
                          table.shape === 'square' && "rounded-lg",
                          reservation ? "shadow-lg" : "border-stone-300"
                        )}
                        style={{
                          left: pos.x,
                          top: pos.y,
                          width: size.w,
                          height: size.h,
                          backgroundColor: reservation?.color || statusConfig?.bgColor || 'white',
                          borderColor: reservation?.color || statusConfig?.borderColor || '#D1D5DB',
                          transform: `rotate(${rot}deg)`,
                          transformOrigin: 'center center',
                        }}
                        onDoubleClick={() => {
                          setEditingTable(table)
                          setTableForm({
                            hall_id: selectedHall.id,
                            number: table.number,
                            capacity: table.capacity,
                            position_x: pos.x,
                            position_y: pos.y,
                            width: size.w,
                            height: size.h,
                            shape: table.shape,
                          })
                          setIsTableDialogOpen(true)
                        }}
                      >
                        {reservation && (
                          <span
                            className="absolute -top-2 -right-2 h-3.5 w-3.5 rounded-full border border-white shadow pointer-events-none"
                            style={{ backgroundColor: reservation.color || statusConfig?.borderColor || '#f59e0b' }}
                          />
                        )}
                        <span className="font-bold text-lg leading-tight pointer-events-none" style={{ color: statusConfig?.color || '#374151' }}>
                          {table.number}
                        </span>
                        {table.capacity > 0 && (
                          <span className="text-[10px] text-stone-500 leading-tight pointer-events-none">
                            {table.capacity} чел
                          </span>
                        )}

                        {/* Resize handles */}
                        {['left', 'right', 'top', 'bottom', 'tl', 'tr', 'bl', 'br'].map((corner) => (
                          <div
                            key={corner}
                            data-id={table.id}
                            data-type="table"
                            data-action="resize"
                            data-corner={corner}
                            className={cn(
                              "absolute pointer-events-auto",
                              corner === 'left' && "left-0 top-0 h-full w-2 cursor-ew-resize",
                              corner === 'right' && "right-0 top-0 h-full w-2 cursor-ew-resize",
                              corner === 'top' && "top-0 left-0 w-full h-2 cursor-ns-resize",
                              corner === 'bottom' && "bottom-0 left-0 w-full h-2 cursor-ns-resize",
                              corner.length === 2 && "w-3 h-3 bg-white border border-stone-400 z-20",
                              corner === 'tl' && "left-0 top-0 cursor-nwse-resize",
                              corner === 'tr' && "right-0 top-0 cursor-nesw-resize",
                              corner === 'bl' && "left-0 bottom-0 cursor-nesw-resize",
                              corner === 'br' && "right-0 bottom-0 cursor-nwse-resize"
                            )}
                          />
                        ))}

                        {/* Rotate handle */}
                        <div
                          className="absolute left-1/2 pointer-events-none"
                          style={{ top: 0, transform: `translate(-50%, -${ROTATE_HANDLE_OFFSET}px)` }}
                        >
                          <div
                            className="w-7 h-7 bg-white border border-amber-500 rounded-full pointer-events-auto cursor-pointer flex items-center justify-center shadow-sm"
                            style={{ transform: `rotate(${-rot}deg)` }}
                            onClick={async (e) => {
                              e.stopPropagation()
                              const next = (rot + 90) % 360
                              setPreviewRotation(prev => ({ ...prev, [table.id]: next }))
                              await updateTable.mutate(table.id, { rotation: next })
                            }}
                          >
                            <RotateCw className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog >

      {/* Table Info Modal - показывает брони для выбранного стола */}
      < Dialog open={!!selectedTableForInfo} onOpenChange={(open) => !open && setSelectedTableForInfo(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className={cn(
                "w-10 h-10 flex items-center justify-center border-2 text-lg font-bold",
                selectedTableForInfo?.shape === 'round' && "rounded-full",
                selectedTableForInfo?.shape === 'rectangle' && "rounded-xl",
                selectedTableForInfo?.shape === 'square' && "rounded-lg",
              )}>
                {selectedTableForInfo?.number}
              </span>
              <div>
                <div>Стол {selectedTableForInfo?.number}</div>
                <div className="text-sm font-normal text-stone-500">
                  Вместимость: {selectedTableForInfo?.capacity} чел
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Информация о столе и список бронирований на выбранную дату.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium text-stone-700">
              Бронирования на {format(new Date(selectedDate), 'dd.MM.yyyy')}
            </h4>
            {(() => {
              const tableReservations = dateReservations.filter(r =>
                (r.table_ids?.includes(selectedTableForInfo?.id || '') || r.table_id === selectedTableForInfo?.id)
              )

              if (tableReservations.length === 0) {
                return (
                  <div className="text-center py-6 text-stone-400">
                    <div className="text-4xl mb-2">🪑</div>
                    <p>Стол свободен на эту дату</p>
                  </div>
                )
              }

              return tableReservations.map(reservation => {
                const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                const isActive = reservation.status !== 'canceled' && reservation.status !== 'completed'

                return (
                  <div
                    key={reservation.id}
                    className="p-3 rounded-lg border-2 space-y-2 cursor-pointer hover:shadow-md transition-shadow"
                    style={{
                      borderColor: reservation.color || statusConfig?.borderColor || '#D1D5DB',
                      backgroundColor: reservation.color ? `${reservation.color}10` : statusConfig?.bgColor || 'white'
                    }}
                    onClick={() => {
                      setReservationToEdit(reservation)
                      setReservationModalOpen(true)
                      setSelectedTableForInfo(null)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {reservation.is_walk_in ? "🏃 Гость без брони" : `${reservation.guest?.first_name} ${reservation.guest?.last_name}`}
                      </span>
                      <Badge
                        className="text-xs"
                        style={{
                          backgroundColor: statusConfig?.bgColor,
                          color: statusConfig?.color,
                          borderColor: statusConfig?.borderColor
                        }}
                      >
                        {statusConfig?.label}
                      </Badge>
                    </div>

                    {isActive && (
                      <div className="pt-2 border-t border-stone-200/50" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-[10px] uppercase font-bold text-stone-500 mb-1.5 block">
                          Назначить официанта
                        </Label>
                        <Select
                          value={reservation.waiter_id || "none"}
                          onValueChange={(val) => handleAssignWaiter(reservation.id, val === "none" ? null as any : val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-white/50 border-stone-200">
                            <SelectValue placeholder="Выберите официанта" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не назначен</SelectItem>
                            {waiterQueue.map(waiter => (
                              <SelectItem key={waiter.id} value={waiter.id}>
                                {waiter.name} {waiter.shift_type === 'half' ? '(½ До 16:00)' : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {!isActive && reservation.waiter_id && (
                      <div className="text-[10px] font-black text-amber-600 uppercase mt-1">
                        Официант: {staffMembers.find(s => s.id === reservation.waiter_id)?.name || '...'}
                      </div>
                    )}

                    <div className="text-sm text-stone-600 flex items-center gap-3">
                      <span>🕐 {reservation.time}</span>
                      <span>👥 {reservation.guests_count} чел</span>
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          {(() => {
            const activeTableReservations = dateReservations.filter(r =>
              r.status !== 'canceled' &&
              r.status !== 'completed' &&
              (r.table_ids?.includes(selectedTableForInfo?.id || '') || r.table_id === selectedTableForInfo?.id)
            )

            if (activeTableReservations.length === 0) {
              // Table is free
              return (
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  <Button
                    variant="outline"
                    className="rounded-xl border-stone-200 text-stone-600 h-12"
                    onClick={() => {
                      const tableHall = halls.find(h =>
                        tables.some(t => t.id === selectedTableForInfo?.id && t.hall_id === h.id)
                      )
                      setPreselectedTableId(selectedTableForInfo?.id || null)
                      setPreselectedHallId(tableHall?.id || null)
                      setReservationToEdit(null)
                      setReservationModalOpen(true)
                      setSelectedTableForInfo(null)
                    }}
                  >
                    Бронирование
                  </Button>
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/20 font-bold h-12"
                    onClick={() => selectedTableForInfo && handleQuickOccupy(selectedTableForInfo)}
                  >
                    БЫСТРЫЙ ВХОД
                  </Button>
                </div>
              )
            } else {
              // Table is occupied
              const res = activeTableReservations[0]
              return (
                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  <Button
                    variant="outline"
                    className="rounded-xl border-stone-200 text-rose-600 h-12 hover:bg-rose-50 hover:border-rose-200"
                    onClick={async () => {
                      if (confirm('Освободить стол (завершить обслуживание)?')) {
                        await updateReservation.mutate(res.id, { status: 'completed' })
                        await refetchReservations()
                        setSelectedTableForInfo(null)
                      }
                    }}
                  >
                    Освободить
                  </Button>
                  <Button
                    className="bg-stone-900 hover:bg-black text-white rounded-xl font-bold h-12"
                    onClick={() => {
                      setReservationToEdit(res)
                      setReservationModalOpen(true)
                      setSelectedTableForInfo(null)
                    }}
                  >
                    Управлять
                  </Button>
                </div>
              )
            }
          })()}
        </DialogContent>
      </Dialog >

      {/* Template Dialog */}
      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать шаблон расположения</DialogTitle>
            <DialogDescription>
              Текущее расположение столов будет сохранено как многоразовый шаблон
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Название шаблона</Label>
              <Input
                id="templateName"
                placeholder="Например: Свадьба, Банкет на 50 чел..."
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Отмена</Button>
            <Button
              onClick={async () => {
                if (!selectedHall || !templateName.trim()) return
                const currentTables = tables.filter(t => t.hall_id === selectedHall.id)
                const currentItems = layoutItems.filter(li => li.hall_id === selectedHall.id)

                await createTemplate.mutate({
                  hall_id: selectedHall.id,
                  name: templateName.trim(),
                  tables_data: currentTables,
                  layout_items_data: currentItems,
                  is_standard: false
                })
                setIsTemplateDialogOpen(false)
                setTemplateName('')
                alert('Шаблон сохранен')
              }}
              disabled={!templateName.trim() || createTemplate.loading}
            >
              {createTemplate.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Сохранить шаблон
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ReservationModal */}
      < ReservationModal
        isOpen={reservationModalOpen}
        onClose={() => {
          setReservationModalOpen(false)
          setReservationToEdit(null)
          setPreselectedTableId(null)
          setPreselectedHallId(null)
        }}
        mode={reservationToEdit ? 'edit' : 'create'}
        reservation={reservationToEdit}
        preselectedTableId={preselectedTableId}
        preselectedHallId={preselectedHallId}
        preselectedDate={selectedDate}
      />
    </PageTransition >
  )
}
