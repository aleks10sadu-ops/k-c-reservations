"use client"

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Filter, Search, Loader2 } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Calendar } from '@/components/reservations/Calendar'
import { ReservationModal } from '@/components/reservations/ReservationModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Reservation, RESERVATION_STATUS_CONFIG, ReservationStatus } from '@/types'
import { useHalls, useMenus, useReservations } from '@/hooks/useSupabase'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { endOfMonth, format, startOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ru } from 'date-fns/locale'

export default function HomePage() {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'day'>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [filters, setFilters] = useState({
    hallId: 'all',
    menuId: 'all',
    paymentMethod: 'all',
    minGuests: '',
    maxGuests: '',
    minChildren: '',
    maxChildren: ''
  })

  const { data: halls } = useHalls()
  const { data: menus } = useMenus()
  const { data: reservationsForFilters } = useReservations()

  // Fetch reservations for current month
  const rangeStart = viewMode === 'year' ? startOfYear(currentDate) : startOfMonth(currentDate)
  const rangeEnd = viewMode === 'year' ? endOfYear(currentDate) : endOfMonth(currentDate)

  const { data: reservations, loading, error, refetch } = useReservations({
    startDate: format(rangeStart, 'yyyy-MM-dd'),
    endDate: format(rangeEnd, 'yyyy-MM-dd')
  })

  const paymentMethods = useMemo(() => {
    const methods = reservationsForFilters?.flatMap((r) => r.payments?.map((p) => p.payment_method) ?? []) || []
    return Array.from(new Set(methods))
  }, [reservationsForFilters])

  const hasActiveFilters = useMemo(() => {
    return (
      statusFilter !== 'all' ||
      filters.hallId !== 'all' ||
      filters.menuId !== 'all' ||
      filters.paymentMethod !== 'all' ||
      filters.minGuests !== '' ||
      filters.maxGuests !== '' ||
      filters.minChildren !== '' ||
      filters.maxChildren !== '' ||
      searchQuery !== ''
    )
  }, [filters, searchQuery, statusFilter])

  const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      const normalizedQuery = searchQuery.toLowerCase().trim()
      const matchesSearch = normalizedQuery === '' || 
        reservation.guest?.last_name?.toLowerCase().includes(normalizedQuery) ||
        reservation.guest?.first_name?.toLowerCase().includes(normalizedQuery) ||
        reservation.guest?.phone?.includes(normalizedQuery) ||
        reservation.comments?.toLowerCase().includes(normalizedQuery)
      
      const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter
      const matchesHall = filters.hallId === 'all' || reservation.hall_id === filters.hallId
      const matchesMenu = filters.menuId === 'all' || reservation.menu_id === filters.menuId
      const matchesPayment = filters.paymentMethod === 'all' || 
        (reservation.payments || []).some((p) => p.payment_method === filters.paymentMethod)

      const matchesGuests = 
        (filters.minGuests === '' || reservation.guests_count >= Number(filters.minGuests)) &&
        (filters.maxGuests === '' || reservation.guests_count <= Number(filters.maxGuests))

      const matchesChildren = 
        (filters.minChildren === '' || reservation.children_count >= Number(filters.minChildren)) &&
        (filters.maxChildren === '' || reservation.children_count <= Number(filters.maxChildren))

      return (
        matchesSearch &&
        matchesStatus &&
        matchesHall &&
        matchesMenu &&
        matchesPayment &&
        matchesGuests &&
        matchesChildren
      )
    })
  }, [reservations, searchQuery, statusFilter, filters])

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setModalMode('view')
    setIsModalOpen(true)
  }

  const handleCalendarMonthChange = (date: Date) => {
    setCurrentDate(date)
  }

  const handleAddReservation = (date?: Date) => {
    setSelectedReservation(null)
    setSelectedDate(date || null)
    setModalMode('create')
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedReservation(null)
    setSelectedDate(null)
  }

  const handleSaveSuccess = (saved?: any) => {
    if (saved) {
      setSelectedReservation(saved)
      setModalMode('view')
      setIsModalOpen(true)
    }
    refetch()
  }

  const handleResetFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setFilters({
      hallId: 'all',
      menuId: 'all',
      paymentMethod: 'all',
      minGuests: '',
      maxGuests: '',
      minChildren: '',
      maxChildren: ''
    })
  }

  // Stats
  const stats = useMemo(() => ({
    total: reservations.length,
    new: reservations.filter(r => r.status === 'new').length,
    inProgress: reservations.filter(r => r.status === 'in_progress').length,
    prepaid: reservations.filter(r => r.status === 'prepaid').length,
    paid: reservations.filter(r => r.status === 'paid').length,
    canceled: reservations.filter(r => r.status === 'canceled').length,
  }), [reservations])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500">
        Ошибка загрузки данных: {error}
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Бронирования</h1>
              <p className="mt-1 text-stone-500">Управляйте бронированиями ресторана</p>
            </div>
            
            <Button 
              size="lg" 
              className="gap-2 shadow-lg shadow-amber-500/25"
              onClick={() => handleAddReservation()}
            >
              <Plus className="h-5 w-5" />
              Новое бронирование
            </Button>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl bg-white border border-stone-200 p-3 sm:p-4 shadow-sm touch-manipulation"
          >
            <p className="text-xs sm:text-sm text-stone-500">Всего</p>
            <p className="text-2xl sm:text-3xl font-bold text-stone-900">
              {loading ? <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" /> : stats.total}
            </p>
          </motion.div>
          
          {(Object.entries(RESERVATION_STATUS_CONFIG) as [ReservationStatus, typeof RESERVATION_STATUS_CONFIG[ReservationStatus]][]).map(([status, config]) => (
            <motion.div
              key={status}
              whileHover={{ scale: 1.02 }}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm cursor-pointer transition-all touch-manipulation ${
                statusFilter === status ? 'ring-2 ring-offset-2 ring-amber-500' : ''
              }`}
              style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor
              }}
            >
              <p className="text-xs sm:text-sm" style={{ color: config.color }}>{config.label}</p>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: config.color }}>
                {loading ? (
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                ) : (
                  status === 'new' ? stats.new :
                  status === 'in_progress' ? stats.inProgress :
                  status === 'prepaid' ? stats.prepaid :
                  status === 'paid' ? stats.paid : stats.canceled
                )}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 px-2 sm:px-0"
        >
            <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Поиск по имени, телефону или комментарию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  {statusFilter !== 'all' && (
                    <Badge
                      variant={statusFilter === 'new' ? 'new' :
                              statusFilter === 'in_progress' ? 'inProgress' :
                              statusFilter === 'prepaid' ? 'prepaid' : 'paid'}
                      className="cursor-pointer text-xs px-2 py-1"
                      onClick={() => setStatusFilter('all')}
                    >
                      {RESERVATION_STATUS_CONFIG[statusFilter].label} ✕
                    </Badge>
                  )}
                  <Button
                    variant={hasActiveFilters ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1 h-8"
                    onClick={() => setIsFiltersOpen((prev) => !prev)}
                  >
                    <Filter className="h-3 w-3" />
                    <span className="hidden sm:inline">Фильтры</span>
                  </Button>
                </div>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {isFiltersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                >
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-stone-500">Зал</p>
                      <Select
                        value={filters.hallId}
                        onValueChange={(value) => setFilters((prev) => ({ ...prev, hallId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Все залы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все залы</SelectItem>
                          {halls?.map((hall) => (
                            <SelectItem key={hall.id} value={hall.id}>
                              {hall.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-stone-500">Меню</p>
                      <Select
                        value={filters.menuId}
                        onValueChange={(value) => setFilters((prev) => ({ ...prev, menuId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Все меню" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все меню</SelectItem>
                          {menus?.map((menu) => (
                            <SelectItem key={menu.id} value={menu.id}>
                              {menu.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-stone-500">Способ оплаты</p>
                      <Select
                        value={filters.paymentMethod}
                        onValueChange={(value) => setFilters((prev) => ({ ...prev, paymentMethod: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Любой" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Любой</SelectItem>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method === 'cash' ? 'Наличные' : method === 'card' ? 'Карта' : 'Перевод'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-stone-500">Гостей (мин / макс)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="мин."
                          value={filters.minGuests}
                          onChange={(e) => setFilters((prev) => ({ ...prev, minGuests: e.target.value }))}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="макс."
                          value={filters.maxGuests}
                          onChange={(e) => setFilters((prev) => ({ ...prev, maxGuests: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-stone-500">Детей (мин / макс)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          min={0}
                          placeholder="мин."
                          value={filters.minChildren}
                          onChange={(e) => setFilters((prev) => ({ ...prev, minChildren: e.target.value }))}
                        />
                        <Input
                          type="number"
                          min={0}
                          placeholder="макс."
                          value={filters.maxChildren}
                          onChange={(e) => setFilters((prev) => ({ ...prev, maxChildren: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end border-t border-stone-100 px-4 py-3 gap-2">
                    <Button variant="ghost" size="sm" onClick={handleResetFilters} className="flex-1 sm:flex-none">
                      Сбросить
                    </Button>
                    <Button size="sm" onClick={() => setIsFiltersOpen(false)} className="flex-1 sm:flex-none">
                      Применить
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            </div>
          ) : (
            <Calendar 
              reservations={filteredReservations}
              onReservationClick={handleReservationClick}
              onAddReservation={handleAddReservation}
              onMonthChange={handleCalendarMonthChange}
              currentDate={currentDate}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          )}
        </motion.div>

        {/* Reservation Modal */}
        <ReservationModal
          reservation={selectedReservation}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSaveSuccess={handleSaveSuccess}
          mode={modalMode}
          initialDate={selectedDate}
        />
      </div>
    </PageTransition>
  )
}
