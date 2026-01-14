"use client"

import { useMemo, useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Filter, Search, Loader2, X, Clock, MapPin, Users } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Calendar } from '@/components/reservations/Calendar'
import { ReservationModal } from '@/components/reservations/ReservationModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Reservation, RESERVATION_STATUS_CONFIG, ReservationStatus } from '@/types'
import { formatDate, formatTime, cn } from '@/lib/utils'
import { useHalls, useMenus, useReservations, useReservationSearch } from '@/hooks/useSupabase'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { endOfMonth, format, startOfMonth, startOfYear, endOfYear } from 'date-fns'
import { ru } from 'date-fns/locale'

import { useAuth } from '@/hooks/use-auth'
import { redirect } from 'next/navigation'

export default function HomePage() {
  const { user, role, isLoading, signOut } = useAuth()
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'year' | 'month' | 'day' | 'list'>('month')
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const { data: searchResults, loading: searchLoading, search: performSearch, clear: clearSearchResults, hasSearched } = useReservationSearch()
  const [filters, setFilters] = useState({
    hallId: 'all',
    menuId: 'all',
    paymentMethod: 'all',
    minGuests: '',
    maxGuests: '',
    minChildren: '',
    maxChildren: ''
  })

  // Mobile devices stay in month view with compact dots display
  // (removed auto-switch to list view - users can tap a day to see details)

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data: halls } = useHalls()
  const { data: menus } = useMenus()
  // REMOVED: fetching all reservations for filters/search to improve performance
  // const { data: reservationsForFilters } = useReservations()

  // Fetch reservations for current month
  const rangeStart = viewMode === 'year' ? startOfYear(currentDate) : startOfMonth(currentDate)
  const rangeEnd = viewMode === 'year' ? endOfYear(currentDate) : endOfMonth(currentDate)

  const { data: reservations, loading, error, refetch } = useReservations({
    startDate: format(rangeStart, 'yyyy-MM-dd'),
    endDate: format(rangeEnd, 'yyyy-MM-dd')
  })

  const paymentMethods = ['cash', 'card', 'transfer']

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

  // Multi-word search function - each word must match at least one searchable field
  const matchesMultiWordSearch = (reservation: Reservation, query: string): boolean => {
    if (!query.trim()) return true

    // Create a combined searchable string from all relevant fields
    const searchableFields = [
      reservation.guest?.last_name || '',
      reservation.guest?.first_name || '',
      reservation.guest?.middle_name || '',
      reservation.guest?.phone || '',
      reservation.comments || '',
      reservation.hall?.name || '',
    ].map(field => field.toLowerCase())

    // Split query into words (handles multiple spaces)
    const queryWords = query.toLowerCase().trim().split(/\s+/).filter(word => word.length > 0)

    // Each query word must match at least one field
    return queryWords.every(word =>
      searchableFields.some(field => field.includes(word))
    )
  }

  const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      const matchesSearch = matchesMultiWordSearch(reservation, searchQuery)

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

  // REMOVED: searchResults dropdown (now handled by global search)

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
      // Navigate to the month of the saved reservation
      const reservationDate = new Date(saved.date)
      setCurrentDate(reservationDate)
    }
    // Always return to month view after saving
    setViewMode('month')
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  if (role === 'guest') {
    redirect('/profile')
  }

  if (role === 'waiter') {
    redirect('/positions')
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto" />
          <p className="text-stone-500">Загрузка данных пользователя...</p>
        </div>
      </div>
    )
  }

  const isAuthorized = role === 'admin' || role === 'director' || role === 'manager'

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-semibold text-stone-900">Доступ ограничен</h1>
          <p className="mt-2 text-stone-500">
            {role === 'guest'
              ? 'Ваш аккаунт ожидает подтверждения администратором.'
              : 'У вас недостаточно прав для просмотра этой страницы.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button onClick={() => refetch()} variant="outline">
              Попробовать снова
            </Button>
            <Button onClick={() => signOut()} variant="ghost">
              Выйти из системы
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
              className={`rounded-2xl border-2 p-3 sm:p-4 shadow-sm cursor-pointer transition-all touch-manipulation ${statusFilter === status ? 'ring-2 ring-offset-2 ring-amber-500' : ''
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
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1 group" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 group-focus-within:text-amber-600 transition-colors z-10" />
                <Input
                  placeholder="Поиск по имени, телефону или комментарию..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      performSearch(searchQuery)
                    }
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  className="pl-10 pr-36 h-10 border-stone-200 focus-visible:ring-amber-500/20 focus-visible:border-amber-500 transition-all rounded-xl"
                />
                <div className="absolute right-1 top-1 bottom-1 flex items-center gap-0.5">
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('')
                        setIsSearchFocused(false)
                        clearSearchResults()
                      }}
                      className="p-1 px-2 hover:bg-stone-50 rounded-lg text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center mr-0.5"
                      title="Очистить поиск"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  <div className="w-px h-5 bg-stone-100 mx-0.5" />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-full px-3 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg font-medium gap-1.5 transition-colors"
                    onClick={() => performSearch(searchQuery)}
                    disabled={searchLoading || !searchQuery.trim()}
                  >
                    {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    <span className="text-xs">Найти</span>
                  </Button>
                </div>

                {/* Search Results Dropdown (now anchored to the input group) */}
                <AnimatePresence>
                  {isSearchFocused && (hasSearched || searchLoading) && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-stone-200 shadow-lg z-50 max-h-[400px] overflow-y-auto"
                    >
                      {searchLoading ? (
                        <div className="p-8 text-center" key="searching">
                          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-2" />
                          <p className="text-sm text-stone-500">Поиск по всей базе...</p>
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="p-4 text-center text-stone-500" key="no-results">
                          <Search className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                          <p className="text-sm">Ничего не найдено</p>
                          <p className="text-xs text-stone-400 mt-1">Попробуйте изменить запрос</p>
                        </div>
                      ) : (
                        <div className="py-2" key="results">
                          <div className="px-3 py-2 text-xs font-medium text-stone-500 border-b border-stone-100">
                            Найдено: {searchResults.length} {searchResults.length === 1 ? 'бронь' : searchResults.length < 5 ? 'брони' : 'броней'}
                          </div>
                          {searchResults.map((reservation) => {
                            const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                            return (
                              <motion.div
                                key={reservation.id}
                                whileHover={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
                                onClick={() => {
                                  handleReservationClick(reservation)
                                  setIsSearchFocused(false)
                                }}
                                className="px-3 py-3 cursor-pointer border-b border-stone-50 last:border-b-0"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: statusConfig.borderColor }}
                                      />
                                      <span className="font-medium text-stone-900 truncate">
                                        {reservation.guest?.last_name} {reservation.guest?.first_name}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(reservation.date)} {formatTime(reservation.time)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {reservation.hall?.name}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {reservation.guests_count}
                                      </span>
                                    </div>
                                    {reservation.guest?.phone && (
                                      <div className="text-xs text-stone-400 mt-1">
                                        {reservation.guest.phone}
                                      </div>
                                    )}
                                  </div>
                                  <Badge
                                    variant={
                                      reservation.status === 'new' ? 'new' :
                                        reservation.status === 'in_progress' ? 'inProgress' :
                                          reservation.status === 'prepaid' ? 'prepaid' :
                                            reservation.status === 'paid' ? 'paid' : 'canceled'
                                    }
                                    className="text-[10px] px-1.5 py-0.5 flex-shrink-0"
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                variant={hasActiveFilters ? 'default' : 'outline'}
                className={cn(
                  "h-10 px-4 rounded-xl gap-2 font-medium transition-all shadow-sm",
                  hasActiveFilters ? "bg-amber-600 hover:bg-amber-700 border-amber-600" : "border-stone-200 text-stone-600 hover:bg-stone-50"
                )}
                onClick={() => setIsFiltersOpen((prev) => !prev)}
              >
                <Filter className="h-4 w-4" />
                <span>Фильтры</span>
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-1 bg-amber-500/20 text-white border-0 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px]">
                    !
                  </Badge>
                )}
              </Button>
            </div>

            {/* Active Filters Row */}
            <AnimatePresence>
              {(statusFilter !== 'all' || hasActiveFilters) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-wrap items-center gap-2 overflow-hidden"
                >
                  <span className="text-xs text-stone-400 mr-1">Активные фильтры:</span>
                  {statusFilter !== 'all' && (
                    <Badge
                      variant={statusFilter === 'new' ? 'new' :
                        statusFilter === 'in_progress' ? 'inProgress' :
                          statusFilter === 'prepaid' ? 'prepaid' : 'paid'}
                      className="cursor-pointer text-xs px-2 py-1 gap-1 h-7 border-0"
                      onClick={() => setStatusFilter('all')}
                    >
                      {RESERVATION_STATUS_CONFIG[statusFilter].label}
                      <X className="h-3 w-3" />
                    </Badge>
                  )}
                  {(filters.hallId !== 'all' || filters.menuId !== 'all') && (
                    <>
                      {filters.hallId !== 'all' && (
                        <Badge variant="outline" className="text-xs px-2 py-1 gap-1 h-7 border-stone-200 bg-stone-50 text-stone-600">
                          Зал: {halls?.find(h => h.id === filters.hallId)?.name || filters.hallId}
                          <button onClick={() => setFilters(prev => ({ ...prev, hallId: 'all' }))}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] text-stone-400 hover:text-red-500 transition-colors"
                        onClick={() => {
                          clearSearchResults()
                          setStatusFilter('all')
                          setFilters(prev => ({
                            ...prev,
                            hallId: 'all',
                            menuId: 'all'
                          }))
                        }}
                      >
                        Сбросить всё
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

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
      </div >
    </PageTransition >
  )
}
