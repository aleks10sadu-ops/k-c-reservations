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
  CustomMenuItemType,
  MainMenuCategory,
  MainMenuItem,
  MainMenuItemVariant
} from '@/types'

// Generic hook for fetching data
function useSupabaseQuery<T>(
  tableName: string,
  selectQuery: string = '*',
  filters?: Record<string, any>,
  orderBy?: { column: string; ascending?: boolean },
  skip?: boolean  // Если true, запрос не выполняется и возвращается пустой массив
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(!skip)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    // Пропускаем запрос если skip=true
    if (skip) {
      setData([])
      setLoading(false)
      return
    }

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

      if (signal) {
        query = query.abortSignal(signal)
      }

      const { data: result, error: queryError } = await query

      if (queryError) {
        // Check if this is actually an AbortError reported as a PostgREST error
        if (queryError.message?.includes('AbortError') || queryError.details?.includes('AbortError')) {
          throw queryError // Throw to catch block which ignores it
        }

        // Detailed error logging for REAL errors
        console.error(`[useSupabaseQuery] PostgREST Error fetching ${tableName}:`,
          JSON.stringify(queryError, Object.getOwnPropertyNames(queryError), 2)
        )
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
      // Ignore abort errors
      const isAbort =
        (signal && signal.aborted) ||
        err.name === 'AbortError' ||
        err.message?.includes('AbortError') ||
        err.details?.includes('AbortError')

      if (isAbort) {
        // console.log(`[useSupabaseQuery] Request aborted for ${tableName}`)
        return
      }

      setError(err.message)
      console.error(`[useSupabaseQuery] Exception fetching ${tableName}:`, err)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [tableName, selectQuery, JSON.stringify(filters), JSON.stringify(orderBy), skip])

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)

    return () => {
      controller.abort()
    }
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

export function useTables(hallId?: string | null, loadAll?: boolean) {
  // Если hallId не задан или пустой, и не требуется загрузка всех - 
  // используем skip чтобы не делать запрос вообще
  const shouldSkip = !loadAll && (!hallId || hallId.length === 0)
  const filters = loadAll
    ? undefined
    : (hallId && hallId.length > 0 ? { hall_id: hallId } : undefined)

  return useSupabaseQuery<Table>(
    'tables',
    '*',
    filters,
    { column: 'number' },
    shouldSkip  // Пропускаем запрос если нет hallId
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

// ==================== MAIN MENU ====================

export function useMainMenuCategories() {
  return useSupabaseQuery<MainMenuCategory>(
    'main_menu_categories',
    '*',
    undefined,
    { column: 'order_index' }
  )
}

export function useMainMenuItems(categoryId?: string) {
  return useSupabaseQuery<MainMenuItem>(
    'main_menu_items',
    '*, variants:main_menu_item_variants(*)',
    categoryId ? { category_id: categoryId } : undefined,
    { column: 'order_index' }
  )
}

export function useMainMenuItemVariants(itemId?: string) {
  return useSupabaseQuery<MainMenuItemVariant>(
    'main_menu_item_variants',
    '*',
    itemId ? { item_id: itemId } : undefined,
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
            name,
            weight_per_person,
            price,
            type,
            order_index,
            menu_item:menu_items (*)
          ),
            main_menu_items:reservation_main_menu_items (
            *,
            main_menu_item:main_menu_items (
              *,
              category:main_menu_categories (name)
            ),
            variant:main_menu_item_variants (*)
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

      if (queryError) {
        console.error('[useReservations] Query Error:', queryError)
        throw queryError
      }

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
            name: rmi.name,
            weight_per_person: rmi.weight_per_person,
            price: rmi.price,
            type: rmi.type,
            order_index: rmi.order_index,
            menu_item: rmi.menu_item
          }))
          .filter(Boolean)

        // Calculate prepaid amount from payments array
        const prepaid_amount = Array.isArray(row.payments)
          ? row.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
          : Number(row.prepaid_amount) || 0

        const main_menu_items = (row.main_menu_items || []).map((item: any) => {
          const main_menu_item = item.main_menu_item ? {
            ...item.main_menu_item,
            category_name: item.main_menu_item.category?.name
          } : undefined;

          return {
            ...item,
            main_menu_item,
            variant: item.variant
          };
        })

        return { ...row, tables, table_ids, selected_menu_items, main_menu_items, prepaid_amount }
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

  // Subscribe to changes
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('reservations_all_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservation_tables' },
        () => fetchData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

export async function searchReservations(query: string) {
  const supabase = createClient()
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return []

  try {
    // 1. First, find guests that match the query
    const { data: guests, error: guestError } = await supabase
      .from('guests')
      .select('id')
      .or(`last_name.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,phone.ilike.%${trimmedQuery}%`)

    if (guestError) throw guestError
    const guestIds = guests?.map(g => g.id) || []

    // 2. Then search reservations matching comments OR the found guest IDs
    let queryBuilder = supabase
      .from('reservations')
      .select(`
        *,
        hall:halls (*),
        table:tables (*),
        guest:guests (*),
        payments (*),
        main_menu_items:reservation_main_menu_items (
          *,
          main_menu_item:main_menu_items (
            *,
            category:main_menu_categories (name)
          ),
          variant:main_menu_item_variants (*)
        )
      `)

    if (guestIds.length > 0) {
      queryBuilder = queryBuilder.or(`comments.ilike.%${trimmedQuery}%,guest_id.in.(${guestIds.join(',')})`)
    } else {
      queryBuilder = queryBuilder.ilike('comments', `%${trimmedQuery}%`)
    }

    const { data, error } = await queryBuilder
      .order('date', { ascending: false })
      .limit(50)

    if (error) throw error

    return (data || []).map((row: any) => {
      const prepaid_amount = Array.isArray(row.payments)
        ? row.payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0)
        : Number(row.prepaid_amount) || 0

      const main_menu_items = (row.main_menu_items || []).map((item: any) => {
        const main_menu_item = item.main_menu_item ? {
          ...item.main_menu_item,
          category_name: item.main_menu_item.category?.name
        } : undefined;

        return {
          ...item,
          main_menu_item,
          variant: item.variant
        };
      })

      return { ...row, main_menu_items, prepaid_amount }
    })
  } catch (err) {
    console.error('Error in searchReservations:', err)
    return []
  }
}

export function useReservationSearch() {
  const [data, setData] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const search = async (query: string) => {
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setHasSearched(true)
    try {
      const results = await searchReservations(query)
      setData(results as Reservation[])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => {
    setData([])
    setHasSearched(false)
  }

  return { data, loading, error, search, clear, hasSearched }
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
        const errorDetails = {
          code: mutationError.code,
          message: mutationError.message,
          details: mutationError.details,
          hint: mutationError.hint,
          data
        }
        console.error(`[useCreateMutation] Error creating ${tableName}:`, errorDetails)
        setError(mutationError.message || `Не удалось создать запись в ${tableName}`)
        throw mutationError
      }

      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useCreateMutation] Created ${tableName}:`, result)
      }

      return result
    } catch (err: any) {
      const errorMessage = err?.message || err?.error?.message || `Не удалось создать запись в ${tableName}`
      setError(errorMessage)
      console.error(`Error creating ${tableName}:`, {
        error: err,
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint
      })
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
        console.error(`[useUpdateMutation] Error updating ${tableName}:`, JSON.stringify(mutationError, null, 2))
        throw mutationError
      }

      // Логируем для menu_items
      if (tableName === 'menu_items') {
        console.log(`[useUpdateMutation] Updated ${tableName}:`, result)
      }

      return result
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || 'Unknown error'
      setError(msg)
      console.error(`Error updating ${tableName}:`, err, JSON.stringify(err, null, 2))
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
      const errorMessage = err?.message || err?.error?.message || `Не удалось удалить запись из ${tableName}`
      setError(errorMessage)
      console.error(`Error deleting ${tableName}:`, err)
      console.error('Error details:', JSON.stringify(err, null, 2))
      return false
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

