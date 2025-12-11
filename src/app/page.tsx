"use client"

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Filter, Search, Loader2 } from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Calendar } from '@/components/reservations/Calendar'
import { ReservationModal } from '@/components/reservations/ReservationModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Reservation, RESERVATION_STATUS_CONFIG, ReservationStatus } from '@/types'
import { useReservations } from '@/hooks/useSupabase'
import { Badge } from '@/components/ui/badge'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default function HomePage() {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | 'all'>('all')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // Fetch reservations for current month
  const { data: reservations, loading, error, refetch } = useReservations({
    startDate: format(startOfMonth(currentMonth), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(currentMonth), 'yyyy-MM-dd')
  })

  const filteredReservations = useMemo(() => {
    return reservations.filter(reservation => {
      const matchesSearch = searchQuery === '' || 
        reservation.guest?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.guest?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reservation.guest?.phone?.includes(searchQuery)
      
      const matchesStatus = statusFilter === 'all' || reservation.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [reservations, searchQuery, statusFilter])

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation)
    setModalMode('view')
    setIsModalOpen(true)
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

  const handleSaveSuccess = () => {
    handleModalClose()
    refetch()
  }

  // Stats
  const stats = useMemo(() => ({
    total: reservations.length,
    new: reservations.filter(r => r.status === 'new').length,
    inProgress: reservations.filter(r => r.status === 'in_progress').length,
    prepaid: reservations.filter(r => r.status === 'prepaid').length,
    paid: reservations.filter(r => r.status === 'paid').length,
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
          className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm"
          >
            <p className="text-sm text-stone-500">Всего</p>
            <p className="text-3xl font-bold text-stone-900">
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats.total}
            </p>
          </motion.div>
          
          {(Object.entries(RESERVATION_STATUS_CONFIG) as [ReservationStatus, typeof RESERVATION_STATUS_CONFIG[ReservationStatus]][]).map(([status, config]) => (
            <motion.div 
              key={status}
              whileHover={{ scale: 1.02 }}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`rounded-2xl border-2 p-4 shadow-sm cursor-pointer transition-all ${
                statusFilter === status ? 'ring-2 ring-offset-2 ring-amber-500' : ''
              }`}
              style={{ 
                backgroundColor: config.bgColor,
                borderColor: config.borderColor 
              }}
            >
              <p className="text-sm" style={{ color: config.color }}>{config.label}</p>
              <p className="text-3xl font-bold" style={{ color: config.color }}>
                {loading ? <Loader2 className="h-6 w-6 animate-spin" /> :
                 status === 'new' ? stats.new :
                 status === 'in_progress' ? stats.inProgress :
                 status === 'prepaid' ? stats.prepaid : stats.paid}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 mb-6"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input 
              placeholder="Поиск по имени или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex items-center gap-2">
            {statusFilter !== 'all' && (
              <Badge 
                variant={statusFilter === 'new' ? 'new' : 
                        statusFilter === 'in_progress' ? 'inProgress' :
                        statusFilter === 'prepaid' ? 'prepaid' : 'paid'}
                className="cursor-pointer"
                onClick={() => setStatusFilter('all')}
              >
                {RESERVATION_STATUS_CONFIG[statusFilter].label} ✕
              </Badge>
            )}
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
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
              onMonthChange={setCurrentMonth}
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
