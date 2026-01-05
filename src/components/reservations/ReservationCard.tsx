"use client"

import { motion } from 'framer-motion'
import { Clock, Users, MapPin, Phone } from 'lucide-react'
import { Reservation, RESERVATION_STATUS_CONFIG } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface ReservationCardProps {
  reservation: Reservation
  onClick?: () => void
  compact?: boolean
}

export function ReservationCard({ reservation, onClick, compact = false }: ReservationCardProps) {
  const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
  
  const statusVariant = {
    new: 'new' as const,
    in_progress: 'inProgress' as const,
    prepaid: 'prepaid' as const,
    paid: 'paid' as const,
    canceled: 'canceled' as const,
  }[reservation.status]

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "cursor-pointer rounded-lg border-l-4 px-3 py-2 text-xs sm:text-sm transition-all hover:shadow-md touch-manipulation",
          `status-${reservation.status}`
        )}
        style={{ borderLeftColor: statusConfig.borderColor }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium truncate">
            {reservation.guest?.last_name} {reservation.guest?.first_name?.[0]}.
          </span>
          <span className="text-stone-500 shrink-0 text-xs sm:text-sm">{reservation.time}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 text-stone-500">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{reservation.guests_count}</span>
          </span>
            <span className="truncate text-xs sm:text-sm">{reservation.hall?.name}</span>
            {(reservation.table_ids?.length || reservation.table?.number) && (
              <span className="truncate text-xs sm:text-sm">
                столы: {(reservation.table_ids?.length ? reservation.table_ids : (reservation.table ? [reservation.table.id] : []))
                  .map(id => reservation.tables?.find(t => t.id === id)?.number)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl border-l-4 p-4 shadow-sm transition-all hover:shadow-lg",
        `status-${reservation.status}`
      )}
      style={{ borderLeftColor: statusConfig.borderColor }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant={statusVariant} className="text-xs">
              {statusConfig.label}
            </Badge>
          </div>
          
          <h3 className="font-semibold text-stone-900 truncate">
            {reservation.guest?.last_name} {reservation.guest?.first_name} {reservation.guest?.middle_name}
          </h3>
          
          <div className="mt-2 space-y-1.5 text-sm text-stone-600">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-stone-400" />
              <span>{reservation.time}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-stone-400" />
              <span className="truncate">{reservation.hall?.name}</span>
            </div>
            
            {(reservation.table_ids?.length || reservation.table?.number) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-stone-400" />
                <span className="truncate">
                  Столы: {(reservation.table_ids?.length ? reservation.table_ids : (reservation.table ? [reservation.table.id] : []))
                    .map(id => reservation.tables?.find(t => t.id === id)?.number)
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-stone-400" />
              <span>
                {reservation.guests_count} гостей
                {reservation.children_count > 0 && ` + ${reservation.children_count} детей`}
              </span>
            </div>
            
            {reservation.guest?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-stone-400" />
                <span>{reservation.guest.phone}</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-stone-900">
            {formatCurrency(reservation.total_amount)}
          </div>
        </div>
      </div>
      
      {reservation.menu && (
        <div className="mt-3 pt-3 border-t border-stone-200">
          <span className="text-xs text-stone-500">
            {reservation.menu.name} ({formatCurrency(reservation.menu.price_per_person)}/чел.)
          </span>
        </div>
      )}
      
      {reservation.comments && (
        <div className="mt-2 text-xs text-stone-500 italic truncate">
          {reservation.comments}
        </div>
      )}
    </motion.div>
  )
}

