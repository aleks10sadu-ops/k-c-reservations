"use client"

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Clock } from 'lucide-react'

const cn = (...classes: (string | undefined | null | boolean)[]) => classes.filter(Boolean).join(' ')

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: "default" | "outline"
  className?: string
  disabled?: boolean
  asChild?: boolean
}

const Button = ({ children, onClick, variant = "default", className, disabled, asChild, ...props }: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  const variants = {
    default: "bg-amber-500 text-white hover:bg-amber-600",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
  }

  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{className?: string, onClick?: () => void, disabled?: boolean}>
    return React.cloneElement(childElement, {
      ...props,
      className: cn(baseStyles, variants[variant], className, childElement.props.className),
      onClick: onClick || childElement.props.onClick,
      disabled: disabled || childElement.props.disabled
    })
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], "px-4 py-2", className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

interface PopoverProps {
  children: React.ReactNode
  open: boolean
  onOpenChange: (open: boolean) => void
}

const Popover = ({ children, open, onOpenChange }: PopoverProps) => {
  return (
    <div className="relative inline-block w-full">
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<Partial<PopoverProps>>, { open, onOpenChange })
        }
        return child
      })}
    </div>
  )
}

interface PopoverTriggerProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  asChild?: boolean
}

const PopoverTrigger = ({ children, open, onOpenChange, asChild }: PopoverTriggerProps) => {
  return (
    <div onClick={() => onOpenChange?.(!open)} className="w-full">
      {asChild ? children : <button>{children}</button>}
    </div>
  )
}

interface PopoverContentProps {
  children: React.ReactNode
  open?: boolean
  align?: "start" | "end" | "center"
  className?: string
}

const PopoverContent = ({ children, open, align = "center", className }: PopoverContentProps) => {
  if (!open) return null

  return (
    <div className={cn(
      "absolute z-50 mt-2 rounded-xl border border-stone-200 bg-white shadow-xl overflow-hidden",
      align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
      className
    )}>
      {children}
    </div>
  )
}

interface TimeWheelPickerProps {
  value?: string
  onChange?: (time: string) => void
  disabled?: boolean
  className?: string
  showDemo?: boolean
}

export default function TimeWheelPicker({
  value = '18:00',
  onChange,
  disabled = false,
  className,
  showDemo = false
}: TimeWheelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Парсим начальное значение один раз
  const getInitialValues = (val: string) => {
    if (val && val.match(/^\d{2}:\d{2}$/)) {
      const [hoursStr, minutesStr] = val.split(':')
      return {
        time: val,
        hours: parseInt(hoursStr, 10),
        minutes: parseInt(minutesStr, 10)
      }
    }
    return { time: '18:00', hours: 18, minutes: 0 }
  }

  const initial = getInitialValues(value)
  const [selectedTime, setSelectedTime] = useState(initial.time)
  const [wheelHours, setWheelHours] = useState(initial.hours)
  const [wheelMinutes, setWheelMinutes] = useState(initial.minutes)

  const itemHeight = 44 // Увеличено для удобства на мобильных
  const hoursRef = useRef<HTMLDivElement>(null)
  const minutesRef = useRef<HTMLDivElement>(null)
  
  // Используем useRef для хранения таймаутов вместо window
  const hourScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const minuteScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Флаг для блокировки обработки скролла во время инициализации
  const isInitializingRef = useRef(false)

  const handleHourChange = useCallback((hour: number) => {
    const clampedHour = Math.max(0, Math.min(23, hour))
    setWheelHours(clampedHour)
    const newTime = `${clampedHour.toString().padStart(2, '0')}:${wheelMinutes.toString().padStart(2, '0')}`
    setSelectedTime(newTime)
    onChange?.(newTime)
  }, [wheelMinutes, onChange])

  const handleMinuteChange = useCallback((minute: number) => {
    const clampedMinute = Math.max(0, Math.min(59, minute))
    setWheelMinutes(clampedMinute)
    const newTime = `${wheelHours.toString().padStart(2, '0')}:${clampedMinute.toString().padStart(2, '0')}`
    setSelectedTime(newTime)
    onChange?.(newTime)
  }, [wheelHours, onChange])

  const handleHourSelect = (hour: number) => {
    handleHourChange(hour)
    if (hoursRef.current) {
      hoursRef.current.scrollTo({
        top: hour * itemHeight,
        behavior: 'smooth'
      })
    }
  }

  const handleMinuteSelect = (minute: number) => {
    handleMinuteChange(minute)
    if (minutesRef.current) {
      minutesRef.current.scrollTo({
        top: minute * itemHeight,
        behavior: 'smooth'
      })
    }
  }

  const handleScrollHours = () => {
    if (!hoursRef.current || isInitializingRef.current) return

    if (hourScrollTimeoutRef.current) {
      clearTimeout(hourScrollTimeoutRef.current)
    }
    
    hourScrollTimeoutRef.current = setTimeout(() => {
      if (!hoursRef.current || isInitializingRef.current) return
      
      const scrollTop = hoursRef.current.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(23, index))

      hoursRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      })

      handleHourChange(clampedIndex)
    }, 100)
  }

  const handleScrollMinutes = () => {
    if (!minutesRef.current || isInitializingRef.current) return

    if (minuteScrollTimeoutRef.current) {
      clearTimeout(minuteScrollTimeoutRef.current)
    }
    
    minuteScrollTimeoutRef.current = setTimeout(() => {
      if (!minutesRef.current || isInitializingRef.current) return
      
      const scrollTop = minutesRef.current.scrollTop
      const index = Math.round(scrollTop / itemHeight)
      const clampedIndex = Math.max(0, Math.min(59, index))

      minutesRef.current.scrollTo({
        top: clampedIndex * itemHeight,
        behavior: 'smooth'
      })

      handleMinuteChange(clampedIndex)
    }, 100)
  }

  // Инициализация позиции скролла при открытии
  useEffect(() => {
    if (isOpen) {
      // Блокируем обработку скролла во время инициализации
      isInitializingRef.current = true
      
      // Используем requestAnimationFrame для ожидания рендера DOM
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (hoursRef.current) {
            hoursRef.current.scrollTop = wheelHours * itemHeight
          }
          if (minutesRef.current) {
            minutesRef.current.scrollTop = wheelMinutes * itemHeight
          }
          
          // Разрешаем обработку скролла после инициализации с небольшой задержкой
          setTimeout(() => {
            isInitializingRef.current = false
          }, 200)
        })
      })
    }
  }, [isOpen, wheelHours, wheelMinutes, itemHeight])

  // Очистка таймаутов при размонтировании
  useEffect(() => {
    return () => {
      if (hourScrollTimeoutRef.current) {
        clearTimeout(hourScrollTimeoutRef.current)
      }
      if (minuteScrollTimeoutRef.current) {
        clearTimeout(minuteScrollTimeoutRef.current)
      }
    }
  }, [])

  // Высота контейнера и отступ для центрирования
  const containerHeight = 176
  const paddingHeight = (containerHeight - itemHeight) / 2 // 66px - чтобы выбранный элемент был по центру

  if (showDemo) {
    return (
      <div className="min-h-screen bg-linear-to-br from-stone-100 to-stone-200 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-stone-800 mb-6 text-center">Time Wheel Picker</h1>

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
            <PopoverContent className="w-[280px] p-0" align="center">
              {/* Wheel Pickers */}
              <div className="flex items-center justify-center gap-2 p-4 bg-stone-50 rounded-xl">
                {/* Hours wheel */}
                <div className="flex flex-col items-center">
                  <span className="text-xs text-stone-500 mb-2 font-medium">Часы</span>
                  <div className="relative">
                    <div
                      ref={hoursRef}
                      className="h-[176px] w-[72px] overflow-y-auto bg-white rounded-xl shadow-inner"
                      onScroll={handleScrollHours}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                    >
                      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                      <div style={{ height: `${paddingHeight}px` }} />
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
                          height: `${itemHeight}px`
                        }}
                          onClick={() => handleHourSelect(i)}
                        >
                          {i.toString().padStart(2, '0')}
                        </div>
                      ))}
                      <div style={{ height: `${paddingHeight}px` }} />
                    </div>
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
                      onScroll={handleScrollMinutes}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                    >
                      <div style={{ height: `${paddingHeight}px` }} />
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
                          height: `${itemHeight}px`
                        }}
                          onClick={() => handleMinuteSelect(i)}
                        >
                          {i.toString().padStart(2, '0')}
                        </div>
                      ))}
                      <div style={{ height: `${paddingHeight}px` }} />
                    </div>
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

          <div className="mt-6 p-4 bg-white rounded-xl shadow-sm">
            <p className="text-sm text-stone-600 mb-2">Выбранное время:</p>
            <p className="text-2xl font-bold text-stone-800">{selectedTime}</p>
          </div>

          <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-xs text-amber-800">
              <strong>Как использовать:</strong>
              <br />• Нажмите на поле времени чтобы открыть picker
              <br />• Прокручивайте колесики мышью или тачпадом
              <br />• Кликайте на нужное значение
              <br />• Колесо автоматически выравнивается по цифрам
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Для использования в формах - красивый iOS-style wheel picker
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
      <PopoverContent className="w-[280px] p-0" align="center">
        {/* Wheel Pickers */}
        <div className="flex items-center justify-center gap-2 p-4 bg-stone-50 rounded-xl">
          {/* Hours wheel */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-stone-500 mb-2 font-medium">Часы</span>
            <div className="relative">
              <div
                ref={hoursRef}
                className="h-[176px] w-[72px] overflow-y-auto bg-white rounded-xl shadow-inner"
                onScroll={handleScrollHours}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
              >
                <style>{`div::-webkit-scrollbar { display: none; }`}</style>
                <div style={{ height: `${paddingHeight}px` }} />
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
                          height: `${itemHeight}px`
                        }}
                    onClick={() => handleHourSelect(i)}
                  >
                    {i.toString().padStart(2, '0')}
                  </div>
                ))}
                <div style={{ height: `${paddingHeight}px` }} />
              </div>
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
                onScroll={handleScrollMinutes}
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
              >
                <div style={{ height: `${paddingHeight}px` }} />
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
                          height: `${itemHeight}px`
                        }}
                    onClick={() => handleMinuteSelect(i)}
                  >
                    {i.toString().padStart(2, '0')}
                  </div>
                ))}
                <div style={{ height: `${paddingHeight}px` }} />
              </div>
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
}