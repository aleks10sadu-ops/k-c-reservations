"use client"

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, MapPin, Loader2, Trash2, Save, Pencil, RotateCw, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHalls, useReservations, useTables, useLayoutItems, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { cn, formatTime } from '@/lib/utils'
import { RESERVATION_STATUS_CONFIG, Table, Hall, LayoutItem } from '@/types'
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
  const [dragging, setDragging] = useState<{
    id: string
    target: 'table' | 'layout'
    startMouseX: number
    startMouseY: number
    startX: number
    startY: number
  } | null>(null)
  const [resizing, setResizing] = useState<{
    id: string
    target: 'table' | 'layout'
    corner: 'br' | 'tr' | 'bl' | 'tl' | 'left' | 'right' | 'top' | 'bottom'
    startMouseX: number
    startMouseY: number
    startW: number
    startH: number
    startX: number
    startY: number
  } | null>(null)
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
  // Фиксированные размеры канваса - одинаковые везде для консистентности
  const CANVAS_WIDTH = 800
  const CANVAS_HEIGHT = 600
  const ROTATE_HANDLE_OFFSET = 24
  const [previewScale, setPreviewScale] = useState(1)
  const [baseEditorScale, setBaseEditorScale] = useState(1) // Scale to fit canvas in container

  // Pan & Zoom state for editor (100% = fits container, 200% = 2x larger, etc.)
  const [editorZoom, setEditorZoom] = useState(1)
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null)

  // Combined scale = base scale (to fit) * user zoom
  const editorScale = baseEditorScale * editorZoom

  // Reset pan/zoom when opening editor
  const resetEditorView = () => {
    setEditorZoom(1)
    setEditorPan({ x: 0, y: 0 })
  }

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keep preview/editor scaled to fit containers without overflow
  const computePreviewScale = () => {
    // Get available width from viewport minus padding (32px page padding + 16px card padding each side)
    const availableW = window.innerWidth - 64
    const availableH = window.innerHeight * 0.55 // Max 55% of viewport height

    const scale = Math.min(1, Math.min(availableW / CANVAS_WIDTH, availableH / CANVAS_HEIGHT))
    return Math.max(0.35, scale) // Minimum 35% scale
  }

  const computeEditorScale = (el: HTMLDivElement | null) => {
    if (!el) return 1
    const padding = 32
    const availableW = el.clientWidth - padding
    const availableH = window.innerHeight * 0.55 // Use more height

    // Scale to fit the available space (can scale up or down)
    const scale = Math.min(availableW / CANVAS_WIDTH, availableH / CANVAS_HEIGHT)
    return Math.max(0.5, scale) // Minimum 50% scale
  }

  useEffect(() => {
    const updateScale = () => setPreviewScale(computePreviewScale())
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [isMobile])

  useEffect(() => {
    const el = editorWrapperRef.current
    if (!el) return
    const updateScale = () => setBaseEditorScale(computeEditorScale(el))
    updateScale()
    const ro = new ResizeObserver(updateScale)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isEditorOpen, isMobile])

  // Fetch data
  const { data: halls, loading: hallsLoading } = useHalls()
  const { data: tables, refetch: refetchTables } = useTables(undefined, true) // loadAll = true для страницы залов
  const { data: layoutItems, refetch: refetchLayoutItems } = useLayoutItems(selectedHallId || undefined)

  // Mutations
  const createHall = useCreateMutation<Hall>('halls')
  const updateHall = useUpdateMutation<Hall>('halls')
  const deleteHall = useDeleteMutation('halls')
  const createTable = useCreateMutation<Table>('tables')
  const updateTable = useUpdateMutation<Table>('tables')
  const deleteTable = useDeleteMutation('tables')
  const createLayoutItem = useCreateMutation<LayoutItem>('layout_items')
  const updateLayoutItem = useUpdateMutation<LayoutItem>('layout_items')
  const deleteLayoutItem = useDeleteMutation('layout_items')

  // Get reservations for selected date
  const { data: dateReservations, loading: reservationsLoading } = useReservations({ date: selectedDate })

  // Set first hall as selected if none
  const selectedHall = selectedHallId
    ? halls.find(h => h.id === selectedHallId)
    : halls[0]

  // Get tables with their reservations
  const getTableReservation = (table: Table) => {
    return dateReservations.find(r =>
      (r.id !== focusedReservationId && r.status !== 'canceled' && r.status !== 'completed' && (r.table_id === table.id || (r.table_ids && r.table_ids.includes(table.id)))) ||
      (r.id === focusedReservationId && (r.table_id === table.id || (r.table_ids && r.table_ids.includes(table.id))))
    )
  }


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

            <div className="flex flex-wrap gap-3 items-center justify-end">
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => {
                  setEditingHall(null)
                  setHallForm({ name: '', capacity: 0, description: '' })
                  setIsHallDialogOpen(true)
                }}
              >
                <Plus className="h-5 w-5" />
                Добавить зал
              </Button>
              {selectedHall && (
                <Button
                  size="lg"
                  className="gap-2 shadow-lg shadow-amber-500/25"
                  onClick={() => {
                    resetEditorView()
                    setIsEditorOpen(true)
                  }}
                >
                  Редактор схемы
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

            {halls.map((hall) => {
              const hallTables = tables.filter(t => t.hall_id === hall.id)

              return (
                <TabsContent key={hall.id} value={hall.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                  >
                    {/* Hall Info */}
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
                          <h4 className="font-medium text-stone-900 mb-2">Столы ({hallTables.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {hallTables.map((table) => {
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

                    {/* Floor Plan */}
                    <div className="lg:col-span-2 order-first lg:order-none">
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
                              {layoutItems
                                .filter((item) => item.hall_id === hall.id)
                                .map((item) => (
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
                                      transformOrigin: 'top left',
                                    }}
                                  >
                                    {item.text || 'Элемент'}
                                  </div>
                                ))}

                              {/* Tables visualization (read-only) */}
                              {hallTables.map((table) => {
                                const reservation = getTableReservation(table)
                                const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status] : null

                                // Determine visual state based on focus
                                const isFocused = focusedReservationId !== null
                                const isPartOfFocus = reservation?.id === focusedReservationId

                                // Default styles
                                // User requested: Table body = Status Color. Circle = Custom Color.
                                let bgColor = statusConfig?.bgColor || 'white'
                                let borderColor = statusConfig?.borderColor || '#D1D5DB'
                                let textColor = statusConfig?.color || '#374151'
                                let opacity = 1
                                let scale = 1

                                if (isFocused) {
                                  if (isPartOfFocus) {
                                    // Highlighted: Use status colors (already set above)
                                    // We don't override with custom color here anymore
                                    scale = 1.1 // Slightly larger
                                  } else {
                                    // Dimmed: Gray out
                                    bgColor = '#f5f5f4' // stone-100
                                    borderColor = '#e7e5e4' // stone-200
                                    textColor = '#d6d3d1' // stone-300
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
                                      transformOrigin: 'top left',
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedTableForInfo(table)
                                    }}
                                  >
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

                              {hallTables.length === 0 && (
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
                  </motion.div>

                  {/* Today's reservations for this hall */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-6"
                  >
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
                  </motion.div>
                </TabsContent>
              )
            })}
          </Tabs>
        )}
      </div>

      {/* Hall Dialog */}
      <Dialog
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
      </Dialog>

      {/* Layout Item Dialog */}
      <Dialog open={isLayoutDialogOpen} onOpenChange={setIsLayoutDialogOpen}>
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
      </Dialog>

      {/* Table Dialog */}
      <Dialog open={isTableDialogOpen} onOpenChange={setIsTableDialogOpen}>
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
      </Dialog>

      {/* Editor Modal */}
      <Dialog
        open={isEditorOpen}
        onOpenChange={(open) => {
          setIsEditorOpen(open)
          if (!open) {
            setDragging(null)
            setResizing(null)
            setPreviewPos({})
            setPreviewSize({})
            setPreviewRotation({})
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] sm:w-full max-h-[95vh] sm:max-h-[90vh]">
          <DialogHeader className="pb-2 sm:pb-4">
            <DialogTitle className="text-lg sm:text-xl">Редактор схемы зала</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {isMobile ? 'Перетаскивайте столы. Двойной тап — редактирование.' : 'Перемещайте, растягивайте и поворачивайте столы и элементы. Двойной клик — редактирование параметров.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 overflow-y-auto flex-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm text-stone-600 hidden sm:block">
                Снап к сетке: {GRID}px • Двигать/ресайзить/крутить можно только в этом редакторе
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
                  {isMobile ? 'ОК' : 'Сохранить'}
                </Button>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorZoom(z => Math.max(0.5, z - 0.25))}
                disabled={editorZoom <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-stone-600 min-w-[60px] text-center">
                {Math.round(editorZoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorZoom(z => Math.min(3, z + 0.25))}
                disabled={editorZoom >= 3}
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
              className="flex items-center justify-center w-full overflow-hidden relative"
              style={{
                minHeight: isMobile ? 280 : Math.min(CANVAS_HEIGHT + 80, window.innerHeight * 0.55),
                maxHeight: isMobile ? 'calc(100vh - 280px)' : 'calc(100vh - 300px)'
              }}
              onMouseDown={(e) => {
                // Start panning if clicking on the wrapper (not on canvas elements)
                if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.pannable) {
                  setIsPanning(true)
                  setPanStart({ x: e.clientX - editorPan.x, y: e.clientY - editorPan.y })
                }
              }}
              onMouseMove={(e) => {
                if (isPanning && !dragging && !resizing) {
                  setEditorPan({
                    x: e.clientX - panStart.x,
                    y: e.clientY - panStart.y
                  })
                }
              }}
              onMouseUp={() => setIsPanning(false)}
              onMouseLeave={() => setIsPanning(false)}
              onTouchStart={(e) => {
                // Handle pinch-to-zoom
                if (e.touches.length === 2) {
                  const distance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  )
                  setLastPinchDistance(distance)
                } else if (e.touches.length === 1 && !dragging && !resizing) {
                  // Single finger pan
                  setIsPanning(true)
                  setPanStart({
                    x: e.touches[0].clientX - editorPan.x,
                    y: e.touches[0].clientY - editorPan.y
                  })
                }
              }}
              onTouchMove={(e) => {
                if (e.touches.length === 2 && lastPinchDistance !== null) {
                  // Pinch zoom
                  const distance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                  )
                  const scale = distance / lastPinchDistance
                  setEditorZoom(z => Math.max(0.5, Math.min(3, z * scale)))
                  setLastPinchDistance(distance)
                  e.preventDefault()
                } else if (isPanning && e.touches.length === 1 && !dragging && !resizing) {
                  setEditorPan({
                    x: e.touches[0].clientX - panStart.x,
                    y: e.touches[0].clientY - panStart.y
                  })
                }
              }}
              onTouchEnd={() => {
                setIsPanning(false)
                setLastPinchDistance(null)
              }}
              onWheel={(e) => {
                // Mouse wheel zoom
                e.preventDefault()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                setEditorZoom(z => Math.max(0.5, Math.min(3, z + delta)))
              }}
            >
              <div
                style={{
                  transform: `translate(${editorPan.x}px, ${editorPan.y}px)`,
                  transition: isPanning ? 'none' : 'transform 0.1s ease-out'
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
                    touchAction: 'none', // Prevent browser touch gestures while editing
                  }}
                  onTouchMove={(e) => {
                    if (!editorRef.current || (!dragging && !resizing)) return
                    e.preventDefault()
                    const touch = e.touches[0]
                    const rect = editorRef.current.getBoundingClientRect()
                    const mouseX = (touch.clientX - rect.left) / (editorScale)
                    const mouseY = (touch.clientY - rect.top) / (editorScale)

                    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

                    if (dragging) {
                      const sourceTable = dragging.target === 'table' ? tables.find(t => t.id === dragging.id) : null
                      const sourceLayout = dragging.target === 'layout' ? layoutItems.find(li => li.id === dragging.id) : null
                      const size = previewSize[dragging.id]
                        ?? (dragging.target === 'table'
                          ? { w: sourceTable?.width ?? 100, h: sourceTable?.height ?? 100 }
                          : { w: sourceLayout?.width ?? 120, h: sourceLayout?.height ?? 40 })
                      const maxX = Math.max(0, CANVAS_WIDTH - size.w)
                      const maxY = Math.max(0, CANVAS_HEIGHT - size.h)
                      const x = dragging.startX + (mouseX - dragging.startMouseX)
                      const y = dragging.startY + (mouseY - dragging.startMouseY)
                      setPreviewPos((prev) => ({ ...prev, [dragging.id]: { x: clamp(x, 0, maxX), y: clamp(y, 0, maxY) } }))
                    }

                    if (resizing) {
                      const sourceTable = resizing.target === 'table' ? tables.find(t => t.id === resizing.id) : null
                      const sourceLayout = resizing.target === 'layout' ? layoutItems.find(li => li.id === resizing.id) : null
                      const baseW = sourceTable?.width ?? sourceLayout?.width ?? 100
                      const baseH = sourceTable?.height ?? sourceLayout?.height ?? 100
                      const { startMouseX, startMouseY, startW, startH, startX, startY, id, corner } = resizing
                      const deltaX = mouseX - startMouseX
                      const deltaY = mouseY - startMouseY
                      const currentRot = previewRotation[id] ?? (resizing.target === 'table'
                        ? tables.find(t => t.id === id)?.rotation ?? 0
                        : layoutItems.find(li => li.id === id)?.rotation ?? 0)
                      const rad = (currentRot * Math.PI) / 180
                      const cos = Math.cos(rad)
                      const sin = Math.sin(rad)
                      const localX = deltaX * cos + deltaY * sin
                      const localY = -deltaX * sin + deltaY * cos

                      let newW = startW || baseW
                      let newH = startH || baseH
                      let newX = startX
                      let newY = startY

                      if (corner === 'right') newW = startW + localX
                      else if (corner === 'left') { newW = startW - localX; newX = startX + localX * cos; newY = startY + localX * -sin }
                      else if (corner === 'bottom') newH = startH + localY
                      else if (corner === 'top') { newH = startH - localY; newX = startX + localY * sin; newY = startY + localY * cos }
                      else if (corner === 'br') { newW = startW + localX; newH = startH + localY }
                      else if (corner === 'tr') { newW = startW + localX; newH = startH - localY; newX = startX + localY * sin; newY = startY + localY * cos }
                      else if (corner === 'bl') { newW = startW - localX; newH = startH + localY; newX = startX + localX * cos; newY = startY + localX * -sin }
                      else if (corner === 'tl') { newW = startW - localX; newH = startH - localY; newX = startX + localX * cos + localY * sin; newY = startY - localX * sin + localY * cos }

                      newW = Math.max(40, newW)
                      newH = Math.max(40, newH)
                      const maxX = Math.max(0, CANVAS_WIDTH - newW)
                      const maxY = Math.max(0, CANVAS_HEIGHT - newY)
                      newX = clamp(newX, 0, maxX)
                      newY = clamp(newY, 0, maxY)
                      newW = clamp(newW, 40, CANVAS_WIDTH - newX)
                      newH = clamp(newH, 40, CANVAS_HEIGHT - newY)

                      setPreviewPos((prev) => ({ ...prev, [id]: { x: newX, y: newY } }))
                      setPreviewSize((prev) => ({ ...prev, [id]: { w: newW, h: newH } }))
                    }
                  }}
                  onTouchEnd={() => {
                    if (dragging) {
                      const pos = previewPos[dragging.id]
                      if (pos) {
                        const snapX = Math.round(pos.x / GRID) * GRID
                        const snapY = Math.round(pos.y / GRID) * GRID
                        if (dragging.target === 'table') {
                          updateTable.mutate(dragging.id, { position_x: snapX, position_y: snapY })
                        } else {
                          updateLayoutItem.mutate(dragging.id, { position_x: snapX, position_y: snapY })
                        }
                        setPreviewPos((prev) => ({ ...prev, [dragging.id]: { x: snapX, y: snapY } }))
                      }
                      setDragging(null)
                    }
                    if (resizing) {
                      const pos = previewPos[resizing.id]
                      const size = previewSize[resizing.id]
                      if (pos && size) {
                        const snapX = Math.round(pos.x / GRID) * GRID
                        const snapY = Math.round(pos.y / GRID) * GRID
                        const snapW = Math.round(size.w / GRID) * GRID
                        const snapH = Math.round(size.h / GRID) * GRID
                        if (resizing.target === 'table') {
                          updateTable.mutate(resizing.id, { position_x: snapX, position_y: snapY, width: snapW, height: snapH })
                        } else {
                          updateLayoutItem.mutate(resizing.id, { position_x: snapX, position_y: snapY, width: snapW, height: snapH })
                        }
                        setPreviewPos((prev) => ({ ...prev, [resizing.id]: { x: snapX, y: snapY } }))
                        setPreviewSize((prev) => ({ ...prev, [resizing.id]: { w: snapW, h: snapH } }))
                      }
                      setResizing(null)
                    }
                  }}
                  onMouseMove={(e) => {
                    if (!editorRef.current) return
                    const rect = editorRef.current.getBoundingClientRect()
                    // ВАЖНО: делим на editorScale для правильного пересчёта координат
                    const mouseX = (e.clientX - rect.left) / editorScale
                    const mouseY = (e.clientY - rect.top) / editorScale

                    const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

                    if (dragging) {
                      const sourceTable = dragging.target === 'table' ? tables.find(t => t.id === dragging.id) : null
                      const sourceLayout = dragging.target === 'layout' ? layoutItems.find(li => li.id === dragging.id) : null
                      const size = previewSize[dragging.id]
                        ?? (dragging.target === 'table'
                          ? { w: sourceTable?.width ?? 100, h: sourceTable?.height ?? 100 }
                          : { w: sourceLayout?.width ?? 120, h: sourceLayout?.height ?? 40 })
                      // Используем CANVAS размеры, а не rect
                      const maxX = Math.max(0, CANVAS_WIDTH - size.w)
                      const maxY = Math.max(0, CANVAS_HEIGHT - size.h)
                      const x = dragging.startX + (mouseX - dragging.startMouseX)
                      const y = dragging.startY + (mouseY - dragging.startMouseY)
                      const clampedX = clamp(x, 0, maxX)
                      const clampedY = clamp(y, 0, maxY)
                      setPreviewPos((prev) => ({ ...prev, [dragging.id]: { x: clampedX, y: clampedY } }))
                    }

                    if (resizing) {
                      const sourceTable = resizing.target === 'table' ? tables.find(t => t.id === resizing.id) : null
                      const sourceLayout = resizing.target === 'layout' ? layoutItems.find(li => li.id === resizing.id) : null
                      const baseW = sourceTable?.width ?? sourceLayout?.width ?? 100
                      const baseH = sourceTable?.height ?? sourceLayout?.height ?? 100
                      const { startMouseX, startMouseY, startW, startH, startX, startY, id, corner } = resizing
                      const deltaX = mouseX - startMouseX
                      const deltaY = mouseY - startMouseY
                      const currentRot = previewRotation[id] ?? (resizing.target === 'table'
                        ? tables.find(t => t.id === id)?.rotation ?? 0
                        : layoutItems.find(li => li.id === id)?.rotation ?? 0)
                      const rad = (currentRot * Math.PI) / 180
                      const cos = Math.cos(rad)
                      const sin = Math.sin(rad)
                      // Проекция смещения на локальные оси элемента
                      const localX = deltaX * cos + deltaY * sin
                      const localY = -deltaX * sin + deltaY * cos

                      let newW = startW || baseW
                      let newH = startH || baseH
                      let newX = startX
                      let newY = startY

                      if (corner === 'right') {
                        newW = startW + localX
                      } else if (corner === 'left') {
                        newW = startW - localX
                        // сдвиг в мировых координатах вдоль локальной оси X
                        newX = startX + localX * cos
                        newY = startY + localX * -sin
                      } else if (corner === 'bottom') {
                        newH = startH + localY
                      } else if (corner === 'top') {
                        newH = startH - localY
                        newX = startX + localY * sin
                        newY = startY + localY * cos
                      } else if (corner === 'br') {
                        newW = startW + localX
                        newH = startH + localY
                      } else if (corner === 'tr') {
                        newW = startW + localX
                        newH = startH - localY
                        newX = startX + localY * sin
                        newY = startY + localY * cos
                      } else if (corner === 'bl') {
                        newW = startW - localX
                        newH = startH + localY
                        newX = startX + localX * cos
                        newY = startY + localX * -sin
                      } else if (corner === 'tl') {
                        newW = startW - localX
                        newH = startH - localY
                        newX = startX + localX * cos + localY * sin
                        newY = startY - localX * sin + localY * cos
                      }

                      newW = Math.max(40, newW)
                      newH = Math.max(40, newH)

                      // Используем CANVAS размеры, а не rect
                      const maxX = Math.max(0, CANVAS_WIDTH - newW)
                      const maxY = Math.max(0, CANVAS_HEIGHT - newH)

                      newX = clamp(newX, 0, maxX)
                      newY = clamp(newY, 0, maxY)
                      newW = clamp(newW, 40, CANVAS_WIDTH - newX)
                      newH = clamp(newH, 40, CANVAS_HEIGHT - newY)

                      setPreviewPos((prev) => ({ ...prev, [id]: { x: newX, y: newY } }))
                      setPreviewSize((prev) => ({ ...prev, [id]: { w: newW, h: newH } }))
                    }

                  }}
                  onMouseUp={() => {
                    if (dragging) {
                      const pos = previewPos[dragging.id]
                      if (pos) {
                        const snapX = Math.round(pos.x / GRID) * GRID
                        const snapY = Math.round(pos.y / GRID) * GRID
                        if (dragging.target === 'table') {
                          updateTable.mutate(dragging.id, {
                            position_x: snapX,
                            position_y: snapY,
                          })
                        } else {
                          updateLayoutItem.mutate(dragging.id, {
                            position_x: snapX,
                            position_y: snapY,
                          })
                        }
                        setPreviewPos((prev) => ({ ...prev, [dragging.id]: { x: snapX, y: snapY } }))
                      }
                      setDragging(null)
                    }
                    if (resizing) {
                      const pos = previewPos[resizing.id]
                      const size = previewSize[resizing.id]
                      if (pos && size) {
                        const snapX = Math.round(pos.x / GRID) * GRID
                        const snapY = Math.round(pos.y / GRID) * GRID
                        const snapW = Math.round(size.w / GRID) * GRID
                        const snapH = Math.round(size.h / GRID) * GRID
                        if (resizing.target === 'table') {
                          updateTable.mutate(resizing.id, {
                            position_x: snapX,
                            position_y: snapY,
                            width: snapW,
                            height: snapH,
                          })
                        } else {
                          updateLayoutItem.mutate(resizing.id, {
                            position_x: snapX,
                            position_y: snapY,
                            width: snapW,
                            height: snapH,
                          })
                        }
                        setPreviewPos((prev) => ({ ...prev, [resizing.id]: { x: snapX, y: snapY } }))
                        setPreviewSize((prev) => ({ ...prev, [resizing.id]: { w: snapW, h: snapH } }))
                      }
                      setResizing(null)
                    }
                  }}
                  onMouseLeave={() => {
                    if (dragging) setDragging(null)
                    if (resizing) setResizing(null)
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
                        className="absolute bg-white border border-stone-300 rounded-lg shadow-sm p-2 group cursor-move select-none"
                        style={{
                          left: pos.x,
                          top: pos.y,
                          width: size.w,
                          height: size.h,
                          transform: `rotate(${rot}deg)`,
                          transformOrigin: 'top left',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const rect = editorRef.current?.getBoundingClientRect()
                          if (!rect) return
                          setDragging({
                            id: item.id,
                            target: 'layout',
                            startMouseX: (e.clientX - rect.left) / (editorScale),
                            startMouseY: (e.clientY - rect.top) / (editorScale),
                            startX: pos.x,
                            startY: pos.y,
                          })
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          const rect = editorRef.current?.getBoundingClientRect()
                          if (!rect) return
                          const touch = e.touches[0]
                          setDragging({
                            id: item.id,
                            target: 'layout',
                            startMouseX: (touch.clientX - rect.left) / (editorScale),
                            startMouseY: (touch.clientY - rect.top) / (editorScale),
                            startX: pos.x,
                            startY: pos.y,
                          })
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
                          className="w-full h-full flex items-center justify-center text-sm text-stone-800"
                          style={{
                            color: item.color || '#1f2937',
                            backgroundColor: item.bg_color || '#ffffff',
                          }}
                        >
                          {item.text || 'Элемент'}
                        </div>

                        {/* Resize & rotate handles */}
                        <div className="absolute inset-0 pointer-events-none">
                          {[
                            { corner: 'left', className: 'absolute left-0 top-0 h-full w-3 cursor-ew-resize' },
                            { corner: 'right', className: 'absolute right-0 top-0 h-full w-3 cursor-ew-resize' },
                            { corner: 'top', className: 'absolute top-0 left-0 w-full h-3 cursor-ns-resize' },
                            { corner: 'bottom', className: 'absolute bottom-0 left-0 w-full h-3 cursor-ns-resize' },
                          ].map((h) => (
                            <div
                              key={h.corner}
                              className={`${h.className} pointer-events-auto`}
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                const rect = editorRef.current?.getBoundingClientRect()
                                if (!rect) return
                                setResizing({
                                  id: item.id,
                                  target: 'layout',
                                  corner: h.corner as 'left' | 'right' | 'top' | 'bottom',
                                  startMouseX: e.clientX - rect.left,
                                  startMouseY: e.clientY - rect.top,
                                  startW: size.w,
                                  startH: size.h,
                                  startX: pos.x,
                                  startY: pos.y,
                                })
                              }}
                            />
                          ))}

                          <div
                            className="absolute left-1/2 pointer-events-none"
                            style={{ top: 0, transform: `translate(-50%, -${ROTATE_HANDLE_OFFSET}px)` }}
                          >
                            <div
                              className="w-7 h-7 bg-white border border-amber-500 rounded-full pointer-events-auto cursor-pointer flex items-center justify-center shadow-sm"
                              style={{ transform: `rotate(${-rot}deg)` }}
                              onClick={async (e) => {
                                e.stopPropagation()
                                const next = ((rot ?? 0) + 90) % 360
                                setPreviewRotation((prev) => ({ ...prev, [item.id]: next }))
                                await updateLayoutItem.mutate(item.id, { rotation: next })
                              }}
                              title="Повернуть вправо"
                            >
                              <RotateCw className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Tables */}
                  {selectedHall && tables.filter(t => t.hall_id === selectedHall.id).map((table) => {
                    const reservation = getTableReservation(table)
                    const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status] : null
                    const pos = previewPos[table.id] ?? { x: table.position_x, y: table.position_y }
                    const size = previewSize[table.id] ?? { w: table.width, h: table.height }
                    const rot = previewRotation[table.id] ?? table.rotation ?? 0
                    return (
                      <div
                        key={table.id}
                        className={cn(
                          "absolute transition-all border-2 flex flex-col items-center justify-center p-2 group bg-white select-none",
                          table.shape === 'round' && "rounded-full",
                          table.shape === 'rectangle' && "rounded-xl",
                          table.shape === 'square' && "rounded-lg",
                          reservation
                            ? "shadow-lg"
                            : "border-stone-300"
                        )}
                        style={{
                          left: pos.x,
                          top: pos.y,
                          width: size.w,
                          height: size.h,
                          backgroundColor: reservation?.color || statusConfig?.bgColor || 'white',
                          borderColor: reservation?.color || statusConfig?.borderColor || '#D1D5DB',
                          transform: `rotate(${rot}deg)`,
                          transformOrigin: 'top left',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const rect = editorRef.current?.getBoundingClientRect()
                          if (!rect) return
                          setDragging({
                            id: table.id,
                            target: 'table',
                            startMouseX: (e.clientX - rect.left) / (editorScale),
                            startMouseY: (e.clientY - rect.top) / (editorScale),
                            startX: pos.x,
                            startY: pos.y,
                          })
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation()
                          const rect = editorRef.current?.getBoundingClientRect()
                          if (!rect) return
                          const touch = e.touches[0]
                          setDragging({
                            id: table.id,
                            target: 'table',
                            startMouseX: (touch.clientX - rect.left) / (editorScale),
                            startMouseY: (touch.clientY - rect.top) / (editorScale),
                            startX: pos.x,
                            startY: pos.y,
                          })
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
                            className="absolute -top-2 -right-2 h-3.5 w-3.5 rounded-full border border-white shadow"
                            style={{ backgroundColor: reservation.color || statusConfig?.borderColor || '#f59e0b' }}
                          />
                        )}
                        <span className="font-bold text-lg leading-tight" style={{ color: statusConfig?.color || '#374151' }}>
                          {table.number}
                        </span>
                        {table.capacity > 0 && (
                          <span className="text-[10px] text-stone-500 leading-tight">
                            {table.capacity} чел
                          </span>
                        )}
                        <div
                          className="absolute inset-0 pointer-events-none"
                        >
                          {[
                            { corner: 'left', className: 'absolute left-0 top-0 h-full w-3 cursor-ew-resize' },
                            { corner: 'right', className: 'absolute right-0 top-0 h-full w-3 cursor-ew-resize' },
                            { corner: 'top', className: 'absolute top-0 left-0 w-full h-3 cursor-ns-resize' },
                            { corner: 'bottom', className: 'absolute bottom-0 left-0 w-full h-3 cursor-ns-resize' },
                          ].map((h) => (
                            <div
                              key={h.corner}
                              className={`${h.className} pointer-events-auto`}
                              onMouseDown={(e) => {
                                e.stopPropagation()
                                const rect = editorRef.current?.getBoundingClientRect()
                                if (!rect) return
                                setResizing({
                                  id: table.id,
                                  target: 'table',
                                  corner: h.corner as 'left' | 'right' | 'top' | 'bottom',
                                  startMouseX: e.clientX - rect.left,
                                  startMouseY: e.clientY - rect.top,
                                  startW: size.w,
                                  startH: size.h,
                                  startX: pos.x,
                                  startY: pos.y,
                                })
                              }}
                            />
                          ))}

                          <div
                            className="absolute left-1/2 pointer-events-none"
                            style={{ top: 0, transform: `translate(-50%, -${ROTATE_HANDLE_OFFSET}px)` }}
                          >
                            <div
                              className="w-7 h-7 bg-white border border-amber-500 rounded-full pointer-events-auto cursor-pointer flex items-center justify-center shadow-sm"
                              style={{ transform: `rotate(${-rot}deg)` }}
                              onClick={async (e) => {
                                e.stopPropagation()
                                const next = ((rot ?? 0) + 90) % 360
                                setPreviewRotation((prev) => ({ ...prev, [table.id]: next }))
                                await updateTable.mutate(table.id, { rotation: next })
                              }}
                              title="Повернуть вправо"
                            >
                              <RotateCw className="h-4 w-4" />
                            </div>
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
      </Dialog>

      {/* Table Info Modal - показывает брони для выбранного стола */}
      <Dialog open={!!selectedTableForInfo} onOpenChange={(open) => !open && setSelectedTableForInfo(null)}>
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
          </DialogHeader>

          {/* Брони за этим столом на выбранную дату */}
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
                return (
                  <div
                    key={reservation.id}
                    className="p-3 rounded-lg border-2 space-y-1 cursor-pointer hover:shadow-md transition-shadow"
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
                        {reservation.guest?.first_name} {reservation.guest?.last_name}
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
                    <div className="text-sm text-stone-600 flex items-center gap-3">
                      <span>🕐 {reservation.time}</span>
                      <span>👥 {reservation.guests_count} чел</span>
                    </div>
                    {reservation.guest?.phone && (
                      <div className="text-sm text-stone-500">
                        📞 {reservation.guest.phone}
                      </div>
                    )}
                    {reservation.comments && (
                      <div className="text-sm text-stone-500 italic">
                        💬 {reservation.comments}
                      </div>
                    )}
                    <div className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Нажмите чтобы открыть
                    </div>
                  </div>
                )
              })
            })()}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedTableForInfo(null)}>
              Закрыть
            </Button>
            {(() => {
              const tableReservations = dateReservations.filter(r =>
                (r.table_ids?.includes(selectedTableForInfo?.id || '') || r.table_id === selectedTableForInfo?.id)
              )

              if (tableReservations.length === 0) {
                // Стол свободен - кнопка создания брони
                return (
                  <Button onClick={() => {
                    // Находим зал для этого стола
                    const tableHall = halls.find(h =>
                      tables.some(t => t.id === selectedTableForInfo?.id && t.hall_id === h.id)
                    )
                    setPreselectedTableId(selectedTableForInfo?.id || null)
                    setPreselectedHallId(tableHall?.id || null)
                    setReservationToEdit(null)
                    setReservationModalOpen(true)
                    setSelectedTableForInfo(null)
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    Добавить бронь
                  </Button>
                )
              }

              // Есть брони - можно кликнуть на конкретную бронь выше
              return null
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* ReservationModal */}
      <ReservationModal
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
    </PageTransition>
  )
}
