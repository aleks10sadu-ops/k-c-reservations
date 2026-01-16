"use client"

import { motion } from 'framer-motion'
import { Clock, Users, MapPin, Phone, ChefHat, MessageSquare, Calendar, CreditCard } from 'lucide-react'
import { Reservation, RESERVATION_STATUS_CONFIG } from '@/types'
import { cn, formatCurrency, formatDate, formatTime } from '@/lib/utils'
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
    completed: 'completed' as const,
  }[reservation.status]

  // Получаем номера столов
  const tableNumbers = (reservation.table_ids?.length ? reservation.table_ids : (reservation.table ? [reservation.table.id] : []))
    .map(id => reservation.tables?.find(t => t.id === id)?.number)
    .filter(Boolean)
    .join(', ')

  // Проверяем, есть ли предоплаты
  const hasPayments = reservation.payments && reservation.payments.length > 0
  const paidAmount = hasPayments ? reservation.payments.reduce((sum, p) => sum + p.amount, 0) : 0

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "cursor-pointer rounded-lg border-l-4 px-3 py-2 text-xs transition-all hover:shadow-md touch-manipulation",
          `status-${reservation.status}`,
          statusConfig.bgColor && "shadow-sm"
        )}
        style={{
          borderLeftColor: statusConfig.borderColor,
          backgroundColor: statusConfig.bgColor || 'white'
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-stone-600 flex-shrink-0">
            <Clock className="h-3 w-3" />
            <span className="text-sm font-bold text-stone-900">{formatTime(reservation.time)}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="font-medium truncate text-xs text-stone-900">
              {reservation.guest?.last_name} {reservation.guest?.first_name?.[0]}.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1 text-stone-600 min-w-0">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="text-xs truncate">{reservation.hall?.name}</span>
          </div>
          <div className="flex items-center gap-1 text-stone-600 flex-shrink-0">
            <Users className="h-3 w-3" />
            <span className="text-xs">{reservation.guests_count}</span>
          </div>
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
        "cursor-pointer rounded-xl border-l-4 p-3 sm:p-4 shadow-sm transition-all hover:shadow-lg w-full max-w-none",
        `status-${reservation.status}`,
        statusConfig.bgColor && "shadow-sm"
      )}
      style={{
        borderLeftColor: statusConfig.borderColor,
        backgroundColor: statusConfig.bgColor || 'white'
      }}
    >
      {/* Header: статус, сумма, дата */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <Badge variant={statusVariant} className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1">
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-2">
            <div className="text-sm text-stone-500">
              {formatDate(reservation.date)}
            </div>
            {reservation.status === 'canceled' ? (
              <Badge variant="canceled" className="rounded-full px-2 py-0.5 font-black uppercase tracking-tighter text-[8px]">
                ОТМЕНЕНА
              </Badge>
            ) : reservation.status === 'completed' ? (
              <Badge variant="completed" className="rounded-full px-2 py-0.5 font-black uppercase tracking-tighter text-[8px]">
                УСПЕШНО
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-stone-900 mb-1">
            {formatCurrency(reservation.total_amount)}
          </div>
          {hasPayments && (
            <div className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              Оплачено: {formatCurrency(paidAmount)}
            </div>
          )}
        </div>
      </div>

      {/* Основная информация */}
      <div className="space-y-4">
        {/* Имя гостя и контакт */}
        <div>
          <h3 className="font-semibold text-lg text-stone-900 mb-1">
            {reservation.guest?.last_name} {reservation.guest?.first_name} {reservation.guest?.middle_name}
          </h3>
          {reservation.guest?.phone && (
            <div className="flex items-center gap-2 text-sm text-stone-600">
              <Phone className="h-4 w-4" />
              <span>{reservation.guest.phone}</span>
            </div>
          )}
        </div>

        {/* Ключевые детали в адаптивные колонки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-stone-400" />
              <span className="text-sm font-medium">{formatTime(reservation.time)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-stone-400" />
              <span className="text-sm">{reservation.hall?.name}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-stone-400" />
              <span className="text-sm">
                {reservation.guests_count} гостей
                {reservation.children_count > 0 && ` + ${reservation.children_count} детей`}
              </span>
            </div>
            {tableNumbers && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-stone-400" />
                <span className="text-sm">Столы: {tableNumbers}</span>
              </div>
            )}
          </div>
        </div>

        {/* Меню */}
        {reservation.menu && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <ChefHat className="h-4 w-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-amber-900 break-words">
                {reservation.menu.name}
              </div>
              <div className="text-xs text-amber-700">
                {formatCurrency(reservation.menu.price_per_person)}/чел.
              </div>
            </div>
          </div>
        )}

        {/* Комментарии (если есть) */}
        {reservation.comments && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-stone-50 border border-stone-200">
            <MessageSquare className="h-4 w-4 text-stone-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 text-sm text-stone-600 leading-relaxed break-words">
              <div className="max-h-20 overflow-y-auto">
                {reservation.comments}
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

