"use client"

import { useEffect, useMemo, useState } from 'react'
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
  subMonths,
  addYears,
  subYears,
  addDays,
  subDays
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { getNowInMoscow, formatInMoscow } from '@/lib/date-utils'
import { Reservation, RESERVATION_STATUS_CONFIG } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ReservationCard } from './ReservationCard'

// Mobile dots component to display reservation status indicators
function ReservationDots({
  reservations,
  maxDots = 4
}: {
  reservations: Reservation[]
  maxDots?: number
}) {
  const displayDots = reservations.slice(0, maxDots)
  const remaining = reservations.length - maxDots

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
      {displayDots.map((reservation) => {
        const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
        return (
          <div
            key={reservation.id}
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: statusConfig.borderColor }}
            title={`${reservation.guest?.last_name || 'Гость'} - ${statusConfig.label}`}
          />
        )
      })}
      {remaining > 0 && (
        <div className="flex items-center gap-0.5 text-[10px] text-stone-400 font-medium">
          <Plus className="h-2.5 w-2.5" />
          <span>{remaining}</span>
        </div>
      )}
    </div>
  )
}

interface CalendarProps {
  reservations: Reservation[]
  onDateSelect?: (date: Date) => void
  onReservationClick?: (reservation: Reservation) => void
  onAddReservation?: (date: Date) => void
  onMonthChange?: (date: Date) => void
  currentDate?: Date
  viewMode: 'year' | 'month' | 'day' | 'list'
  onViewModeChange?: (mode: 'year' | 'month' | 'day' | 'list') => void
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function Calendar({
  reservations,
  onDateSelect,
  onReservationClick,
  onAddReservation,
  onMonthChange,
  currentDate: controlledDate,
  viewMode,
  onViewModeChange
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(controlledDate ?? getNowInMoscow())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Keep internal month in sync with the value provided by the parent
  useEffect(() => {
    if (controlledDate && !isSameMonth(controlledDate, currentDate)) {
      setCurrentDate(controlledDate)
    }
  }, [controlledDate, currentDate])

  // Reset selected date when leaving day view
  useEffect(() => {
    if (viewMode !== 'day') {
      setSelectedDate(null)
    }
  }, [viewMode])

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(currentDate)
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  }, [currentDate])

  const monthsOfYear = useMemo(() => {
    const year = currentDate.getFullYear()
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
  }, [currentDate])

  const getReservationsForDate = (date: Date) => {
    return reservations.filter(r => {
      const reservationDate = new Date(r.date)
      return isSameDay(reservationDate, date)
    })
  }

  const getReservationsForMonth = (date: Date) => {
    return reservations.filter((r) => isSameMonth(new Date(r.date), date))
  }

  const handlePrev = () => {
    let newDate: Date

    if (viewMode === 'year') {
      newDate = subYears(currentDate, 1)
    } else if (viewMode === 'day' && selectedDate) {
      // В режиме дня навигируем по дням
      newDate = subDays(selectedDate, 1)
      setSelectedDate(newDate)
    } else {
      newDate = subMonths(currentDate, 1)
    }

    setCurrentDate(newDate)
    onMonthChange?.(newDate)
  }

  const handleNext = () => {
    let newDate: Date

    if (viewMode === 'year') {
      newDate = addYears(currentDate, 1)
    } else if (viewMode === 'day' && selectedDate) {
      // В режиме дня навигируем по дням
      newDate = addDays(selectedDate, 1)
      setSelectedDate(newDate)
    } else {
      newDate = addMonths(currentDate, 1)
    }

    setCurrentDate(newDate)
    onMonthChange?.(newDate)
  }

  const handleToday = () => {
    const today = getNowInMoscow()
    setCurrentDate(today)
    setSelectedDate(today)
    onViewModeChange?.('day')
    onMonthChange?.(today)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    // На мобильных переходим в day view (там покажем список броней на день)
    onViewModeChange?.('day')
    setCurrentDate(date)
    onMonthChange?.(date)
    onDateSelect?.(date)
  }

  const handleBackToMonth = () => {
    onViewModeChange?.('month')
    setSelectedDate(null)
  }

  const handleMonthTileClick = (monthDate: Date) => {
    setCurrentDate(monthDate)
    onMonthChange?.(monthDate)
    onViewModeChange?.('month')
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={viewMode === 'year' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange?.('year')}
              className="text-base sm:text-lg font-semibold"
            >
              {formatInMoscow(viewMode === 'day' && selectedDate ? selectedDate : currentDate, 'yyyy')}
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange?.('month')}
              className="text-base sm:text-lg font-semibold capitalize"
            >
              {formatInMoscow(viewMode === 'day' && selectedDate ? selectedDate : currentDate, 'LLLL')}
            </Button>
            {/* Day view indicator */}
            {viewMode === 'day' && selectedDate && (
              <Button
                variant="default"
                size="sm"
                className="text-base sm:text-lg font-semibold"
              >
                {formatInMoscow(selectedDate, 'd')}
              </Button>
            )}
          </div>
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
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {viewMode === 'year' && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {monthsOfYear.map((monthDate) => {
              const monthReservations = getReservationsForMonth(monthDate)
              const sample = monthReservations.slice(0, 2)
              const remaining = monthReservations.length - sample.length

              return (
                <motion.button
                  key={monthDate.toISOString()}
                  whileHover={{ scale: 1.01 }}
                  className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/60"
                  onClick={() => handleMonthTileClick(monthDate)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold capitalize">
                      {formatInMoscow(monthDate, 'LLLL')}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {monthReservations.length} брони
                    </Badge>
                  </div>
                  <div className="space-y-1 text-xs text-stone-600">
                    {sample.map((r) => (
                      <div key={r.id} className="truncate">
                        {formatInMoscow(new Date(r.date), 'd MMM')} · {r.guest?.last_name || 'Гость'}
                      </div>
                    ))}
                    {remaining > 0 && (
                      <div className="text-amber-600 font-medium">
                        +{remaining} ещё
                      </div>
                    )}
                    {monthReservations.length === 0 && (
                      <div className="text-stone-400">Нет броней</div>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'month' && (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
          {/* Week days header */}
          <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-200">
            {weekDays.map((day, index) => (
              <div
                key={day}
                className={cn(
                  "py-2 sm:py-3 text-center text-xs sm:text-sm font-medium text-stone-500",
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
                    "group border-b border-r border-stone-100 cursor-pointer transition-colors",
                    // Mobile: compact cells, Desktop: larger cells for cards
                    isMobile ? "min-h-[60px] p-1.5" : "min-h-[160px] p-2",
                    !isCurrentMonth && "bg-stone-50/50",
                    isCurrentMonth && "bg-white hover:bg-stone-50",
                    isTodayDate && "bg-amber-50/50",
                    isSelected && "ring-2 ring-inset ring-amber-500",
                    index % 7 === 6 && "border-r-0"
                  )}
                >
                  <div className={cn(
                    "flex items-center",
                    isMobile ? "justify-center" : "justify-between mb-2"
                  )}>
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full font-medium",
                        isMobile ? "h-6 w-6 text-xs" : "h-7 w-7 text-sm",
                        !isCurrentMonth && "text-stone-300",
                        isCurrentMonth && "text-stone-700",
                        isTodayDate && "bg-amber-500 text-white",
                        isSelected && !isTodayDate && "bg-stone-200"
                      )}
                    >
                      {formatInMoscow(day, 'd')}
                    </span>

                    {isCurrentMonth && !isMobile && (
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

                  {/* Mobile: show dots, Desktop: show cards */}
                  {isMobile ? (
                    <ReservationDots reservations={dayReservations} maxDots={4} />
                  ) : (
                    <div className="space-y-2">
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
                            className="touch-manipulation"
                          >
                            <ReservationCard reservation={reservation} compact />
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {dayReservations.length > 3 && (
                        <div className="text-sm sm:text-xs text-stone-500 text-center py-1">
                          +{dayReservations.length - 3} ещё
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      )}


      {viewMode === 'day' && selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 shadow-sm"
        >
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">
                  {formatInMoscow(selectedDate, 'd MMMM yyyy')}
                </h3>
                <p className="text-sm text-stone-500">
                  Бронирований: {getReservationsForDate(selectedDate).length}
                </p>
              </div>
              {!isMobile && (
                <Button variant="outline" onClick={handleBackToMonth} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Назад к календарю
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              {isMobile && (
                <Button
                  variant="outline"
                  onClick={handleBackToMonth}
                  className="flex-1 gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Календарь
                </Button>
              )}
              <Button
                onClick={() => onAddReservation?.(selectedDate)}
                className={cn("gap-2", isMobile ? "flex-1" : "")}
              >
                <Plus className="h-4 w-4" />
                Новая бронь
              </Button>
            </div>
          </div>

          {getReservationsForDate(selectedDate).length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-stone-300" />
              <p>Нет бронирований на эту дату</p>
            </div>
          ) : (
            <div className={cn(
              "gap-3",
              isMobile ? "space-y-3" : "grid sm:grid-cols-2 lg:grid-cols-3"
            )}>
              {getReservationsForDate(selectedDate).map((reservation) => (
                <motion.div
                  key={reservation.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onReservationClick?.(reservation)}
                  className="cursor-pointer"
                >
                  <ReservationCard
                    reservation={reservation}
                    onClick={() => onReservationClick?.(reservation)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

