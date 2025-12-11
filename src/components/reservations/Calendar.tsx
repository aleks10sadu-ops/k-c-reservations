"use client"

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon
} from 'lucide-react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { Reservation } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ReservationCard } from './ReservationCard'

interface CalendarProps {
  reservations: Reservation[]
  onDateSelect?: (date: Date) => void
  onReservationClick?: (reservation: Reservation) => void
  onAddReservation?: (date: Date) => void
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function Calendar({ 
  reservations, 
  onDateSelect, 
  onReservationClick,
  onAddReservation 
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const getReservationsForDate = (date: Date) => {
    return reservations.filter(r => {
      const reservationDate = new Date(r.date)
      return isSameDay(reservationDate, date)
    })
  }

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const handleToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateSelect?.(date)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <motion.h2 
            key={format(currentDate, 'MMMM yyyy')}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-stone-900 capitalize"
          >
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </motion.h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="gap-2"
          >
            <CalendarIcon className="h-4 w-4" />
            Сегодня
          </Button>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
        {/* Week days header */}
        <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200">
          {weekDays.map((day, index) => (
            <div 
              key={day} 
              className={cn(
                "py-3 text-center text-sm font-medium text-stone-500",
                index >= 5 && "text-stone-400"
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => {
            const dayReservations = getReservationsForDate(day)
            const isCurrentMonth = isSameMonth(day, currentDate)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            const isTodayDate = isToday(day)

            return (
              <motion.div
                key={day.toISOString()}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => handleDateClick(day)}
                className={cn(
                  "min-h-[120px] sm:min-h-[140px] p-2 border-b border-r border-stone-100 cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-stone-50/50",
                  isCurrentMonth && "bg-white hover:bg-stone-50",
                  isTodayDate && "bg-amber-50/50",
                  isSelected && "ring-2 ring-inset ring-amber-500",
                  index % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span 
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium",
                      !isCurrentMonth && "text-stone-300",
                      isCurrentMonth && "text-stone-700",
                      isTodayDate && "bg-amber-500 text-white",
                      isSelected && !isTodayDate && "bg-stone-200"
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  
                  {isCurrentMonth && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        onAddReservation?.(day)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1 overflow-hidden">
                  <AnimatePresence>
                    {dayReservations.slice(0, 3).map((reservation, rIndex) => (
                      <motion.div
                        key={reservation.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: rIndex * 0.05 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onReservationClick?.(reservation)
                        }}
                      >
                        <ReservationCard reservation={reservation} compact />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {dayReservations.length > 3 && (
                    <div className="text-xs text-stone-500 text-center py-1">
                      +{dayReservations.length - 3} ещё
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Selected Date Details */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-stone-900">
                {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
              </h3>
              <Button
                onClick={() => onAddReservation?.(selectedDate)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Новая бронь
              </Button>
            </div>

            {getReservationsForDate(selectedDate).length === 0 ? (
              <div className="text-center py-8 text-stone-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                <p>Нет бронирований на эту дату</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {getReservationsForDate(selectedDate).map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                    onClick={() => onReservationClick?.(reservation)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

