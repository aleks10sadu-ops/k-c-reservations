"use client"

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Hall, 
  Menu, 
  MenuItem, 
  Guest, 
  Reservation, 
  Payment,
  Table,
  LayoutItem,
  CustomMenuItemType
} from '@/types'

// Generic hook for fetching data
function useSupabaseQuery<T>(
  tableName: string,
  selectQuery: string = '*',
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending?: boolean }
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      let query = supabase.from(tableName).select(selectQuery)

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      if (orderBy) {
        query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
      }

      // Логируем для menu_item_types
      if (tableName === 'menu_item_types') {
        console.log(`[useSupabaseQuery] Fetching ${tableName} with filters:`, filters)
      }

      const { data: result, error: queryError } = await query

      if (queryError) {
        console.error(`[useSupabaseQuery] Error fetching ${tableName}:`, {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint,
          filters
        })
        throw queryError
      }
      
      // Логируем для menu_item_types
      if (tableName === 'menu_item_types') {
        console.log(`[useSupabaseQuery] Fetched ${tableName}:`, result?.length || 0, 'items', result)
        if (result?.length === 0 && filters?.menu_id) {
          console.warn(`[useSupabaseQuery] No types found for menu_id:`, filters.menu_id)
        }
      }
      
      // Явно приводим ответ к ожидаемому типу данных
      setData((result || []) as T[])
    } catch (err: any) {
      setError(err.message)
      console.error(`Error fetching ${tableName}:`, err)
    } finally {
      setLoading(false)
    }
  }, [tableName, selectQuery, JSON.stringify(filters), JSON.stringify(orderBy)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to realtime changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tableName, fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ==================== HALLS ====================

export function useHalls() {
  return useSupabaseQuery<Hall>(
    'halls',
    '*, tables (*)',
    undefined,
    { column: 'name' }
  )
}

export function useTables(hallId?: string) {
  return useSupabaseQuery<Table>(
    'tables',
    '*',
    hallId ? { hall_id: hallId } : undefined,
    { column: 'number' }
  )
}

// ==================== LAYOUT ITEMS ====================

export function useLayoutItems(hallId?: string) {
  return useSupabaseQuery<LayoutItem>(
    'layout_items',
    '*',
    hallId ? { hall_id: hallId } : undefined,
    { column: 'created_at' }
  )
}

// ==================== MENUS ====================

export function useMenus() {
  return useSupabaseQuery<Menu>(
    'menus',
    '*, items:menu_items (*)',
    { is_active: true },
    { column: 'name' }
  )
}

export function useMenuItems(menuId?: string) {
  return useSupabaseQuery<MenuItem>(
    'menu_items',
    '*',
    menuId ? { menu_id: menuId } : undefined,
    { column: 'order_index' }
  )
}

export function useMenuItemTypes(menuId?: string) {
  return useSupabaseQuery<CustomMenuItemType>(
    'menu_item_types',
    '*',
    menuId ? { menu_id: menuId } : undefined,
    { column: 'order_index' }
  )
}

// ==================== GUESTS ====================

export function useGuests() {
  return useSupabaseQuery<Guest>(
    'guests',
    '*',
    undefined,
    { column: 'last_name' }
  )
}

// ==================== RESERVATIONS ====================

export function useReservations(filters?: {
  date?: string
  startDate?: string
  endDate?: string
  status?: string
  hall_id?: string
  guest_id?: string
}) {
  const [data, setData] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()
      let query = supabase
        .from('reservations')
        .select(`
          *,
          hall:halls (*),
          table:tables (*),
          reservation_tables:reservation_tables (
            table_id,
            table:tables (*)
          ),
          guest:guests (*),
          menu:menus (*),
          payments (*),
          selected_menu_items:reservation_menu_items (
            id,
            menu_item_id,
            is_selected,
            menu_item:menu_items (*)
          )
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
      if (filters?.hall_id) {
        query = query.eq('hall_id', filters.hall_id)
      }
      if (filters?.guest_id) {
        query = query.eq('guest_id', filters.guest_id)
      }

      const { data: result, error: queryError } = await query
        .order('date')
        .order('time')

      if (queryError) throw queryError
      const normalized = (result || []).map((row: any) => {
        const tables = (row.reservation_tables || [])
          .map((rt: any) => rt.table)
          .filter(Boolean)
        const table_ids = (row.reservation_tables || [])
          .map((rt: any) => rt.table_id)
          .filter(Boolean)
        const selected_menu_items = (row.selected_menu_items || [])
          .map((rmi: any) => ({
            id: rmi.id,
            reservation_id: row.id,
            menu_item_id: rmi.menu_item_id,
            is_selected: rmi.is_selected,
            menu_item: rmi.menu_item
          }))
          .filter(Boolean)
        return { ...row, tables, table_ids, selected_menu_items }
      })
      setData(normalized as Reservation[])
    } catch (err: any) {
      setError(err.message)
      console.error('Error fetching reservations:', err)
    } finally {
      setLoading(false)
    }
  }, [JSON.stringify(filters)])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Subscribe to realtime changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('reservations_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          fetchData()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// ==================== PAYMENTS ====================

export function usePayments(reservationId?: string) {
  return useSupabaseQuery<Payment>(
    'payments',
    '*',
    reservationId ? { reservation_id: reservationId } : undefined,
    { column: 'payment_date', ascending: false }
  )
}

// ==================== MUTATIONS ====================

export function useCreateMutation<T>(tableName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (data: Partial<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useCreateMutation] Creating ${tableName}:`, data)
      }
      
      const { data: result, error: mutationError } = await supabase
        .from(tableName)
        .insert(data)
        .select()
        .single()

      if (mutationError) {
        console.error(`[useCreateMutation] Error creating ${tableName}:`, {
          code: mutationError.code,
          message: mutationError.message,
          details: mutationError.details,
          hint: mutationError.hint,
          data
        })
        throw mutationError
      }
      
      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useCreateMutation] Created ${tableName}:`, result)
      }
      
      return result
    } catch (err: any) {
      setError(err.message)
      console.error(`Error creating ${tableName}:`, err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

export function useUpdateMutation<T>(tableName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (id: string, data: Partial<T>): Promise<T | null> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useUpdateMutation] Updating ${tableName}:`, { id, data })
      }
      
      const { data: result, error: mutationError } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (mutationError) {
        console.error(`[useUpdateMutation] Error updating ${tableName}:`, {
          code: mutationError.code,
          message: mutationError.message,
          details: mutationError.details,
          hint: mutationError.hint,
          id,
          data
        })
        throw mutationError
      }
      
      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useUpdateMutation] Updated ${tableName}:`, result)
      }
      
      return result
    } catch (err: any) {
      setError(err.message)
      console.error(`Error updating ${tableName}:`, err)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

export function useDeleteMutation(tableName: string) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: mutationError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)

      if (mutationError) throw mutationError
      return true
    } catch (err: any) {
      setError(err.message)
      console.error(`Error deleting ${tableName}:`, err)
      return false
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

