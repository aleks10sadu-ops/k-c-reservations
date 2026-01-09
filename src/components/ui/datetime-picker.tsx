"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import { Calendar, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from './button'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { cn } from '@/lib/utils'

const isMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
}

// Названия месяцев на русском
const monthNames = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

// Названия дней недели на русском (сокращенные) - начинаем с понедельника
const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface DateTimePickerProps {
  value?: Date | string
  onChange?: (date: string, time?: string) => void
  dateOnly?: boolean
  timeOnly?: boolean
  showTime?: boolean
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  dateOnly = false,
  timeOnly = false,
  showTime = true,
  placeholder,
  className,
  disabled = false
}: DateTimePickerProps) {
  const componentKey = timeOnly ? `time-${value}` : `date-${value}`
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'time'>('calendar')
  const timeInputRef = useRef<HTMLInputElement>(null)

  // Состояние для wheel picker
  const [wheelHours, setWheelHours] = useState(18)
  const [wheelMinutes, setWheelMinutes] = useState(0)

  const itemHeight = 32
  const hoursRef = useRef<HTMLDivElement>(null)
  const minutesRef = useRef<HTMLDivElement>(null)
  
  // Флаг для блокировки обработки скролла во время инициализации (для мобильного wheel picker)
  const isInitializingRef = useRef(false)

  // Парсинг начального значения
  useEffect(() => {
    if (timeOnly) {
      if (value && typeof value === 'string' && value.match(/^\d{2}:\d{2}$/)) {
        setSelectedTime(value)
        const [hoursStr, minutesStr] = value.split(':')
        const hours = parseInt(hoursStr || '18', 10)
        const minutes = parseInt(minutesStr || '0', 10)
        setWheelHours(hours)
        setWheelMinutes(minutes)
      } else if (!selectedTime) {
        setSelectedTime('18:00')
        setWheelHours(18)
        setWheelMinutes(0)
      }
    } else {
      // Для даты обрабатываем как раньше
      if (value) {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          setSelectedDate(date)
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          setSelectedTime(`${hours}:${minutes}`)
        } else if (typeof value === 'string') {
          // Если передана только дата в формате YYYY-MM-DD
          if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const date = new Date(value + 'T12:00:00')
            setSelectedDate(date)
          }
        }
      }
    }
  }, [value, timeOnly])

  // Форматирование отображаемого значения
  const formatDisplayValue = () => {
    if (dateOnly && selectedDate) {
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const year = selectedDate.getFullYear()
      return `${day}.${month}.${year}`
    }

    if (timeOnly && selectedTime) {
      return selectedTime
    }

    if (selectedDate && showTime && selectedTime) {
      const day = String(selectedDate.getDate()).padStart(2, '0')
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const year = selectedDate.getFullYear()
      return `${day}.${month}.${year} ${selectedTime}`
    }

    return placeholder || (dateOnly ? 'Выберите дату' : timeOnly ? 'Выберите время' : 'Выберите дату и время')
  }

  // Генерация дней месяца
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()

    // Определяем день недели первого дня месяца (0 - воскресенье, 1 - понедельник, ...)
    const firstDayOfWeek = firstDay.getDay()
    const startDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // Понедельник - первый день

    const days = []

    // Добавляем дни предыдущего месяца
    const prevMonth = new Date(year, month - 1)
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay - i),
        isCurrentMonth: false
      })
    }

    // Добавляем дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(year, month, day),
        isCurrentMonth: true
      })
    }

    // Добавляем дни следующего месяца
    const remainingDays = 42 - days.length // 6 недель * 7 дней = 42
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false
      })
    }

    return days
  }

  const daysInMonth = getDaysInMonth(currentMonth)

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    handleConfirm()
  }

  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
  }

  const handleConfirm = () => {
    if (dateOnly && selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      onChange?.(dateStr)
    } else if (timeOnly && selectedTime) {
      onChange?.('', selectedTime)
    } else if (selectedDate && selectedTime) {
      const dateStr = selectedDate.toISOString().split('T')[0]
      onChange?.(dateStr, selectedTime)
    }
    setIsOpen(false)
  }

  const handleCancel = () => {
    setIsOpen(false)
    setViewMode('calendar')
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev)
      if (direction === 'prev') {
        newMonth.setMonth(newMonth.getMonth() - 1)
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1)
      }
      return newMonth
    })
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    setSelectedDate(today)
  }

  const isSelectedDate = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Функции для управления значениями времени (вынесены на верхний уровень для соблюдения правил хуков)
  const handleHourChange = useCallback((hour: number) => {
    const clampedHour = Math.max(0, Math.min(23, hour))
    setWheelHours(clampedHour)
    const newTime = `${clampedHour.toString().padStart(2, '0')}:${wheelMinutes.toString().padStart(2, '0')}`
    setSelectedTime(newTime)
    onChange?.('', newTime)
  }, [wheelMinutes, onChange])

  const handleMinuteChange = useCallback((minute: number) => {
    const clampedMinute = Math.max(0, Math.min(59, minute))
    setWheelMinutes(clampedMinute)
    const newTime = `${wheelHours.toString().padStart(2, '0')}:${clampedMinute.toString().padStart(2, '0')}`
    setSelectedTime(newTime)
    onChange?.('', newTime)
  }, [wheelHours, onChange])

  // Константы для мобильного wheel picker
  const mobileItemHeight = 44
  const mobileContainerHeight = 176
  const mobilePaddingHeight = (mobileContainerHeight - mobileItemHeight) / 2

  // Инициализация скролла для мобильного wheel picker
  useEffect(() => {
    if (timeOnly && isMobile() && isOpen) {
      isInitializingRef.current = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (hoursRef.current) {
            hoursRef.current.scrollTop = wheelHours * mobileItemHeight
          }
          if (minutesRef.current) {
            minutesRef.current.scrollTop = wheelMinutes * mobileItemHeight
          }
          setTimeout(() => {
            isInitializingRef.current = false
          }, 200)
        })
      })
    }
  }, [isOpen, wheelHours, wheelMinutes, timeOnly])

  // Для режима только времени показываем разные интерфейсы для мобильных и десктопа
  if (timeOnly) {
    const mobileDevice = isMobile()

    if (mobileDevice) {
      // Для мобильных: красивый iOS-style wheel picker
      const handleMobileHourSelect = (hour: number) => {
        handleHourChange(hour)
        if (hoursRef.current) {
          hoursRef.current.scrollTo({
            top: hour * mobileItemHeight,
            behavior: 'smooth'
          })
        }
      }

      const handleMobileMinuteSelect = (minute: number) => {
        handleMinuteChange(minute)
        if (minutesRef.current) {
          minutesRef.current.scrollTo({
            top: minute * mobileItemHeight,
            behavior: 'smooth'
          })
        }
      }

      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2 text-base font-medium ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-all duration-200",
                className
              )}
              disabled={disabled}
            >
              <Clock className="h-5 w-5 mr-2 text-stone-400" />
              <span>{selectedTime || '18:00'}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[280px] p-0 overflow-hidden" 
            align="center"
            sideOffset={8}
          >
            {/* Wheel Pickers */}
            <div className="flex items-center justify-center gap-2 p-4 bg-stone-50 rounded-xl">
              {/* Hours wheel */}
              <div className="flex flex-col items-center">
                <span className="text-xs text-stone-500 mb-2 font-medium">Часы</span>
                <div className="relative">
                  <div
                    ref={hoursRef}
                    className="h-[176px] w-[72px] overflow-y-auto bg-white rounded-xl shadow-inner"
                    onScroll={() => {
                      if (isInitializingRef.current) return
                      clearTimeout((window as any).hourScrollTimeout)
                      ;(window as any).hourScrollTimeout = setTimeout(() => {
                        if (!hoursRef.current || isInitializingRef.current) return
                        const scrollTop = hoursRef.current.scrollTop
                        const index = Math.round(scrollTop / mobileItemHeight)
                        const clampedIndex = Math.max(0, Math.min(23, index))
                        hoursRef.current.scrollTo({
                          top: clampedIndex * mobileItemHeight,
                          behavior: 'smooth'
                        })
                        handleHourChange(clampedIndex)
                      }, 100)
                    }}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <style>{`
                      div::-webkit-scrollbar { display: none; }
                    `}</style>
                    <div style={{ height: `${mobilePaddingHeight}px` }} />
                    {Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-center text-lg font-semibold cursor-pointer transition-all",
                          i === wheelHours 
                            ? "text-amber-600 scale-110" 
                            : "text-stone-400 hover:text-stone-600"
                        )}
                        style={{
                          height: `${mobileItemHeight}px`
                        }}
                        onClick={() => handleMobileHourSelect(i)}
                      >
                        {i.toString().padStart(2, '0')}
                      </div>
                    ))}
                    <div style={{ height: `${mobilePaddingHeight}px` }} />
                  </div>
                  {/* Selection indicator */}
                  <div className="absolute top-1/2 left-0 right-0 h-[44px] -translate-y-1/2 border-y-2 border-amber-400 bg-amber-50/50 rounded pointer-events-none" />
                </div>
              </div>

              <span className="text-3xl font-bold text-stone-300 mx-1">:</span>

              {/* Minutes wheel */}
              <div className="flex flex-col items-center">
                <span className="text-xs text-stone-500 mb-2 font-medium">Минуты</span>
                <div className="relative">
                  <div
                    ref={minutesRef}
                    className="h-[176px] w-[72px] overflow-y-auto bg-white rounded-xl shadow-inner"
                    onScroll={() => {
                      if (isInitializingRef.current) return
                      clearTimeout((window as any).minuteScrollTimeout)
                      ;(window as any).minuteScrollTimeout = setTimeout(() => {
                        if (!minutesRef.current || isInitializingRef.current) return
                        const scrollTop = minutesRef.current.scrollTop
                        const index = Math.round(scrollTop / mobileItemHeight)
                        const clampedIndex = Math.max(0, Math.min(59, index))
                        minutesRef.current.scrollTo({
                          top: clampedIndex * mobileItemHeight,
                          behavior: 'smooth'
                        })
                        handleMinuteChange(clampedIndex)
                      }, 100)
                    }}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <div style={{ height: `${mobilePaddingHeight}px` }} />
                    {Array.from({ length: 60 }, (_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-center text-lg font-semibold cursor-pointer transition-all",
                          i === wheelMinutes 
                            ? "text-amber-600 scale-110" 
                            : "text-stone-400 hover:text-stone-600"
                        )}
                        style={{
                          height: `${mobileItemHeight}px`
                        }}
                        onClick={() => handleMobileMinuteSelect(i)}
                      >
                        {i.toString().padStart(2, '0')}
                      </div>
                    ))}
                    <div style={{ height: `${mobilePaddingHeight}px` }} />
                  </div>
                  {/* Selection indicator */}
                  <div className="absolute top-1/2 left-0 right-0 h-[44px] -translate-y-1/2 border-y-2 border-amber-400 bg-amber-50/50 rounded pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end p-3 bg-white border-t border-stone-100">
              <Button 
                onClick={() => setIsOpen(false)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6"
              >
                Готово
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )
    } else {
      // Для десктопа: ручной ввод цифр с кнопками +/-
      const handleHourInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '')
        if (val === '') {
          setWheelHours(0)
          return
        }
        const hour = Math.min(23, Math.max(0, parseInt(val, 10)))
        handleHourChange(hour)
      }

      const handleMinuteInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '')
        if (val === '') {
          setWheelMinutes(0)
          return
        }
        const minute = Math.min(59, Math.max(0, parseInt(val, 10)))
        handleMinuteChange(minute)
      }

      const incrementHour = () => handleHourChange((wheelHours + 1) % 24)
      const decrementHour = () => handleHourChange((wheelHours - 1 + 24) % 24)
      const incrementMinute = () => handleMinuteChange((wheelMinutes + 1) % 60)
      const decrementMinute = () => handleMinuteChange((wheelMinutes - 1 + 60) % 60)

      return (
        <div key={componentKey} className={cn("inline-flex items-center gap-1", className)}>
          {/* Hours input */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={incrementHour}
              className="p-1 text-stone-400 hover:text-amber-600 transition-colors"
              tabIndex={-1}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={wheelHours.toString().padStart(2, '0')}
              onChange={handleHourInput}
              onFocus={(e) => e.target.select()}
              className="w-12 h-10 text-center text-lg font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={2}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={decrementHour}
              className="p-1 text-stone-400 hover:text-amber-600 transition-colors"
              tabIndex={-1}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <span className="text-2xl font-bold text-stone-400 mx-1">:</span>

          {/* Minutes input */}
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={incrementMinute}
              className="p-1 text-stone-400 hover:text-amber-600 transition-colors"
              tabIndex={-1}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              value={wheelMinutes.toString().padStart(2, '0')}
              onChange={handleMinuteInput}
              onFocus={(e) => e.target.select()}
              className="w-12 h-10 text-center text-lg font-semibold bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              maxLength={2}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={decrementMinute}
              className="p-1 text-stone-400 hover:text-amber-600 transition-colors"
              tabIndex={-1}
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      )
    }
  }

  return (
    <Popover key={componentKey} open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{formatDisplayValue()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4">
          {/* Заголовок календаря */}
          {viewMode === 'calendar' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="h-8 w-8 p-0"
                >
                  ‹
                </Button>
                <div className="text-center">
                  <span className="font-semibold">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="h-8 w-8 p-0"
                >
                  ›
                </Button>
              </div>

              {/* Дни недели */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-neutral-400 py-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Дни месяца */}
              <div className="grid grid-cols-7 gap-1">
                {daysInMonth.map((dayInfo, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 text-sm",
                      !dayInfo.isCurrentMonth && "text-neutral-400",
                      isSelectedDate(dayInfo.date) && "bg-amber-500 text-white hover:bg-amber-600",
                      isToday(dayInfo.date) && !isSelectedDate(dayInfo.date) && "bg-amber-100"
                    )}
                    onClick={() => handleDateSelect(dayInfo.date)}
                  >
                    {dayInfo.date.getDate()}
                  </Button>
                ))}
              </div>

              {/* Кнопки управления */}
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Сегодня
                </Button>
              </div>
            </>
          )}

          {/* Выбор времени */}
          {viewMode === 'time' && (
            <>
              <div className="text-center mb-4">
                <h3 className="font-semibold">Выберите время</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  <Input
                    ref={timeInputRef}
                    type="time"
                    value={selectedTime}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="w-32"
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" size="sm" onClick={() => setViewMode('calendar')}>
                    Назад
                  </Button>
                  <Button variant="default" size="sm" onClick={handleConfirm}>
                    Готово
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
