"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Search, 
  CreditCard, 
  Banknote,
  ArrowRightLeft,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  Loader2,
  Trash2
} from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DateTimePicker } from '@/components/ui/datetime-picker'
import { useReservations, useCreateMutation, useDeleteMutation, useUpdateMutation } from '@/hooks/useSupabase'
import { formatCurrency, formatDate, formatTime, cn } from '@/lib/utils'
import { RESERVATION_STATUS_CONFIG, Payment, Reservation } from '@/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false)
  const [selectedReservationId, setSelectedReservationId] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'card' as 'cash' | 'card' | 'transfer',
    notes: ''
  })

  // Fetch data
  const { data: allReservations, loading, refetch } = useReservations()
  
  // Filter reservations by date if selected
  const reservations = selectedDate
    ? allReservations.filter(r => r.date === selectedDate)
    : allReservations
  
  // Mutations
  const createPayment = useCreateMutation<Payment>('payments')
  const deletePayment = useDeleteMutation('payments')
  const updateReservation = useUpdateMutation<Reservation>('reservations')

  // Calculate stats
  const totalRevenue = reservations.reduce((sum, r) => sum + (r.prepaid_amount || 0), 0)
  const totalExpected = reservations.reduce((sum, r) => sum + r.total_amount, 0)
  const totalRemaining = totalExpected - totalRevenue
  
  const paidReservations = reservations.filter(r => r.status === 'paid')
  // Показываем все бронирования, которые не полностью оплачены (не только с pending статусом)
  const pendingPayments = reservations.filter(r =>
    r.status !== 'paid' &&
    r.status !== 'canceled' &&
    r.total_amount > (r.prepaid_amount || 0)
  )

  // Все бронирования доступные для добавления оплаты (кроме полностью отменённых без платежей)
  const availableForPayment = reservations.filter(r =>
    r.status !== 'canceled' || (r.payments && r.payments.length > 0)
  )

  // Get all payments with reservation info
  const allPayments = reservations.flatMap(reservation => 
    (reservation.payments || []).map(payment => ({
      ...payment,
      reservation
    }))
  ).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />
      case 'card': return <CreditCard className="h-4 w-4" />
      case 'transfer': return <ArrowRightLeft className="h-4 w-4" />
      default: return <CreditCard className="h-4 w-4" />
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Наличные'
      case 'card': return 'Картой'
      case 'transfer': return 'Перевод'
      default: return method
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    if (!paymentId) return
    if (!confirm('Удалить эту оплату?')) return
    const result = await deletePayment.mutate(paymentId)
    if (result) {
      refetch()
    }
  }

  const handleAddPayment = async () => {
    if (!selectedReservationId || !paymentForm.amount) return

    const reservation = reservations.find(r => r.id === selectedReservationId)
    if (!reservation) return

    const result = await createPayment.mutate({
      reservation_id: selectedReservationId,
      amount: paymentForm.amount,
      payment_method: paymentForm.payment_method,
      notes: paymentForm.notes || undefined
    })

    if (result) {
      // Проверяем, был ли это первый платеж (prepaid_amount было 0)
      const supabase = createClient()
      const { data: updatedReservation } = await supabase
        .from('reservations')
        .select('prepaid_amount, total_amount, status')
        .eq('id', selectedReservationId)
        .single()

      if (updatedReservation) {
        // Если это первый платеж (было 0, теперь больше 0), обновляем статус на prepaid
        if (reservation.prepaid_amount === 0 && updatedReservation.prepaid_amount > 0) {
          await updateReservation.mutate(selectedReservationId, {
            status: 'prepaid' as const
          })
        }
        // Если оплачено полностью, обновляем статус на paid
        if (updatedReservation.prepaid_amount >= updatedReservation.total_amount && reservation.status !== 'paid') {
          await updateReservation.mutate(selectedReservationId, {
            status: 'paid' as const
          })
        }
      }

      setIsAddPaymentOpen(false)
      setPaymentForm({ amount: 0, payment_method: 'card', notes: '' })
      setSelectedReservationId('')
      refetch()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-stone-900">Оплаты</h1>
                <p className="mt-1 text-stone-500">Отслеживание предоплат и платежей</p>
              </div>
              
              <Button 
                size="lg" 
                className="gap-2 shadow-lg shadow-amber-500/25"
                onClick={() => setIsAddPaymentOpen(true)}
              >
                <Plus className="h-5 w-5" />
                Добавить оплату
              </Button>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-3">
              <Label className="flex items-center gap-2 whitespace-nowrap">
                <Calendar className="h-4 w-4" />
                Фильтр по дате бронирования:
              </Label>
              <DateTimePicker
                value={selectedDate}
                onChange={(date) => setSelectedDate(date)}
                dateOnly={true}
                placeholder="Выберите дату"
                className="w-auto"
              />
              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate('')}
                >
                  Сбросить
                </Button>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 text-white">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-green-700">Получено</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500 text-white">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-blue-700">Ожидается</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalExpected)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-white">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-amber-700">Осталось получить</p>
                  <p className="text-2xl font-bold text-amber-900">{formatCurrency(totalRemaining)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-white">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-purple-700">Оплачено полностью</p>
                  <p className="text-2xl font-bold text-purple-900">{paidReservations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Ожидают оплаты ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Оплачено ({paidReservations.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <CreditCard className="h-4 w-4" />
              История платежей
            </TabsTrigger>
            <TabsTrigger value="canceled" className="gap-2">
              <Badge variant="canceled">Отменены</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Pending Payments */}
          <TabsContent value="pending">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Бронирования ожидающие оплаты</CardTitle>
                </CardHeader>
                <CardContent>
                  {pendingPayments.length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                      <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
                      <p>Все бронирования оплачены</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {pendingPayments.map((reservation, index) => {
                        const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                        const remaining = reservation.total_amount - (reservation.prepaid_amount || 0)
                        const progress = ((reservation.prepaid_amount || 0) / reservation.total_amount) * 100

                        return (
                          <motion.div
                            key={reservation.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="py-4 first:pt-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-2 h-12 rounded-full"
                                  style={{ backgroundColor: statusConfig.borderColor }}
                                />
                                <div>
                                  <h3 className="font-semibold text-stone-900">
                                    {reservation.guest?.last_name} {reservation.guest?.first_name}
                                  </h3>
                                  <p className="text-sm text-stone-500">
                                    {formatDate(reservation.date)} в {formatTime(reservation.time)} • {reservation.hall?.name}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="font-semibold text-stone-900">
                                  {formatCurrency(reservation.total_amount)}
                                </p>
                                <Badge 
                                  variant={reservation.status === 'new' ? 'new' : 
                                          reservation.status === 'in_progress' ? 'inProgress' : 
                                          reservation.status === 'prepaid' ? 'prepaid' : 'canceled'}
                                >
                                  {statusConfig.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="mb-2">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-green-600">
                                  Внесено: {formatCurrency(reservation.prepaid_amount || 0)}
                                </span>
                                <span className="text-amber-600">
                                  Осталось: {formatCurrency(remaining)}
                                </span>
                              </div>
                              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                                <motion.div 
                                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  transition={{ duration: 0.5, delay: index * 0.1 }}
                                />
                              </div>
                            </div>

                            <div className="flex justify-end">
                              <Button 
                                size="sm" 
                                className="gap-2"
                                onClick={() => {
                                  setSelectedReservationId(reservation.id)
                                  setIsAddPaymentOpen(true)
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                Добавить оплату
                              </Button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Canceled Reservations */}
          <TabsContent value="canceled">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Отменённые бронирования</CardTitle>
                </CardHeader>
                <CardContent>
                  {reservations.filter(r => r.status === 'canceled').length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                      <p>Нет отменённых бронирований</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {reservations
                        .filter(r => r.status === 'canceled')
                        .map((reservation, index) => {
                          const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                          return (
                            <motion.div
                              key={reservation.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50">
                                  <Clock className="h-5 w-5 text-rose-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-stone-900">
                                    {reservation.guest?.last_name} {reservation.guest?.first_name}
                                  </h3>
                                  <p className="text-sm text-stone-500">
                                    {formatDate(reservation.date)} • {reservation.hall?.name}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <p className="text-xl font-bold text-rose-600">
                                  {formatCurrency(reservation.total_amount)}
                                </p>
                                <Badge variant="canceled">{statusConfig.label}</Badge>
                              </div>
                            </motion.div>
                          )
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Paid Reservations */}
          <TabsContent value="paid">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Полностью оплаченные бронирования</CardTitle>
                </CardHeader>
                <CardContent>
                  {paidReservations.length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                      <p>Нет полностью оплаченных бронирований</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {paidReservations.map((reservation, index) => (
                        <motion.div
                          key={reservation.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="py-4 first:pt-0 last:pb-0 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-stone-900">
                                {reservation.guest?.last_name} {reservation.guest?.first_name}
                              </h3>
                              <p className="text-sm text-stone-500">
                                {formatDate(reservation.date)} • {reservation.hall?.name}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(reservation.total_amount)}
                            </p>
                            <Badge variant="paid">Оплачено</Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Payment History */}
          <TabsContent value="history">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>История платежей</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                      <Input 
                        placeholder="Поиск..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {allPayments.length === 0 ? (
                    <div className="text-center py-12 text-stone-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                      <p>Нет платежей</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {allPayments.map((payment, index) => (
                        <motion.div
                          key={payment.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl",
                              payment.payment_method === 'cash' && "bg-green-100 text-green-600",
                              payment.payment_method === 'card' && "bg-blue-100 text-blue-600",
                              payment.payment_method === 'transfer' && "bg-purple-100 text-purple-600"
                            )}>
                              {getPaymentMethodIcon(payment.payment_method)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-stone-900">
                                {payment.reservation.guest?.last_name} {payment.reservation.guest?.first_name}
                              </h3>
                              <p className="text-sm text-stone-500">
                                {formatDate(payment.payment_date)} • {getPaymentMethodLabel(payment.payment_method)}
                              </p>
                              {payment.notes && (
                                <p className="text-sm text-stone-400 italic">{payment.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-xl font-bold text-green-600">
                                +{formatCurrency(payment.amount)}
                              </p>
                              <p className="text-sm text-stone-500">
                                Бронь на {formatDate(payment.reservation.date)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-stone-400 hover:text-rose-600"
                              onClick={() => handleDeletePayment(payment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        {/* Add Payment Dialog */}
        <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить оплату</DialogTitle>
              <DialogDescription>
                Зафиксируйте новый платёж по бронированию
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Бронирование</Label>
                <Select 
                  value={selectedReservationId}
                  onValueChange={setSelectedReservationId}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Выберите бронирование" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableForPayment.map(reservation => (
                      <SelectItem key={reservation.id} value={reservation.id}>
                        {reservation.guest?.last_name} {reservation.guest?.first_name} - {formatDate(reservation.date)} • {RESERVATION_STATUS_CONFIG[reservation.status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Сумма (₽)</Label>
                <Input 
                  type="number" 
                  placeholder="10000" 
                  className="mt-1" 
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <Label>Способ оплаты</Label>
                <Select 
                  value={paymentForm.payment_method}
                  onValueChange={(v: 'cash' | 'card' | 'transfer') => setPaymentForm({ ...paymentForm, payment_method: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4" />
                        Наличные
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Картой
                      </div>
                    </SelectItem>
                    <SelectItem value="transfer">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4" />
                        Перевод
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Комментарий</Label>
                <Textarea 
                  placeholder="Например: Первый взнос" 
                  className="mt-1" 
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddPaymentOpen(false)}>
                Отмена
              </Button>
              <Button 
                onClick={handleAddPayment}
                disabled={createPayment.loading || !selectedReservationId || !paymentForm.amount}
              >
                {createPayment.loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Добавить
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
