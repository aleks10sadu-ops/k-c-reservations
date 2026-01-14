"use client"

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    Plus
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
import { AuditLog, AUDIT_ACTION_CONFIG } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AuditLogCard } from './AuditLogCard'

// Dots component to display action indicators
function AuditDots({
    logs,
    maxDots = 4
}: {
    logs: AuditLog[]
    maxDots?: number
}) {
    const displayDots = logs.slice(0, maxDots)
    const remaining = logs.length - maxDots

    return (
        <div className="flex items-center justify-center gap-1 flex-wrap mt-1">
            {displayDots.map((log) => {
                const config = AUDIT_ACTION_CONFIG[log.action]
                return (
                    <div
                        key={log.id}
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: config.borderColor }}
                        title={`${config.label} - ${log.table_name}`}
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

interface AuditCalendarProps {
    logs: AuditLog[]
    onDateSelect?: (date: Date) => void
    onLogClick?: (log: AuditLog) => void
    onUndo?: (id: string) => void
    isUndoingId?: string | null
    onMonthChange?: (date: Date) => void
    currentDate?: Date
    viewMode: 'year' | 'month' | 'day' | 'list'
    onViewModeChange?: (mode: 'year' | 'month' | 'day' | 'list') => void
}

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function AuditCalendar({
    logs,
    onDateSelect,
    onLogClick,
    onUndo,
    isUndoingId,
    onMonthChange,
    currentDate: controlledDate,
    viewMode,
    onViewModeChange
}: AuditCalendarProps) {
    const [currentDate, setCurrentDate] = useState(controlledDate ?? new Date())
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

    const getLogsForDate = (date: Date) => {
        return logs.filter(l => {
            const logDate = new Date(l.created_at)
            return isSameDay(logDate, date)
        })
    }

    const getLogsForMonth = (date: Date) => {
        return logs.filter((l) => isSameMonth(new Date(l.created_at), date))
    }

    const handlePrev = () => {
        let newDate: Date

        if (viewMode === 'year') {
            newDate = subYears(currentDate, 1)
        } else if (viewMode === 'day' && selectedDate) {
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
            newDate = addDays(selectedDate, 1)
            setSelectedDate(newDate)
        } else {
            newDate = addMonths(currentDate, 1)
        }

        setCurrentDate(newDate)
        onMonthChange?.(newDate)
    }

    const handleToday = () => {
        const today = new Date()
        setCurrentDate(today)
        setSelectedDate(today)
        onViewModeChange?.('day')
        onMonthChange?.(today)
    }

    const handleDateClick = (date: Date) => {
        setSelectedDate(date)
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
                            {format(viewMode === 'day' && selectedDate ? selectedDate : currentDate, 'yyyy', { locale: ru })}
                        </Button>
                        <Button
                            variant={viewMode === 'month' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => onViewModeChange?.('month')}
                            className="text-base sm:text-lg font-semibold capitalize"
                        >
                            {format(viewMode === 'day' && selectedDate ? selectedDate : currentDate, 'LLLL', { locale: ru })}
                        </Button>
                        {/* Day view indicator */}
                        {viewMode === 'day' && selectedDate && (
                            <Button
                                variant="default"
                                size="sm"
                                className="text-base sm:text-lg font-semibold"
                            >
                                {format(selectedDate, 'd', { locale: ru })}
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
                        <Button variant="ghost" size="icon" onClick={handlePrev}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleNext}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === 'year' && (
                <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {monthsOfYear.map((monthDate) => {
                            const monthLogs = getLogsForMonth(monthDate)
                            const sample = monthLogs.slice(0, 2)
                            const remaining = monthLogs.length - sample.length

                            return (
                                <motion.button
                                    key={monthDate.toISOString()}
                                    whileHover={{ scale: 1.01 }}
                                    className="rounded-xl border border-stone-200 bg-stone-50/60 p-3 text-left transition hover:border-amber-300 hover:bg-amber-50/60"
                                    onClick={() => handleMonthTileClick(monthDate)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold capitalize">
                                            {format(monthDate, 'LLLL', { locale: ru })}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                            {monthLogs.length}
                                        </Badge>
                                    </div>
                                    <div className="space-y-1 text-xs text-stone-600">
                                        {sample.map((l) => (
                                            <div key={l.id} className="truncate">
                                                {format(new Date(l.created_at), 'd MMM', { locale: ru })} · {l.table_name}
                                            </div>
                                        ))}
                                        {remaining > 0 && (
                                            <div className="text-amber-600 font-medium">
                                                +{remaining} ещё
                                            </div>
                                        )}
                                        {monthLogs.length === 0 && (
                                            <div className="text-stone-400">Нет действий</div>
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
                            const dayLogs = getLogsForDate(day)
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
                                            {format(day, 'd')}
                                        </span>
                                    </div>

                                    {/* Mobile: show dots, Desktop: show cards */}
                                    {isMobile ? (
                                        <AuditDots logs={dayLogs} maxDots={4} />
                                    ) : (
                                        <div className="space-y-2">
                                            <AnimatePresence>
                                                {dayLogs.slice(0, 3).map((log, rIndex) => (
                                                    <motion.div
                                                        key={log.id}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: 10 }}
                                                        transition={{ delay: rIndex * 0.05 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            onLogClick?.(log)
                                                        }}
                                                        className="touch-manipulation"
                                                    >
                                                        <AuditLogCard log={log} compact />
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>

                                            {dayLogs.length > 3 && (
                                                <div className="text-sm sm:text-xs text-stone-500 text-center py-1">
                                                    +{dayLogs.length - 3} ещё
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
                                    {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                                </h3>
                                <p className="text-sm text-stone-500">
                                    Действий: {getLogsForDate(selectedDate).length}
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
                        </div>
                    </div>

                    {getLogsForDate(selectedDate).length === 0 ? (
                        <div className="text-center py-12 text-stone-500">
                            <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                            <p>Нет действий за эту дату</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {getLogsForDate(selectedDate).map((log) => (
                                <motion.div
                                    key={log.id}
                                    layout
                                >
                                    <AuditLogCard
                                        log={log}
                                        isUndoing={isUndoingId === log.id}
                                        onUndo={onUndo}
                                        onViewDetails={onLogClick}
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
