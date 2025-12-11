"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Users, MapPin, Calendar } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockHalls, mockReservations, mockTables } from '@/store/mockData'
import { cn, formatDate } from '@/lib/utils'
import { RESERVATION_STATUS_CONFIG, Table } from '@/types'

export default function HallsPage() {
  const [selectedHall, setSelectedHall] = useState(mockHalls[0])

  // Get reservations for today
  const today = new Date().toISOString().split('T')[0]
  const todayReservations = mockReservations.filter(r => r.date === today)

  // Get tables with their reservations
  const getTableReservation = (table: Table) => {
    return todayReservations.find(r => r.table_id === table.id || r.hall_id === table.hall_id)
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
            
            <Button size="lg" className="gap-2 shadow-lg shadow-amber-500/25">
              <Plus className="h-5 w-5" />
              Добавить зал
            </Button>
          </motion.div>
        </div>

        {/* Halls Tabs */}
        <Tabs defaultValue={selectedHall.id} onValueChange={(v) => {
          const hall = mockHalls.find(h => h.id === v)
          if (hall) setSelectedHall(hall)
        }}>
          <TabsList className="mb-6">
            {mockHalls.map((hall) => (
              <TabsTrigger key={hall.id} value={hall.id} className="gap-2">
                <MapPin className="h-4 w-4" />
                {hall.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {mockHalls.map((hall) => {
            const hallTables = mockTables.filter(t => t.hall_id === hall.id)
            
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
                                   reservation.status === 'in_progress' ? 'inProgress' : 'new')
                                  : 'outline'
                                }
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
                      {todayReservations.filter(r => r.hall_id === hall.id).length === 0 ? (
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
                                            reservation.status === 'prepaid' ? 'prepaid' : 'paid'}
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
      </div>
    </PageTransition>
  )
}

