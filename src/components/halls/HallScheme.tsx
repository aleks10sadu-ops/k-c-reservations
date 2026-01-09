"use client"

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCcw, Hand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Table, LayoutItem, Reservation, RESERVATION_STATUS_CONFIG } from '@/types'

export interface HallSchemeProps {
  tables: Table[]
  layoutItems: LayoutItem[]
  mode: 'view' | 'select'
  selectedTables?: string[]
  onSelectTable?: (tableId: string) => void
  onClick?: () => void
  reservations?: Reservation[]
  occupiedTableMap?: Map<string, string>
  currentReservationId?: string
  canvasWidth?: number
  canvasHeight?: number
  className?: string
  showCapacity?: boolean  // Показывать вместимость столов
  requiredCapacity?: number  // Требуемая вместимость (количество гостей)
}

const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 600

export function HallScheme({
  tables,
  layoutItems,
  mode,
  selectedTables = [],
  onSelectTable,
  onClick,
  reservations = [],
  occupiedTableMap = new Map(),
  currentReservationId,
  className,
  showCapacity = true,
  requiredCapacity = 0,
}: HallSchemeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Zoom и Pan state
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [lastPinchDistance, setLastPinchDistance] = useState<number | null>(null)

  // Авто-масштаб при монтировании
  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40
      const scaleX = containerWidth / CANVAS_WIDTH
      const scaleY = containerHeight / CANVAS_HEIGHT
      const autoScale = Math.min(scaleX, scaleY, 1)
      setZoom(Math.max(0.3, autoScale))
      setPan({ x: 0, y: 0 })
    }
  }, [])

  // Reset view
  const resetView = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current
      const containerWidth = container.clientWidth - 40
      const containerHeight = container.clientHeight - 40
      const scaleX = containerWidth / CANVAS_WIDTH
      const scaleY = containerHeight / CANVAS_HEIGHT
      const autoScale = Math.min(scaleX, scaleY, 1)
      setZoom(Math.max(0.3, autoScale))
      setPan({ x: 0, y: 0 })
    }
  }, [])

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(2, z + 0.15))
  const handleZoomOut = () => setZoom(z => Math.max(0.3, z - 0.15))

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom(z => Math.max(0.3, Math.min(2, z + delta)))
  }, [])

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Только pan если клик на фон (не на элемент)
    if ((e.target as HTMLElement).dataset.background === 'true') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
  }

  // Touch handlers для mobile pan и pinch zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      setLastPinchDistance(distance)
    } else if (e.touches.length === 1) {
      // Начинаем pan если touch на фоне
      if ((e.target as HTMLElement).dataset.background === 'true') {
        setIsPanning(true)
        setPanStart({
          x: e.touches[0].clientX - pan.x,
          y: e.touches[0].clientY - pan.y
        })
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDistance !== null) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const scale = distance / lastPinchDistance
      setZoom(z => Math.max(0.3, Math.min(2, z * scale)))
      setLastPinchDistance(distance)
    } else if (isPanning && e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - panStart.x,
        y: e.touches[0].clientY - panStart.y
      })
    }
  }

  const handleTouchEnd = () => {
    setIsPanning(false)
    setLastPinchDistance(null)
  }

  // Клик по столу
  const handleTableClick = (table: Table, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    
    if (mode === 'select' && onSelectTable) {
      onSelectTable(table.id)
    } else if (mode === 'view' && onClick) {
      onClick()
    }
  }

  // Получить бронирование для стола
  const getTableReservation = useCallback((table: Table): Reservation | undefined => {
    return reservations.find(r => 
      r.table_ids?.includes(table.id) || r.table_id === table.id
    )
  }, [reservations])

  // Вычисляем общую вместимость выбранных столов
  const selectedCapacity = useMemo(() => {
    return tables
      .filter(t => selectedTables.includes(t.id))
      .reduce((sum, t) => sum + (t.capacity || 0), 0)
  }, [tables, selectedTables])

  // Достаточно ли вместимости
  const hasEnoughCapacity = requiredCapacity <= 0 || selectedCapacity >= requiredCapacity

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Zoom controls */}
      {mode === 'select' && (
        <div className="flex items-center justify-center gap-2 p-3 bg-stone-50 border-b border-stone-200">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 0.3}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-stone-600 min-w-16 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            className="ml-2"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 overflow-hidden relative",
          mode === 'view' ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        )}
        style={{
          backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onClick={mode === 'view' ? onClick : undefined}
        data-background="true"
      >
        {/* Canvas */}
        <div
          className="absolute bg-white border border-stone-200 rounded-xl shadow-sm"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            left: '50%',
            top: '50%',
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
            backgroundSize: '16px 16px'
          }}
          data-background="true"
        >
          {/* Layout items */}
          {layoutItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "absolute flex items-center justify-center text-sm select-none pointer-events-none",
                item.type === 'shape' && "border-2 border-dashed border-stone-300 rounded-lg"
              )}
              style={{
                left: item.position_x,
                top: item.position_y,
                width: item.width,
                height: item.height,
                transform: `rotate(${item.rotation ?? 0}deg)`,
                transformOrigin: 'top left',
                color: item.color || '#1f2937',
                backgroundColor: item.bg_color || (item.type === 'shape' ? 'rgba(0,0,0,0.02)' : 'transparent'),
              }}
            >
              {item.text}
            </div>
          ))}

          {/* Tables */}
          {tables.map((table) => {
            const isSelected = selectedTables.includes(table.id)
            const occupiedColor = occupiedTableMap.get(table.id)
            const reservation = getTableReservation(table)
            const statusConfig = reservation ? RESERVATION_STATUS_CONFIG[reservation.status] : null
            
            // Определяем стили
            let bgColor = 'white'
            let borderColor = '#D1D5DB'
            let textColor = '#374151'
            
            if (mode === 'select') {
              if (isSelected) {
                bgColor = '#fef3c7'
                borderColor = '#f59e0b'
              } else if (occupiedColor) {
                bgColor = 'white'
                borderColor = '#D1D5DB'
              }
            } else if (reservation) {
              bgColor = reservation.color || statusConfig?.bgColor || 'white'
              borderColor = reservation.color || statusConfig?.borderColor || '#D1D5DB'
              textColor = statusConfig?.color || '#374151'
            }
            
            return (
              <motion.div
                key={table.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "absolute border-2 flex flex-col items-center justify-center text-sm font-semibold select-none",
                  table.shape === 'round' && "rounded-full",
                  table.shape === 'rectangle' && "rounded-xl",
                  table.shape === 'square' && "rounded-lg",
                  mode === 'select' && "cursor-pointer",
                  mode === 'select' && !isSelected && !occupiedColor && "hover:border-amber-400 hover:shadow-md transition-all",
                  isSelected && "shadow-lg ring-2 ring-amber-500/50"
                )}
                style={{
                  left: table.position_x,
                  top: table.position_y,
                  width: table.width,
                  height: table.height,
                  transform: `rotate(${table.rotation ?? 0}deg)`,
                  transformOrigin: 'top left',
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: textColor,
                }}
                onClick={(e) => handleTableClick(table, e)}
                onTouchEnd={(e) => {
                  e.stopPropagation()
                  if (mode === 'select' && onSelectTable) {
                    onSelectTable(table.id)
                  }
                }}
              >
                <span className="font-bold text-lg leading-tight">{table.number}</span>
                {/* Вместимость стола */}
                {showCapacity && table.capacity > 0 && (
                  <span className="text-[10px] text-stone-500 leading-tight">
                    {table.capacity} чел
                  </span>
                )}
                
                {/* Индикатор занятости */}
                {mode === 'select' && occupiedColor && (
                  <div
                    className="absolute -top-2 -right-2 h-4 w-4 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: occupiedColor }}
                    title="Занято другим бронированием"
                  />
                )}
                
                {/* Индикатор бронирования в режиме view */}
                {mode !== 'select' && reservation && (
                  <span
                    className="absolute -top-2 -right-2 h-3.5 w-3.5 rounded-full border border-white shadow"
                    style={{ backgroundColor: reservation.color || statusConfig?.borderColor || '#f59e0b' }}
                  />
                )}
              </motion.div>
            )
          })}

          {/* Empty state */}
          {tables.length === 0 && layoutItems.length === 0 && (
            <div className="flex items-center justify-center h-full text-stone-400">
              Нет элементов в этом зале
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
