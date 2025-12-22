"use server"

import { createClient } from './server'
import { 
  Hall, 
  Table, 
  Menu, 
  MenuItem, 
  Guest, 
  Reservation, 
  Payment,
  ReservationStatus,
  GuestStatus,
  MenuItemType
} from '@/types'

// ==================== HALLS ====================

export async function getHalls(): Promise<Hall[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('halls')
    .select(`
      *,
      tables (*)
    `)
    .order('name')

  if (error) {
    console.error('Error fetching halls:', error)
    return []
  }

  return data || []
}

export async function getHallById(id: string): Promise<Hall | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('halls')
    .select(`
      *,
      tables (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching hall:', error)
    return null
  }

  return data
}

export async function createHall(hall: Omit<Hall, 'id' | 'created_at' | 'updated_at' | 'tables'>): Promise<Hall | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('halls')
    .insert(hall)
    .select()
    .single()

  if (error) {
    console.error('Error creating hall:', error)
    return null
  }

  return data
}

export async function updateHall(id: string, updates: Partial<Hall>): Promise<Hall | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('halls')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating hall:', error)
    return null
  }

  return data
}

export async function deleteHall(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('halls')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting hall:', error)
    return false
  }

  return true
}

// ==================== TABLES ====================

export async function getTables(hallId?: string): Promise<Table[]> {
  const supabase = await createClient()
  let query = supabase.from('tables').select('*')
  
  if (hallId) {
    query = query.eq('hall_id', hallId)
  }

  const { data, error } = await query.order('number')

  if (error) {
    console.error('Error fetching tables:', error)
    return []
  }

  return data || []
}

// ==================== MENUS ====================

export async function getMenus(): Promise<Menu[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menus')
    .select(`
      *,
      items:menu_items (*)
    `)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching menus:', error)
    return []
  }

  return data || []
}

export async function getMenuById(id: string): Promise<Menu | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menus')
    .select(`
      *,
      items:menu_items (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching menu:', error)
    return null
  }

  return data
}

export async function createMenu(menu: { 
  name: string
  price_per_person: number
  total_weight_per_person?: number
  description?: string
  is_active?: boolean
}): Promise<Menu | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menus')
    .insert(menu)
    .select()
    .single()

  if (error) {
    console.error('Error creating menu:', error)
    return null
  }

  return data
}

export async function updateMenu(id: string, updates: Partial<Menu>): Promise<Menu | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menus')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating menu:', error)
    return null
  }

  return data
}

export async function deleteMenu(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menus')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting menu:', error)
    return false
  }

  return true
}

// ==================== MENU ITEMS ====================

export async function getMenuItems(menuId?: string): Promise<MenuItem[]> {
  const supabase = await createClient()
  let query = supabase.from('menu_items').select('*')
  
  if (menuId) {
    query = query.eq('menu_id', menuId)
  }

  const { data, error } = await query.order('order_index')

  if (error) {
    console.error('Error fetching menu items:', error)
    return []
  }

  return data || []
}

export async function createMenuItem(item: {
  menu_id: string
  name: string
  type: MenuItemType
  weight_per_person: number
  price?: number
  description?: string
  is_selectable?: boolean
  max_selections?: number
  order_index?: number
}): Promise<MenuItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .insert(item)
    .select()
    .single()

  if (error) {
    console.error('Error creating menu item:', error)
    return null
  }

  return data
}

export async function updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<MenuItem | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('menu_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating menu item:', error)
    return null
  }

  return data
}

export async function deleteMenuItem(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting menu item:', error)
    return false
  }

  return true
}

// ==================== GUESTS ====================

export async function getGuests(): Promise<Guest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .order('last_name')

  if (error) {
    console.error('Error fetching guests:', error)
    return []
  }

  return data || []
}

export async function getGuestById(id: string): Promise<Guest | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching guest:', error)
    return null
  }

  return data
}

export async function searchGuests(query: string): Promise<Guest[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
    .order('last_name')
    .limit(10)

  if (error) {
    console.error('Error searching guests:', error)
    return []
  }

  return data || []
}

export async function createGuest(guest: {
  first_name: string
  last_name: string
  middle_name?: string
  phone: string
  email?: string
  status?: GuestStatus
  notes?: string
}): Promise<Guest | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .insert(guest)
    .select()
    .single()

  if (error) {
    console.error('Error creating guest:', error)
    return null
  }

  return data
}

export async function updateGuest(id: string, updates: Partial<Guest>): Promise<Guest | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('guests')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating guest:', error)
    return null
  }

  return data
}

export async function deleteGuest(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting guest:', error)
    return false
  }

  return true
}

export async function findOrCreateGuestByPhone(
  phone: string,
  firstName: string,
  lastName?: string
): Promise<Guest | null> {
  const supabase = await createClient()
  
  // Сначала ищем гостя по телефону
  const { data: existingGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('phone', phone)
    .single()

  if (existingGuest) {
    return existingGuest
  }

  // Если не найден, создаем нового
  const { data: newGuest, error: createError } = await supabase
    .from('guests')
    .insert({
      first_name: firstName,
      last_name: lastName || 'Не указано',
      phone: phone,
      status: 'regular'
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating guest:', createError)
    return null
  }

  return newGuest
}

// ==================== RESERVATIONS ====================

export async function getReservations(filters?: {
  date?: string
  startDate?: string
  endDate?: string
  status?: ReservationStatus
  hallId?: string
  guestId?: string
}): Promise<Reservation[]> {
  const supabase = await createClient()
  let query = supabase
    .from('reservations')
    .select(`
      *,
      hall:halls (*),
      table:tables (*),
      guest:guests (*),
      menu:menus (*),
      payments (*)
    `)

  if (filters?.date) {
    query = query.eq('date', filters.date)
  }
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.hallId) {
    query = query.eq('hall_id', filters.hallId)
  }
  if (filters?.guestId) {
    query = query.eq('guest_id', filters.guestId)
  }

  const { data, error } = await query.order('date').order('time')

  if (error) {
    console.error('Error fetching reservations:', error)
    return []
  }

  return data || []
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservations')
    .select(`
      *,
      hall:halls (*),
      table:tables (*),
      guest:guests (*),
      menu:menus (*),
      payments (*)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching reservation:', error)
    return null
  }

  return data
}

export async function createReservation(reservation: {
  date: string
  time: string
  hall_id: string
  table_id?: string
  guest_id: string
  guests_count: number
  children_count?: number
  menu_id?: string
  status?: ReservationStatus
  total_amount: number
  comments?: string
}): Promise<Reservation | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reservations')
    .insert(reservation)
    .select(`
      *,
      hall:halls (*),
      table:tables (*),
      guest:guests (*),
      menu:menus (*),
      payments (*)
    `)
    .single()

  if (error) {
    console.error('Error creating reservation:', error)
    return null
  }

  return data
}

export async function updateReservation(id: string, updates: Partial<Reservation>): Promise<Reservation | null> {
  const supabase = await createClient()
  
  // Remove nested objects that shouldn't be updated directly
  const { hall, table, guest, menu, payments, selected_menu_items, ...updateData } = updates as any
  
  const { data, error } = await supabase
    .from('reservations')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      hall:halls (*),
      table:tables (*),
      guest:guests (*),
      menu:menus (*),
      payments (*)
    `)
    .single()

  if (error) {
    console.error('Error updating reservation:', error)
    return null
  }

  return data
}

export async function deleteReservation(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting reservation:', error)
    return false
  }

  return true
}

// ==================== PAYMENTS ====================

export async function getPayments(reservationId?: string): Promise<Payment[]> {
  const supabase = await createClient()
  let query = supabase.from('payments').select('*')
  
  if (reservationId) {
    query = query.eq('reservation_id', reservationId)
  }

  const { data, error } = await query.order('payment_date', { ascending: false })

  if (error) {
    console.error('Error fetching payments:', error)
    return []
  }

  return data || []
}

export async function createPayment(payment: {
  reservation_id: string
  amount: number
  payment_method: 'cash' | 'card' | 'transfer'
  notes?: string
}): Promise<Payment | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('payments')
    .insert({
      ...payment,
      payment_date: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating payment:', error)
    return null
  }

  return data
}

export async function deletePayment(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting payment:', error)
    return false
  }

  return true
}

