"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, MapPin, Calendar, Loader2, Trash2, Save, Pen } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useHalls, useReservations, useTables, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { cn, formatDate } from '@/lib/utils'
import { RESERVATION_STATUS_CONFIG, Table, Hall } from '@/types'
import { format } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function HallsPage() {
  const [selectedHallId, setSelectedHallId] = useState<string | null>(null)
  const [isHallDialogOpen, setIsHallDialogOpen] = useState(false)
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false)
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

  // Fetch data
  const { data: halls, loading: hallsLoading } = useHalls()
  const { data: tables } = useTables()
  
  // Mutations
  const createHall = useCreateMutation<Hall>('halls')
  const updateHall = useUpdateMutation<Hall>('halls')
  const deleteHall = useDeleteMutation('halls')
  const createTable = useCreateMutation<Table>('tables')
  const updateTable = useUpdateMutation<Table>('tables')
  const deleteTable = useDeleteMutation('tables')

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
                  onClick={() => {
                    setEditingTable(null)
                    setTableForm({
                      hall_id: selectedHall.id,
                      number: (tables.filter(t=>t.hall_id===selectedHall.id).length || 0) + 1,
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
                  <Plus className="h-5 w-5" />
                  Добавить стол
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
                          <div className="relative bg-stone-50 rounded-xl border-2 border-dashed border-stone-200 min-h-[400px] p-4">
                            {/* Tables visualization */}
                            {hallTables.map((table) => {
                              const reservation = getTableReservation(table)
                              const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status] : null
                              
                              return (
                                <motion.div
                                  key={table.id}
                                  initial={{ opacity: 0, scale: 0 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.05 }}
                                  className={cn(
                                    "absolute cursor-pointer transition-all border-2 flex flex-col items-center justify-center p-2",
                                    table.shape === 'round' && "rounded-full",
                                    table.shape === 'rectangle' && "rounded-xl",
                                    table.shape === 'square' && "rounded-lg",
                                    reservation 
                                      ? "shadow-lg" 
                                      : "bg-white border-stone-300 hover:border-amber-400"
                                  )}
                                  style={{
                                    left: table.position_x,
                                    top: table.position_y,
                                    width: table.width,
                                    height: table.height,
                                    backgroundColor: statusConfig?.bgColor || 'white',
                                    borderColor: statusConfig?.borderColor || '#D1D5DB',
                                  }}
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
                            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
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
    </PageTransition>
  )
}
