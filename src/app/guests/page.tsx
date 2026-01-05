"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Users, 
  Phone, 
  Mail,
  Calendar,
  MessageSquare,
  Star,
  Crown,
  Pencil,
  History,
  Loader2,
  Trash2
} from 'lucide-react'
import { PageTransition } from '@/components/layout/PageTransition'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useGuests, useReservations, useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useSupabase'
import { formatCurrency, formatPhone, formatDate, formatTime, cn } from '@/lib/utils'
import { Guest, GUEST_STATUS_CONFIG, GuestStatus, RESERVATION_STATUS_CONFIG } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

export default function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<GuestStatus | 'all'>('all')
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    email: '',
    status: 'regular' as GuestStatus,
    notes: ''
  })

  // Fetch data from Supabase
  const { data: guests, loading, error, refetch: refetchGuests } = useGuests()
  const { data: allReservations } = useReservations()
  
  // Mutations
  const createGuest = useCreateMutation<Guest>('guests')
  const updateGuest = useUpdateMutation<Guest>('guests')
  const deleteGuest = useDeleteMutation('guests')

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = searchQuery === '' ||
      guest.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.phone.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || guest.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getGuestReservations = (guestId: string) => {
    return allReservations.filter(r => r.guest_id === guestId)
  }

  const stats = {
    total: guests.length,
    regular: guests.filter(g => g.status === 'regular').length,
    frequent: guests.filter(g => g.status === 'frequent').length,
    vip: guests.filter(g => g.status === 'vip').length,
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      email: '',
      status: 'regular',
      notes: ''
    })
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsEditMode(false)
    setIsAddGuestOpen(true)
  }

  const handleOpenEdit = (guest: Guest) => {
    setFormData({
      first_name: guest.first_name,
      last_name: guest.last_name,
      middle_name: guest.middle_name || '',
      phone: guest.phone,
      email: guest.email || '',
      status: guest.status,
      notes: guest.notes || ''
    })
    setIsEditMode(true)
    setIsAddGuestOpen(true)
  }

  const handleSave = async () => {
    if (isEditMode && selectedGuest) {
      await updateGuest.mutate(selectedGuest.id, formData)
      setSelectedGuest(null)
    } else {
      await createGuest.mutate(formData)
    }
    setIsAddGuestOpen(false)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Вы уверены что хотите удалить этого гостя? Все связанные бронирования и платежи также будут удалены.')) {
      const success = await deleteGuest.mutate(id)
      if (success) {
        setSelectedGuest(null)
        // Явно обновляем список гостей после удаления
        await refetchGuests()
      } else {
        const errorMessage = deleteGuest.error || 'Неизвестная ошибка'
        alert(`Ошибка при удалении гостя: ${errorMessage}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
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
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Гости</h1>
              <p className="mt-1 text-stone-500">База данных гостей ресторана</p>
            </div>
            
            <Button 
              size="lg" 
              className="gap-2 shadow-lg shadow-amber-500/25"
              onClick={handleOpenAdd}
            >
              <Plus className="h-5 w-5" />
              Добавить гостя
            </Button>
          </motion.div>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                  <Users className="h-5 w-5 text-stone-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
                  <p className="text-sm text-stone-500">Всего</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {(Object.entries(GUEST_STATUS_CONFIG) as [GuestStatus, typeof GUEST_STATUS_CONFIG[GuestStatus]][]).map(([status, config]) => (
            <motion.div key={status} whileHover={{ scale: 1.02 }}>
              <Card 
                className={cn(
                  "cursor-pointer transition-all",
                  statusFilter === status && "ring-2 ring-amber-500"
                )}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div 
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: config.bgColor }}
                    >
                      {status === 'vip' ? (
                        <Crown className="h-5 w-5" style={{ color: config.color }} />
                      ) : status === 'frequent' ? (
                        <Star className="h-5 w-5" style={{ color: config.color }} />
                      ) : (
                        <Users className="h-5 w-5" style={{ color: config.color }} />
                      )}
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: config.color }}>
                        {status === 'regular' ? stats.regular : 
                         status === 'frequent' ? stats.frequent : stats.vip}
                      </p>
                      <p className="text-sm text-stone-500">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input 
              placeholder="Поиск по имени или телефону..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Guests List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-stone-100">
                {filteredGuests.map((guest, index) => {
                  const statusConfig = GUEST_STATUS_CONFIG[guest.status]
                  const reservations = getGuestReservations(guest.id)
                  
                  return (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => setSelectedGuest(guest)}
                      className="p-4 hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2" style={{ borderColor: statusConfig.color }}>
                            <AvatarFallback style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}>
                              {guest.first_name[0]}{guest.last_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-stone-900">
                                {guest.last_name} {guest.first_name} {guest.middle_name}
                              </h3>
                              <Badge 
                                variant={guest.status === 'vip' ? 'vip' : 
                                        guest.status === 'frequent' ? 'frequent' : 'secondary'}
                              >
                                {statusConfig.label}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-4 mt-1 text-sm text-stone-500">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" />
                                {formatPhone(guest.phone)}
                              </span>
                              {guest.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3.5 w-3.5" />
                                  {guest.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-sm text-stone-500">Визитов</p>
                              <p className="font-semibold text-stone-900">{guest.total_visits || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-stone-500">Потрачено</p>
                              <p className="font-semibold text-green-600">{formatCurrency(guest.total_spent || 0)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-stone-400 hover:text-rose-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDelete(guest.id)
                              }}
                              title="Удалить гостя"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      {guest.notes && (
                        <p className="mt-2 text-sm text-stone-500 italic pl-16">
                          {guest.notes}
                        </p>
                      )}
                    </motion.div>
                  )
                })}

                {filteredGuests.length === 0 && (
                  <div className="text-center py-12 text-stone-500">
                    <Users className="h-12 w-12 mx-auto mb-3 text-stone-300" />
                    <p>Гости не найдены</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Guest Detail Dialog */}
        <Dialog open={!!selectedGuest && !isAddGuestOpen} onOpenChange={() => setSelectedGuest(null)}>
          <DialogContent className="max-w-2xl">
            {selectedGuest && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2" style={{ borderColor: GUEST_STATUS_CONFIG[selectedGuest.status].color }}>
                      <AvatarFallback 
                        className="text-xl"
                        style={{ 
                          backgroundColor: GUEST_STATUS_CONFIG[selectedGuest.status].bgColor, 
                          color: GUEST_STATUS_CONFIG[selectedGuest.status].color 
                        }}
                      >
                        {selectedGuest.first_name[0]}{selectedGuest.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-xl">
                        {selectedGuest.last_name} {selectedGuest.first_name} {selectedGuest.middle_name}
                      </DialogTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={selectedGuest.status === 'vip' ? 'vip' : 
                                  selectedGuest.status === 'frequent' ? 'frequent' : 'secondary'}
                        >
                          {GUEST_STATUS_CONFIG[selectedGuest.status].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50">
                      <Phone className="h-5 w-5 text-stone-400" />
                      <div>
                        <p className="text-sm text-stone-500">Телефон</p>
                        <p className="font-medium">{formatPhone(selectedGuest.phone)}</p>
                      </div>
                    </div>
                    {selectedGuest.email && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50">
                        <Mail className="h-5 w-5 text-stone-400" />
                        <div>
                          <p className="text-sm text-stone-500">Email</p>
                          <p className="font-medium">{selectedGuest.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-sm text-amber-700">Всего визитов</p>
                      <p className="text-3xl font-bold text-amber-900">{selectedGuest.total_visits || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                      <p className="text-sm text-green-700">Потрачено всего</p>
                      <p className="text-3xl font-bold text-green-900">{formatCurrency(selectedGuest.total_spent || 0)}</p>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedGuest.notes && (
                    <div>
                      <h4 className="font-medium text-stone-900 mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Заметки
                      </h4>
                      <p className="text-stone-600 p-3 rounded-xl bg-stone-50">
                        {selectedGuest.notes}
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Reservation History */}
                  <div>
                    <h4 className="font-medium text-stone-900 mb-3 flex items-center gap-2">
                      <History className="h-4 w-4" />
                      История бронирований
                    </h4>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {getGuestReservations(selectedGuest.id).length === 0 ? (
                          <p className="text-center py-4 text-stone-500">Нет бронирований</p>
                        ) : (
                          getGuestReservations(selectedGuest.id).map((reservation) => {
                            const statusConfig = RESERVATION_STATUS_CONFIG[reservation.status]
                            return (
                              <div 
                                key={reservation.id}
                                className="flex items-center justify-between p-3 rounded-xl border border-stone-200"
                              >
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-2 h-10 rounded-full"
                                    style={{ backgroundColor: statusConfig.borderColor }}
                                  />
                                  <div>
                                    <p className="font-medium text-stone-900">
                                      {formatDate(reservation.date)} в {formatTime(reservation.time)}
                                    </p>
                                    <p className="text-sm text-stone-500">
                                      {reservation.hall?.name} • {reservation.guests_count} гостей
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
                                            reservation.status === 'prepaid' ? 'prepaid' : 'paid'}
                                  >
                                    {statusConfig.label}
                                  </Badge>
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDelete(selectedGuest.id)}
                    disabled={deleteGuest.loading}
                  >
                    {deleteGuest.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Удалить
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={() => handleOpenEdit(selectedGuest)}>
                    <Pencil className="h-4 w-4" />
                    Редактировать
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Add/Edit Guest Dialog */}
        <Dialog open={isAddGuestOpen} onOpenChange={setIsAddGuestOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Редактировать гостя' : 'Новый гость'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Измените информацию о госте' : 'Добавьте нового гостя в базу данных'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Фамилия *</Label>
                  <Input 
                    placeholder="Иванов" 
                    className="mt-1" 
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Имя *</Label>
                  <Input 
                    placeholder="Иван" 
                    className="mt-1" 
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Отчество</Label>
                <Input 
                  placeholder="Иванович" 
                  className="mt-1" 
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Телефон *</Label>
                <Input 
                  placeholder="+7 (900) 123-45-67" 
                  className="mt-1" 
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Email</Label>
                <Input 
                  type="email" 
                  placeholder="email@example.com" 
                  className="mt-1" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Статус</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v: GuestStatus) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GUEST_STATUS_CONFIG) as [GuestStatus, typeof GUEST_STATUS_CONFIG[GuestStatus]][]).map(([status, config]) => (
                      <SelectItem key={status} value={status}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Заметки</Label>
                <Textarea 
                  placeholder="Особые предпочтения, аллергии..." 
                  className="mt-1" 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddGuestOpen(false)}>
                Отмена
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createGuest.loading || updateGuest.loading || !formData.first_name || !formData.last_name || !formData.phone}
              >
                {(createGuest.loading || updateGuest.loading) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {isEditMode ? 'Сохранить' : 'Добавить'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  )
}
