"use client"

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, MapPin, Calendar, Loader2, Trash2, Save } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHalls, useReservations, useTables, useLayoutItems, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { cn, formatDate } from '@/lib/utils'
import { RESERVATION_STATUS_CONFIG, Table, Hall, LayoutItem } from '@/types'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function HallsPage() {
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isHallDialogOpen, setIsHallDialogOpen] = useState(false)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [hallForm, setHallForm] = useState({ name: '', capacity: 0, description: '' })
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
    corner: 'br' | 'tr' | 'bl' | 'tl'
    startMouseX: number
    startMouseY: number
    startW: number
    startH: number
    startX: number
    startY: number
  } | null>(null)
  const [rotating, setRotating] = useState<{ id: string; target: 'table' | 'layout'; centerX: number; centerY: number } | null>(null)
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
  const editorRef = useRef<HTMLDivElement | null>(null)
  const GRID = 10

  // Fetch data
  const { data: halls, loading: hallsLoading } = useHalls()
  const { data: tables } = useTables()
  const { data: layoutItems } = useLayoutItems(selectedHallId || undefined)
  
  // Mutations
  const createHall = useCreateMutation<Hall>('halls')
  const createTable = useCreateMutation<Table>('tables')
  const updateTable = useUpdateMutation<Table>('tables')
  const deleteTable = useDeleteMutation('tables')
  const createLayoutItem = useCreateMutation<LayoutItem>('layout_items')
  const updateLayoutItem = useUpdateMutation<LayoutItem>('layout_items')
  const deleteLayoutItem = useDeleteMutation('layout_items')

  // Get reservations for today
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data: todayReservations, loading: reservationsLoading } = useReservations({ date: today })

  // Set first hall as selected if none
  const selectedHall = selectedHallId 
    ? halls.find(h => h.id === selectedHallId) 
    : halls[0]

  // Get tables with their reservations
  const getTableReservation = (table: Table) => {
    return todayReservations.find(r => r.table_id === table.id || r.hall_id === table.hall_id)
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
            
            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="gap-2"
                onClick={() => {
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
                  onClick={() => setIsEditorOpen(true)}
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
            <TabsList className="mb-6">
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
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-amber-600" />
                          {hall.name}
                        </CardTitle>
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
                    <div className="lg:col-span-2">
                      <Card className="h-full">
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>Схема зала</span>
                            <Badge variant="secondary">
                              <Calendar className="h-3.5 w-3.5 mr-1" />
                              {formatDate(new Date())}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div
                            ref={previewRef}
                            role="button"
                            className="relative bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 min-h-[400px] p-4 transition hover:border-amber-300 cursor-pointer"
                            onClick={() => setIsEditorOpen(true)}
                          >
                            <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-stone-600 shadow-sm border border-stone-200">
                              <Plus className="h-3 w-3 text-amber-600" />
                              Редактировать схему
                            </div>

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
                                  }}
                                >
                                  {item.text || 'Элемент'}
                                </div>
                              ))}

                            {/* Tables visualization (read-only) */}
                            {hallTables.map((table) => {
                              const reservation = getTableReservation(table)
                              const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status] : null
                              
                              return (
                                <motion.div
                                  key={table.id}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.02 }}
                                  className={cn(
                                    "absolute transition-all border-2 flex flex-col items-center justify-center p-2",
                                    table.shape === 'round' && "rounded-full",
                                    table.shape === 'rectangle' && "rounded-xl",
                                    table.shape === 'square' && "rounded-lg",
                                    reservation 
                                      ? "shadow-lg" 
                                      : "bg-white border-stone-300"
                                  )}
                                  style={{
                                    left: table.position_x,
                                    top: table.position_y,
                                    width: table.width,
                                    height: table.height,
                                    backgroundColor: statusConfig?.bgColor || 'white',
                                    borderColor: statusConfig?.borderColor || '#D1D5DB',
                                    transform: `rotate(${table.rotation ?? 0}deg)`,
                                  }}
                                >
                                  <span className="font-bold text-lg" style={{ color: statusConfig?.color || '#374151' }}>
                                    {table.number}
                                  </span>
                                  <span className="text-xs" style={{ color: statusConfig?.color || '#6B7280' }}>
                                    {table.capacity} чел.
                                  </span>
                                  {reservation && (
                                    <span className="text-xs mt-1 truncate max-w-full px-1" style={{ color: statusConfig?.color }}>
                                      {reservation.guest?.last_name}
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

                            {/* Legend */}
                            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 pointer-events-none">
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
                          </div>
                        </CardContent>
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
                        <CardTitle>Бронирования на сегодня</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {reservationsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
                          </div>
                        ) : todayReservations.filter(r => r.hall_id === hall.id).length === 0 ? (
                          <p className="text-center py-8 text-stone-500">
                            Нет бронирований на сегодня
                          </p>
                        ) : (
                          <div className="divide-y divide-stone-100">
                            {todayReservations
                              .filter(r => r.hall_id === hall.id)
                              .sort((a, b) => a.time.localeCompare(b.time))
                              .map((reservation) => {
                                const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                                return (
                                  <div key={reservation.id} className="py-3 flex items-center justify-between">
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
                                          {reservation.time} • {reservation.guests_count} гостей
                                        </p>
                                      </div>
                                    </div>
                                <Badge 
                                  variant={reservation.status === 'new' ? 'new' : 
                                          reservation.status === 'in_progress' ? 'inProgress' :
                                          reservation.status === 'prepaid' ? 'prepaid' :
                                          reservation.status === 'paid' ? 'paid' : 'canceled'}
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
      <Dialog open={isHallDialogOpen} onOpenChange={setIsHallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый зал</DialogTitle>
            <DialogDescription>Создайте зал и позже добавьте столы</DialogDescription>
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
                await createHall.mutate(hallForm)
                setIsHallDialogOpen(false)
                setHallForm({ name: '', capacity: 0, description: '' })
              }}
              disabled={!hallForm.name || !hallForm.capacity}
            >
              {createHall.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Создать
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
            setRotating(null)
            setPreviewPos({})
            setPreviewSize({})
            setPreviewRotation({})
          }
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Редактор схемы зала</DialogTitle>
            <DialogDescription>
              Перемещайте, растягивайте и поворачивайте столы и элементы. Двойной клик — редактирование параметров.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="text-sm text-stone-600">
                Снап к сетке: {GRID}px • Двигать/ресайзить/крутить можно только в этом редакторе.
              </div>
              <div className="flex gap-2">
                {selectedHall && (
                  <Button
                    size="sm"
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
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить стол
                  </Button>
                )}
                {selectedHall && (
                  <Button
                    size="sm"
                    variant="outline"
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
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить элемент
                  </Button>
                )}
              </div>
            </div>

            <div
              ref={editorRef}
              className="relative bg-white rounded-xl border border-stone-200 min-h-[520px] overflow-hidden"
              onMouseMove={(e) => {
                if (!editorRef.current) return
                const rect = editorRef.current.getBoundingClientRect()
                const mouseX = e.clientX - rect.left
                const mouseY = e.clientY - rect.top

                const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max)

                if (dragging) {
                  const sourceTable = dragging.target === 'table' ? tables.find(t => t.id === dragging.id) : null
                  const sourceLayout = dragging.target === 'layout' ? layoutItems.find(li => li.id === dragging.id) : null
                  const size = previewSize[dragging.id] 
                    ?? (dragging.target === 'table' 
                      ? { w: sourceTable?.width ?? 100, h: sourceTable?.height ?? 100 }
                      : { w: sourceLayout?.width ?? 120, h: sourceLayout?.height ?? 40 })
                  const maxX = Math.max(0, rect.width - size.w)
                  const maxY = Math.max(0, rect.height - size.h)
                  const x = dragging.startX + (mouseX - dragging.startMouseX)
                  const y = dragging.startY + (mouseY - dragging.startMouseY)
                  const snapX = Math.round(clamp(x, 0, maxX) / GRID) * GRID
                  const snapY = Math.round(clamp(y, 0, maxY) / GRID) * GRID
                  setPreviewPos((prev) => ({ ...prev, [dragging.id]: { x: snapX, y: snapY } }))
                }

                if (resizing) {
                  const sourceTable = resizing.target === 'table' ? tables.find(t => t.id === resizing.id) : null
                  const sourceLayout = resizing.target === 'layout' ? layoutItems.find(li => li.id === resizing.id) : null
                  const baseW = sourceTable?.width ?? sourceLayout?.width ?? 100
                  const baseH = sourceTable?.height ?? sourceLayout?.height ?? 100
                  const { startMouseX, startMouseY, startW, startH, startX, startY, id, corner } = resizing
                  const deltaX = mouseX - startMouseX
                  const deltaY = mouseY - startMouseY

                  let newW = startW || baseW
                  let newH = startH || baseH
                  let newX = startX
                  let newY = startY

                  if (corner === 'br') {
                    newW = startW + deltaX
                    newH = startH + deltaY
                  } else if (corner === 'tr') {
                    newW = startW + deltaX
                    newH = startH - deltaY
                    newY = startY + deltaY
                  } else if (corner === 'bl') {
                    newW = startW - deltaX
                    newH = startH + deltaY
                    newX = startX + deltaX
                  } else if (corner === 'tl') {
                    newW = startW - deltaX
                    newH = startH - deltaY
                    newX = startX + deltaX
                    newY = startY + deltaY
                  }

                  newW = Math.max(40, newW)
                  newH = Math.max(40, newH)

                  const maxX = Math.max(0, rect.width - newW)
                  const maxY = Math.max(0, rect.height - newH)

                  newX = clamp(newX, 0, maxX)
                  newY = clamp(newY, 0, maxY)
                  newW = clamp(newW, 40, rect.width - newX)
                  newH = clamp(newH, 40, rect.height - newY)

                  newW = Math.round(newW / GRID) * GRID
                  newH = Math.round(newH / GRID) * GRID
                  newX = Math.round(newX / GRID) * GRID
                  newY = Math.round(newY / GRID) * GRID

                  setPreviewPos((prev) => ({ ...prev, [id]: { x: newX, y: newY } }))
                  setPreviewSize((prev) => ({ ...prev, [id]: { w: newW, h: newH } }))
                }

                if (rotating) {
                  const { centerX, centerY, id } = rotating
                  const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI)
                  setPreviewRotation((prev) => ({ ...prev, [id]: angle }))
                }
              }}
              onMouseUp={() => {
                if (dragging) {
                  const pos = previewPos[dragging.id]
                  if (pos) {
                    if (dragging.target === 'table') {
                      updateTable.mutate(dragging.id, {
                        position_x: pos.x,
                        position_y: pos.y,
                      })
                    } else {
                      updateLayoutItem.mutate(dragging.id, {
                        position_x: pos.x,
                        position_y: pos.y,
                      })
                    }
                  }
                  setDragging(null)
                }
                if (resizing) {
                  const pos = previewPos[resizing.id]
                  const size = previewSize[resizing.id]
                  if (pos && size) {
                    if (resizing.target === 'table') {
                      updateTable.mutate(resizing.id, {
                        position_x: pos.x,
                        position_y: pos.y,
                        width: size.w,
                        height: size.h,
                      })
                    } else {
                      updateLayoutItem.mutate(resizing.id, {
                        position_x: pos.x,
                        position_y: pos.y,
                        width: size.w,
                        height: size.h,
                      })
                    }
                  }
                  setResizing(null)
                }
                if (rotating) {
                  const angle = previewRotation[rotating.id]
                  if (angle !== undefined) {
                    if (rotating.target === 'table') {
                      updateTable.mutate(rotating.id, {
                        rotation: angle,
                      })
                    } else {
                      updateLayoutItem.mutate(rotating.id, {
                        rotation: angle,
                      })
                    }
                  }
                  setRotating(null)
                }
              }}
              onMouseLeave={() => {
                if (dragging) setDragging(null)
                if (resizing) setResizing(null)
                if (rotating) setRotating(null)
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
                      transformOrigin: 'center center',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      const rect = editorRef.current?.getBoundingClientRect()
                      if (!rect) return
                      // Middle button rotates, left button drags
                      if (e.button === 1) {
                        const centerX = pos.x + size.w / 2
                        const centerY = pos.y + size.h / 2
                        setRotating({ id: item.id, target: 'layout', centerX, centerY })
                        return
                      }
                      setDragging({
                        id: item.id,
                        target: 'layout',
                        startMouseX: e.clientX - rect.left,
                        startMouseY: e.clientY - rect.top,
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
                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      {[
                        { corner: 'tl', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
                        { corner: 'tr', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
                        { corner: 'bl', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
                        { corner: 'br', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
                      ].map((h) => (
                        <div
                          key={h.corner}
                          className={`absolute w-3 h-3 bg-white border border-amber-500 rounded-full ${h.className} pointer-events-auto`}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            const rect = editorRef.current?.getBoundingClientRect()
                            if (!rect) return
                            setResizing({
                              id: item.id,
                              target: 'layout',
                              corner: h.corner as 'tl' | 'tr' | 'bl' | 'br',
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
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 w-3 h-3 bg-white border border-amber-500 rounded-full pointer-events-auto cursor-alias"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const centerX = pos.x + size.w / 2
                          const centerY = pos.y + size.h / 2
                          setRotating({ id: item.id, target: 'layout', centerX, centerY })
                        }}
                      />
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
                      backgroundColor: statusConfig?.bgColor || 'white',
                      borderColor: statusConfig?.borderColor || '#D1D5DB',
                      transform: `rotate(${rot}deg)`,
                      transformOrigin: 'center center',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation()
                      const rect = editorRef.current?.getBoundingClientRect()
                      if (!rect) return
                      setDragging({
                        id: table.id,
                        target: 'table',
                        startMouseX: e.clientX - rect.left,
                        startMouseY: e.clientY - rect.top,
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
                    <span className="font-bold text-lg" style={{ color: statusConfig?.color || '#374151' }}>
                      {table.number}
                    </span>
                    <span className="text-xs" style={{ color: statusConfig?.color || '#6B7280' }}>
                      {table.capacity} чел.
                    </span>
                    {reservation && (
                      <span className="text-xs mt-1 truncate max-w-full px-1" style={{ color: statusConfig?.color }}>
                        {reservation.guest?.last_name}
                      </span>
                    )}

                    <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                      {[
                        { corner: 'tl', className: 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
                        { corner: 'tr', className: 'top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
                        { corner: 'bl', className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
                        { corner: 'br', className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
                      ].map((h) => (
                        <div
                          key={h.corner}
                          className={`absolute w-3 h-3 bg-white border border-amber-500 rounded-full ${h.className} pointer-events-auto`}
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            const rect = editorRef.current?.getBoundingClientRect()
                            if (!rect) return
                            setResizing({
                              id: table.id,
                              target: 'table',
                              corner: h.corner as 'tl' | 'tr' | 'bl' | 'br',
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
                        className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-5 w-3 h-3 bg-white border border-amber-500 rounded-full pointer-events-auto cursor-alias"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          const centerX = pos.x + size.w / 2
                          const centerY = pos.y + size.h / 2
                          setRotating({ id: table.id, target: 'table', centerX, centerY })
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
